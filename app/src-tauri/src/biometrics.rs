//! Windows Hello e Touch ID.
//!
//! A biometria aqui **desbloqueia o PIN**, nunca o substitui: se o sistema
//! recusar ou não existir, a pessoa digita os seis dígitos e entra do mesmo
//! jeito. É por isso que `verify` devolve `bool` e não erro — "não confirmou" é
//! resposta normal, não falha.

/// Windows: `UserConsentVerifier` do WinRT.
///
/// O pedido vai PRESO À JANELA do OAZE (`RequestVerificationForWindowAsync`).
/// Sem a janela, num app Win32 o Windows Hello pode abrir atrás dela ou sem
/// foco, e a pessoa vê só o app parado esperando — o "travou" relatado em
/// 01/11/2026. `hwnd` = 0 cai na chamada antiga.
#[cfg(target_os = "windows")]
mod imp {
    use windows::Foundation::IAsyncOperation;
    use windows::Security::Credentials::UI::{
        UserConsentVerificationResult, UserConsentVerifier, UserConsentVerifierAvailability,
    };
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::WinRT::IUserConsentVerifierInterop;
    use windows::core::{HSTRING, factory};

    pub fn available() -> bool {
        UserConsentVerifier::CheckAvailabilityAsync()
            .and_then(|op| op.join())
            .map(|a| a == UserConsentVerifierAvailability::Available)
            .unwrap_or(false)
    }

    pub fn verify(hwnd: isize, reason: &str) -> bool {
        let message = HSTRING::from(reason);
        let result = if hwnd != 0 {
            factory::<UserConsentVerifier, IUserConsentVerifierInterop>().and_then(|interop| {
                let op: IAsyncOperation<UserConsentVerificationResult> = unsafe {
                    interop.RequestVerificationForWindowAsync(HWND(hwnd as *mut core::ffi::c_void), &message)?
                };
                op.join()
            })
        } else {
            UserConsentVerifier::RequestVerificationAsync(&message).and_then(|op| op.join())
        };
        result.map(|r| r == UserConsentVerificationResult::Verified).unwrap_or(false)
    }
}

/// macOS: `LocalAuthentication`, que cobre Touch ID e a senha do Mac.
#[cfg(target_os = "macos")]
mod imp {
    use std::sync::mpsc;
    use std::time::Duration;

    use block2::RcBlock;
    use objc2::rc::Retained;
    use objc2::runtime::Bool;
    use objc2_foundation::{NSError, NSString};
    use objc2_local_authentication::{LAContext, LAPolicy};

    fn context() -> Retained<LAContext> {
        unsafe { LAContext::new() }
    }

    pub fn available() -> bool {
        unsafe {
            context()
                .canEvaluatePolicy_error(LAPolicy::DeviceOwnerAuthenticationWithBiometrics)
                .is_ok()
        }
    }

    pub fn verify(_hwnd: isize, reason: &str) -> bool {
        let (tx, rx) = mpsc::channel::<bool>();
        let message = NSString::from_str(reason);
        let handler = RcBlock::new(move |ok: Bool, _err: *mut NSError| {
            let _ = tx.send(ok.as_bool());
        });
        let auth_context = context();
        unsafe {
            auth_context.evaluatePolicy_localizedReason_reply(
                LAPolicy::DeviceOwnerAuthenticationWithBiometrics,
                &message,
                &handler,
            );
        }
        // o diálogo do sistema é modal para o usuário, não para este processo:
        // sem o teto de espera, um diálogo deixado aberto travaria o comando
        rx.recv_timeout(Duration::from_secs(60)).unwrap_or(false)
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod imp {
    pub fn available() -> bool {
        false
    }
    pub fn verify(_hwnd: isize, _reason: &str) -> bool {
        false
    }
}

/* Os dois comandos são `async` e o trabalho vai para uma thread de bloqueio.
   Um comando síncrono do Tauri roda na thread principal: esperar o Windows
   Hello ali congelava a janela inteira (nem repintava) até a resposta. */

#[tauri::command]
pub async fn oaze_biometrics_available() -> bool {
    tauri::async_runtime::spawn_blocking(imp::available).await.unwrap_or(false)
}

#[tauri::command]
pub async fn oaze_biometrics_verify(window: tauri::WebviewWindow, reason: String) -> bool {
    let text = if reason.trim().is_empty() { "Confirme que é você para abrir o OAZE.".to_string() } else { reason.trim().to_string() };
    let _ = window.unminimize();
    let _ = window.set_focus();
    #[cfg(target_os = "windows")]
    let hwnd: isize = window.hwnd().map(|h| h.0 as isize).unwrap_or(0);
    #[cfg(not(target_os = "windows"))]
    let hwnd: isize = 0;
    tauri::async_runtime::spawn_blocking(move || imp::verify(hwnd, &text)).await.unwrap_or(false)
}
