//! Notificações do sistema no desktop.
//!
//! O plugin de notificação do Tauri mostra agora; não agenda. Então o agendamento
//! vive aqui: a lista fica em memória com um fio por item, e é **reescrita
//! inteira** a cada chamada de `schedule`. Reescrever tudo em vez de somar evita
//! o defeito clássico de lembrete — a pessoa muda o horário e passa a receber nos
//! dois.
//!
//! Limite declarado: avisos agendados para depois de o app fechar não acontecem.
//! Isso é verdade no desktop sem serviço em segundo plano, e a tela Lembretes diz
//! isso — anunciar agendamento que não ocorre é pior do que não ter.

use std::sync::Mutex;
use std::time::Duration;

use serde::Deserialize;
use tauri::async_runtime;
use tauri_plugin_notification::NotificationExt;

#[derive(Deserialize, Clone)]
pub struct Item {
    pub id: i64,
    pub title: String,
    pub body: String,
    /// ISO 8601 em UTC.
    pub at: String,
}

struct Scheduled {
    handles: Vec<async_runtime::JoinHandle<()>>,
}

static STATE: Mutex<Option<Scheduled>> = Mutex::new(None);

fn cancel_all_locked(state: &mut Option<Scheduled>) {
    if let Some(s) = state.take() {
        for h in s.handles {
            h.abort();
        }
    }
}

#[tauri::command]
pub fn oaze_notify_request(app: tauri::AppHandle) -> bool {
    app.notification()
        .request_permission()
        .map(|p| matches!(p, tauri_plugin_notification::PermissionState::Granted))
        .unwrap_or(false)
}

#[tauri::command]
pub fn oaze_notify_granted(app: tauri::AppHandle) -> bool {
    app.notification().permission_state().map(|p| matches!(p, tauri_plugin_notification::PermissionState::Granted)).unwrap_or(false)
}

#[tauri::command]
pub fn oaze_notify_schedule(app: tauri::AppHandle, items: Vec<Item>) -> Result<(), String> {
    let mut guard = STATE.lock().map_err(|_| "agenda de avisos travada".to_string())?;
    cancel_all_locked(&mut guard);

    let now = std::time::SystemTime::now();
    let mut handles = Vec::new();

    for item in items {
        let when = chrono::DateTime::parse_from_rfc3339(&item.at)
            .map_err(|e| format!("data de aviso inválida: {e}"))?;
        let target: std::time::SystemTime = when.into();
        let delay = match target.duration_since(now) {
            Ok(d) => d,
            // já passou: não mostrar nada é o certo, avisar atrasado confunde
            Err(_) => continue,
        };
        // teto de 30 dias, igual ao horizonte que o cliente monta
        if delay > Duration::from_secs(60 * 60 * 24 * 30) {
            continue;
        }
        let handle = app.clone();
        handles.push(async_runtime::spawn(async move {
            tokio::time::sleep(delay).await;
            let _ = handle
                .notification()
                .builder()
                .title(item.title)
                .body(item.body)
                .show();
        }));
    }

    *guard = Some(Scheduled { handles });
    Ok(())
}

#[tauri::command]
pub fn oaze_notify_cancel_all() -> Result<(), String> {
    let mut guard = STATE.lock().map_err(|_| "agenda de avisos travada".to_string())?;
    cancel_all_locked(&mut guard);
    Ok(())
}
