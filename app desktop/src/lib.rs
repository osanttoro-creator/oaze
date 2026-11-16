mod biometrics;
mod notify;
mod share;
mod vault;

use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

/*
  O lado Rust do OAZE no desktop. Ele existe para três coisas que o webview não
  alcança: o cofre do sistema, a biometria do sistema e o aviso do sistema. Tudo
  o mais — interface, cálculo, sincronização — é o mesmo código das outras
  plataformas, e é assim que se mantém um produto só.

  Nenhum comando aqui recebe dado financeiro em texto claro: o que chega ao
  `vault` já está selado pelo WebCrypto do lado web.
*/

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        /* No Windows, o callback chega a um segundo processo. Ele repassa o
           deep link à janela que já está aberta antes de encerrar. */
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            vault::oaze_data_key,
            vault::oaze_read,
            vault::oaze_write,
            vault::oaze_delete,
            biometrics::oaze_biometrics_available,
            biometrics::oaze_biometrics_verify,
            notify::oaze_notify_request,
            notify::oaze_notify_granted,
            notify::oaze_notify_schedule,
            notify::oaze_notify_cancel_all,
            share::oaze_share,
            share::oaze_save_file,
            share::oaze_save_pdf,
            oaze_deep_link_ready,
        ])
        .setup(|app| {
            // Também registra o retorno OAuth quando o executável é aberto fora do instalador.
            #[cfg(windows)]
            app.deep_link().register_all()?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            /* `oaze://...` e `https://oaze.site/app/...` chegam aqui e são
               entregues ao webview como CustomEvent do DOM — o mesmo contrato
               que o Capacitor cumpre com `appUrlOpen`, de modo que o lado web
               tem um caminho só para as quatro plataformas.

               A URL vem do sistema operacional e pode ter sido forjada por quem
               registrar um link, então ela NUNCA é interpolada no script: entra
               serializada por `serde_json`, que é escape de string JavaScript
               válido. O lado web trata o conteúdo como dado, não como instrução. */
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    let payload = match serde_json::to_string(&url.to_string()) {
                        Ok(p) => p,
                        Err(_) => continue,
                    };
                    if let Some(window) = handle.get_webview_window("main") {
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                        let _ = window.eval(&format!(
                            "window.dispatchEvent(new CustomEvent('oaze:deep-link',{{detail:{payload}}}))"
                        ));
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

/// O lado web avisa que já está escutando e lê URLs que abriram o app frio.
/// Sem isto, o callback pode chegar antes do listener e desaparecer.
#[tauri::command]
fn oaze_deep_link_ready(app: tauri::AppHandle) -> Vec<String> {
    app.deep_link()
        .get_current()
        .ok()
        .flatten()
        .unwrap_or_default()
        .into_iter()
        .map(|url| url.to_string())
        .collect()
}
