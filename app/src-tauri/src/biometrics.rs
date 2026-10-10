//! Windows Hello e Touch ID.
//!
//! A biometria aqui **desbloqueia o PIN**, nunca o substitui: se o sistema
//! recusar ou não existir, a pessoa digita os seis dígitos e entra do mesmo
//! jeito. É por isso que `verify` devolve `bool` e não erro — "não confirmou" é
//! resposta normal, não falha.

/// Windows: `UserConsentVerifier` do WinRT.
#[cfg(target_os = "windows")]
mod imp {
    use windows::Security::Credentials::UI::{
        UserConsentVerificationResult, UserConsentVerifier, UserConsentVerifierAvailability,
    };
    use windows::core::HSTRING;

    pub fn available() -> bool {
        UserConsentVerifier::CheckAvailabilityAsync()
            .and_then(|op| op.join())
            .map(|a| a == UserConsentVerifierAvailability::Available)
            .unwrap_or(false)
    }

    pub fn verify(reason: &str) -> bool {
        let message = HSTRING::from(reason);
        UserConsentVerifier::RequestVerificationAsync(&message)
            .and_then(|op| op.join())
            .map(|r| r == UserConsentVerificationResult::Verified)
            .unwrap_or(false)
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

    pub fn verify(reason: &str) -> bool {
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
    pub fn verify(_reason: &str) -> bool {
        false
    }
}

#[tauri::command]
pub fn oaze_biometrics_available() -> bool {
    imp::available()
}

#[tauri::command]
pub fn oaze_biometrics_verify(reason: String) -> bool {
    let text = if reason.trim().is_empty() { "Confirme que é você para abrir o OAZE." } else { reason.trim() };
    imp::verify(text)
}
