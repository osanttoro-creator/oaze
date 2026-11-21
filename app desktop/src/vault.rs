//! Cofre do sistema e arquivo de dados — Windows e macOS.
//!
//! A divisão é a mesma do celular: a **chave** de 256 bits fica no cofre do
//! sistema operacional (Credential Manager no Windows, Keychain no macOS), e o
//! **corpo cifrado** num arquivo da pasta de dados do app. O cofre do sistema não
//! foi feito para guardar documentos de centenas de KB; o arquivo não é lugar
//! para chave. Cada metade fica onde funciona.
//!
//! A cifragem em si é feita no lado web, com WebCrypto (AES-GCM). Rust não vê
//! texto claro em nenhum momento: recebe e devolve o bloco já selado. Menos
//! superfície, e uma implementação de cripto em vez de duas.

use std::fs;
use std::path::PathBuf;

use base64::Engine as _;
use keyring::Entry;
use rand::RngCore;
use tauri::Manager;

const SERVICE: &str = "site.oaze.app";
const ACCOUNT: &str = "data-key-v1";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| format!("cofre do sistema indisponível: {e}"))
}

/// A chave de dados, criada no primeiro uso e nunca mais.
///
/// Quem decide isto é o Rust, e não o lado web, porque é o Rust que tem acesso ao
/// cofre — e porque criar a chave em dois lugares diferentes é como se perde
/// dado: duas chaves, um arquivo.
#[tauri::command]
pub fn oaze_data_key() -> Result<String, String> {
    let e = entry()?;
    match e.get_password() {
        Ok(existing) if !existing.is_empty() => Ok(existing),
        _ => {
            let mut raw = [0u8; 32];
            rand::rng().fill_bytes(&mut raw);
            let encoded = base64::engine::general_purpose::STANDARD.encode(raw);
            e.set_password(&encoded)
                .map_err(|err| format!("não foi possível guardar a chave no cofre: {err}"))?;
            Ok(encoded)
        }
    }
}

/// Nome de arquivo a partir da chave lógica.
///
/// A sanitização não é paranoia: `key` chega do lado web, e um `../` aqui
/// escreveria fora da pasta do app. Só letra, número, ponto, hífen e sublinhado
/// passam.
fn path_for(app: &tauri::AppHandle, key: &str) -> Result<PathBuf, String> {
    if key.is_empty() || key.len() > 120 {
        return Err("chave de armazenamento inválida".into());
    }
    let safe: String = key
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("pasta de dados indisponível: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("não foi possível criar a pasta de dados: {e}"))?;
    Ok(dir.join(format!("{safe}.oaze")))
}

#[tauri::command]
pub fn oaze_read(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let p = path_for(&app, &key)?;
    match fs::read_to_string(&p) {
        Ok(body) => Ok(Some(body)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("não foi possível ler os dados: {e}")),
    }
}

#[tauri::command]
pub fn oaze_write(app: tauri::AppHandle, key: String, body: String) -> Result<(), String> {
    let p = path_for(&app, &key)?;
    // grava num temporário e renomeia: queda de energia no meio da escrita deixa
    // o arquivo antigo intacto, em vez de um arquivo meio escrito
    let tmp = p.with_extension("oaze.tmp");
    fs::write(&tmp, body).map_err(|e| format!("não foi possível gravar os dados: {e}"))?;
    fs::rename(&tmp, &p).map_err(|e| format!("não foi possível concluir a gravação: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn oaze_delete(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let p = path_for(&app, &key)?;
    match fs::remove_file(&p) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("não foi possível apagar os dados: {e}")),
    }
}
