mod nfc;

use nfc::{spawn_watcher, NfcService, NfcStatus, WriteRequest};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
fn get_nfc_status(service: State<'_, Arc<NfcService>>) -> Result<NfcStatus, String> {
    service.snapshot()
}

#[tauri::command]
fn simulate_tag_present(service: State<'_, Arc<NfcService>>) -> Result<NfcStatus, String> {
    service.simulate_tag()
}

#[tauri::command]
fn clear_tag(service: State<'_, Arc<NfcService>>) -> Result<NfcStatus, String> {
    service.clear_tag()
}

#[tauri::command]
fn write_ndef(
    service: State<'_, Arc<NfcService>>,
    request: WriteRequest,
) -> Result<NfcStatus, String> {
    service.write_ndef(request)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let service = NfcService::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(service.clone())
        .setup(move |app| {
            spawn_watcher(app.handle().clone(), service);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_nfc_status,
            simulate_tag_present,
            clear_tag,
            write_ndef
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
