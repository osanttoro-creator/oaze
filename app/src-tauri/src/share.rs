//! Compartilhar no desktop.
//!
//! Windows e macOS não têm uma folha de compartilhamento que um app possa abrir
//! do jeito que o celular tem. O que existe e resolve o caso real — mandar um
//! relatório para alguém — é a área de transferência: o texto vai para lá e a
//! interface diz "copiado". Prometer uma folha que não aparece é pior do que
//! entregar a cópia.

use serde::Deserialize;
use tauri_plugin_clipboard_manager::ClipboardExt;

#[derive(Deserialize)]
pub struct Payload {
    pub title: Option<String>,
    pub text: Option<String>,
    pub url: Option<String>,
}

/// "Salvar como" do sistema — é assim que o backup sai no Windows e no macOS.
///
/// O diálogo é do sistema de propósito: a pessoa escolhe a pasta, e o app não
/// precisa de permissão ampla de sistema de arquivos para escrever onde quiser.
/// É também por isso que `capabilities/default.json` não libera `fs:`.
#[tauri::command]
pub async fn oaze_save_file(app: tauri::AppHandle, name: String, content: String) -> Result<bool, String> {
    use tauri_plugin_dialog::DialogExt;

    // o nome vem do lado web; só o nome base interessa, nunca um caminho
    let sugerido = std::path::Path::new(&name)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("oaze-backup.json")
        .to_string();

    let destino = app
        .dialog()
        .file()
        .set_file_name(&sugerido)
        .add_filter("JSON", &["json"])
        .blocking_save_file();

    let Some(destino) = destino else {
        // cancelar não é erro
        return Ok(false);
    };
    let caminho = destino
        .into_path()
        .map_err(|e| format!("caminho inválido: {e}"))?;
    std::fs::write(&caminho, content).map_err(|e| format!("não foi possível salvar: {e}"))?;
    Ok(true)
}

#[tauri::command]
pub fn oaze_share(app: tauri::AppHandle, payload: Payload) -> Result<bool, String> {
    let mut parts: Vec<String> = Vec::new();
    if let Some(t) = payload.title.filter(|s| !s.trim().is_empty()) {
        parts.push(t);
    }
    if let Some(t) = payload.text.filter(|s| !s.trim().is_empty()) {
        parts.push(t);
    }
    if let Some(u) = payload.url.filter(|s| !s.trim().is_empty()) {
        parts.push(u);
    }
    if parts.is_empty() {
        return Ok(false);
    }
    app.clipboard()
        .write_text(parts.join("\n"))
        .map_err(|e| format!("não foi possível copiar: {e}"))?;
    Ok(true)
}
