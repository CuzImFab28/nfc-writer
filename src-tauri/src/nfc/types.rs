use serde::{Deserialize, Serialize};

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

impl Default for NfcStatus {
    fn default() -> Self {
        Self {
            phase: SessionPhase::Idle,
            reader_connected: false,
            mock_mode: true,
            tag: None,
            last_payload: None,
            message: "Suche PC/SC-Reader…".into(),
        }
    }
}

pub fn format_uid(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|b| format!("{b:02X}"))
        .collect::<Vec<_>>()
        .join(":")
}
