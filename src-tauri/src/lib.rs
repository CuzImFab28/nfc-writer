use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SessionPhase {
    Idle,
    WaitingForTag,
    TagPresent,
    Writing,
    Success,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagInfo {
    pub uid: String,
    pub chip_type: String,
    pub writable: bool,
    pub capacity_bytes: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NfcStatus {
    pub phase: SessionPhase,
    pub reader_connected: bool,
    pub mock_mode: bool,
    pub tag: Option<TagInfo>,
    pub last_payload: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteRequest {
    pub payload: String,
    pub kind: String,
}

struct NfcState {
    status: Mutex<NfcStatus>,
}

impl Default for NfcStatus {
    fn default() -> Self {
        Self {
            phase: SessionPhase::Idle,
            reader_connected: true,
            mock_mode: true,
            tag: None,
            last_payload: None,
            message: "Mock-Reader bereit. Chip simulieren oder echten Reader anbinden."
                .into(),
        }
    }
}

#[tauri::command]
fn get_nfc_status(state: State<'_, NfcState>) -> Result<NfcStatus, String> {
    state
        .status
        .lock()
        .map(|s| s.clone())
        .map_err(|_| "NFC-Status konnte nicht gelesen werden.".into())
}

#[tauri::command]
fn simulate_tag_present(state: State<'_, NfcState>) -> Result<NfcStatus, String> {
    let mut status = state
        .status
        .lock()
        .map_err(|_| "NFC-Status konnte nicht gesperrt werden.".to_string())?;

    status.phase = SessionPhase::TagPresent;
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    status.tag = Some(TagInfo {
        uid: format!(
            "04:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
            (nanos >> 40) as u8,
            (nanos >> 32) as u8,
            (nanos >> 24) as u8,
            (nanos >> 16) as u8,
            (nanos >> 8) as u8,
            nanos as u8
        ),
        chip_type: "NTAG215".into(),
        writable: true,
        capacity_bytes: 504,
    });
    status.message = "Chip erkannt (Mock). Bereit zum Schreiben.".into();
    Ok(status.clone())
}

#[tauri::command]
fn clear_tag(state: State<'_, NfcState>) -> Result<NfcStatus, String> {
    let mut status = state
        .status
        .lock()
        .map_err(|_| "NFC-Status konnte nicht gesperrt werden.".to_string())?;

    status.phase = SessionPhase::Idle;
    status.tag = None;
    status.last_payload = None;
    status.message = "Kein Chip. Lege einen Tag auf den Reader.".into();
    Ok(status.clone())
}

#[tauri::command]
fn write_ndef(state: State<'_, NfcState>, request: WriteRequest) -> Result<NfcStatus, String> {
    let mut status = state
        .status
        .lock()
        .map_err(|_| "NFC-Status konnte nicht gesperrt werden.".to_string())?;

    if status.tag.is_none() {
        status.phase = SessionPhase::Error;
        status.message = "Kein Chip vorhanden. Zuerst Tag auflegen (oder simulieren).".into();
        return Ok(status.clone());
    }

    let payload = request.payload.trim().to_string();
    if payload.is_empty() {
        status.phase = SessionPhase::Error;
        status.message = "Payload ist leer.".into();
        return Ok(status.clone());
    }

    // Echte PC/SC-Anbindung kommt später. Mock schreibt sofort „erfolgreich“.
    status.phase = SessionPhase::Success;
    status.last_payload = Some(payload);
    status.message = format!(
        "NDEF ({}) geschrieben (Mock).",
        if request.kind.is_empty() {
            "text"
        } else {
            &request.kind
        }
    );
    Ok(status.clone())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(NfcState {
            status: Mutex::new(NfcStatus::default()),
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
