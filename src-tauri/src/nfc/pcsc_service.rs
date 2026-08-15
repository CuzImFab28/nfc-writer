//! PC/SC-Hintergrunddienst für ACR122U (und kompatible Reader).

use crate::nfc::ndef::{encode_ndef, wrap_type2_tlv, NdefKind};
use crate::nfc::type2::{connect_to_reader, disconnect, inspect_tag, write_ndef_tlv};
use crate::nfc::types::{NfcStatus, SessionPhase, TagInfo, WriteRequest};
use pcsc::{Context, Scope};
use std::ffi::CString;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct NfcService {
    pub status: Mutex<NfcStatus>,
    preferred_reader: Mutex<Option<CString>>,
}

impl NfcService {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            status: Mutex::new(NfcStatus::default()),
            preferred_reader: Mutex::new(None),
        })
    }

    pub fn snapshot(&self) -> Result<NfcStatus, String> {
        self.status
            .lock()
            .map(|s| s.clone())
            .map_err(|_| "NFC-Status konnte nicht gelesen werden.".into())
    }

    fn set_status<F>(&self, app: Option<&AppHandle>, update: F) -> Result<NfcStatus, String>
    where
        F: FnOnce(&mut NfcStatus),
    {
        let mut guard = self
            .status
            .lock()
            .map_err(|_| "NFC-Status konnte nicht gesperrt werden.".to_string())?;
        update(&mut guard);
        let next = guard.clone();
        drop(guard);
        if let Some(app) = app {
            let _ = app.emit("nfc-status", next.clone());
        }
        Ok(next)
    }

    pub fn simulate_tag(&self) -> Result<NfcStatus, String> {
        self.set_status(None, |status| {
            status.mock_mode = true;
            status.phase = SessionPhase::TagPresent;
            status.tag = Some(TagInfo {
                uid: "04:A1:B2:C3:D4:E5:F6".into(),
                chip_type: "NTAG215".into(),
                writable: true,
                capacity_bytes: 504,
            });
            status.message = "Chip erkannt (Mock). Bereit zum Schreiben.".into();
        })
    }

    pub fn clear_tag(&self) -> Result<NfcStatus, String> {
        self.set_status(None, |status| {
            status.phase = if status.reader_connected && !status.mock_mode {
                SessionPhase::WaitingForTag
            } else {
                SessionPhase::Idle
            };
            status.tag = None;
            status.last_payload = None;
            status.message = if status.reader_connected {
                "Kein Chip. Lege einen Tag auf den ACR122U.".into()
            } else {
                "Kein Chip. Lege einen Tag auf den Reader.".into()
            };
        })
    }

    pub fn write_ndef(&self, request: WriteRequest) -> Result<NfcStatus, String> {
        let snapshot = self.snapshot()?;
        let payload = request.payload.trim().to_string();
        if payload.is_empty() {
            return self.set_status(None, |status| {
                status.phase = SessionPhase::Error;
                status.message = "Payload ist leer.".into();
            });
        }

        let kind = NdefKind::parse(&request.kind);
        let ndef = encode_ndef(kind, &payload)?;
        let tlv = wrap_type2_tlv(&ndef)?;
        let kind_label = if request.kind.is_empty() {
            "text"
        } else {
            request.kind.as_str()
        };

        let live = snapshot.reader_connected && !snapshot.mock_mode && snapshot.tag.is_some();
        if !live {
            if snapshot.tag.is_none() {
                return self.set_status(None, |status| {
                    status.phase = SessionPhase::Error;
                    status.message =
                        "Kein Chip vorhanden. Zuerst Tag auflegen (oder simulieren).".into();
                });
            }
            return self.set_status(None, |status| {
                status.phase = SessionPhase::Success;
                status.last_payload = Some(payload);
                status.message = format!("NDEF ({kind_label}) geschrieben (Mock).");
            });
        }

        let _ = self.set_status(None, |status| {
            status.phase = SessionPhase::Writing;
            status.message = "Schreibe NDEF auf den Chip…".into();
        });

        let reader_name = self
            .preferred_reader
            .lock()
            .ok()
            .and_then(|g| g.clone())
            .ok_or_else(|| "Kein Reader ausgewählt.".to_string())?;

        let capacity = snapshot
            .tag
            .as_ref()
            .map(|t| t.capacity_bytes)
            .unwrap_or(144);

        let write_result = (|| -> Result<(), String> {
            let ctx = Context::establish(Scope::User).map_err(|e| e.to_string())?;
            let card = connect_to_reader(&ctx, reader_name.as_c_str()).map_err(|e| e.to_string())?;
            let result = write_ndef_tlv(&card, &tlv, capacity).map_err(|e| e.to_string());
            disconnect(card);
            result
        })();

        match write_result {
            Ok(()) => self.set_status(None, |status| {
                status.phase = SessionPhase::Success;
                status.last_payload = Some(payload);
                status.message = format!("NDEF ({kind_label}) auf Chip geschrieben.");
            }),
            Err(err) => self.set_status(None, |status| {
                status.phase = SessionPhase::Error;
                status.message = format!("Schreiben fehlgeschlagen: {err}");
            }),
        }
    }
}

fn reader_priority(name: &str) -> i32 {
    let lower = name.to_ascii_lowercase();
    if lower.contains("acr122") {
        100
    } else if lower.contains("acs") {
        80
    } else if lower.contains("nfc") || lower.contains("contactless") {
        60
    } else {
        10
    }
}

fn pick_reader(ctx: &Context) -> Result<Option<CString>, String> {
    let readers = ctx.list_readers_owned().map_err(|e| e.to_string())?;
    let mut best: Option<(i32, CString)> = None;
    for name in readers {
        let score = reader_priority(&name.to_string_lossy());
        match &best {
            None => best = Some((score, name)),
            Some((best_score, _)) if score > *best_score => best = Some((score, name)),
            _ => {}
        }
    }
    Ok(best.map(|(_, name)| name))
}

fn try_read_tag(ctx: &Context, reader: &CString) -> Result<TagInfo, String> {
    let card = connect_to_reader(ctx, reader.as_c_str()).map_err(|e| e.to_string())?;
    let info = inspect_tag(&card).map_err(|e| e.to_string());
    disconnect(card);
    info
}

pub fn spawn_watcher(app: AppHandle, service: Arc<NfcService>) {
    thread::spawn(move || {
        let mut last_uid: Option<String> = None;
        let mut announced_reader: Option<String> = None;

        loop {
            let ctx = match Context::establish(Scope::User) {
                Ok(ctx) => ctx,
                Err(err) => {
                    let _ = service.set_status(Some(&app), |status| {
                        status.reader_connected = false;
                        status.mock_mode = true;
                        if status.phase != SessionPhase::TagPresent
                            && status.phase != SessionPhase::Success
                            && status.phase != SessionPhase::Writing
                        {
                            status.phase = SessionPhase::Idle;
                            status.tag = None;
                        }
                        status.message =
                            format!("PC/SC nicht verfügbar ({err}). Mock-Modus aktiv.");
                    });
                    last_uid = None;
                    announced_reader = None;
                    thread::sleep(Duration::from_secs(2));
                    continue;
                }
            };

            let reader = match pick_reader(&ctx) {
                Ok(Some(name)) => name,
                Ok(None) => {
                    let _ = service.set_status(Some(&app), |status| {
                        status.reader_connected = false;
                        if !status.mock_mode || status.tag.is_none() {
                            status.mock_mode = true;
                        }
                        if status.phase != SessionPhase::TagPresent
                            && status.phase != SessionPhase::Success
                            && status.phase != SessionPhase::Writing
                        {
                            status.phase = SessionPhase::Idle;
                            status.tag = None;
                            status.message =
                                "Kein PC/SC-Reader gefunden. ACR122U anschließen oder Chip simulieren."
                                    .into();
                        }
                    });
                    if let Ok(mut slot) = service.preferred_reader.lock() {
                        *slot = None;
                    }
                    last_uid = None;
                    announced_reader = None;
                    thread::sleep(Duration::from_secs(1));
                    continue;
                }
                Err(err) => {
                    let _ = service.set_status(Some(&app), |status| {
                        status.reader_connected = false;
                        status.message = format!("Reader-Liste fehlgeschlagen: {err}");
                    });
                    thread::sleep(Duration::from_secs(1));
                    continue;
                }
            };

            if let Ok(mut slot) = service.preferred_reader.lock() {
                *slot = Some(reader.clone());
            }

            let label = reader.to_string_lossy().into_owned();
            if announced_reader.as_ref() != Some(&label) {
                announced_reader = Some(label.clone());
                let _ = service.set_status(Some(&app), |status| {
                    status.reader_connected = true;
                    // Nur Mock verlassen, wenn kein manuell simulierter Tag aktiv ist
                    if status.phase != SessionPhase::TagPresent || status.tag.is_none() {
                        status.mock_mode = false;
                        status.phase = SessionPhase::WaitingForTag;
                    }
                    status.message = format!("Reader verbunden: {label}. Warte auf Chip…");
                });
            }

            match try_read_tag(&ctx, &reader) {
                Ok(tag) => {
                    let uid = tag.uid.clone();
                    if last_uid.as_ref() != Some(&uid) {
                        last_uid = Some(uid);
                        let _ = service.set_status(Some(&app), |status| {
                            if status.phase == SessionPhase::Writing {
                                return;
                            }
                            status.reader_connected = true;
                            status.mock_mode = false;
                            status.phase = SessionPhase::TagPresent;
                            status.tag = Some(tag);
                            status.message = "Chip erkannt. Bereit zum Schreiben.".into();
                        });
                    }
                }
                Err(_) => {
                    if last_uid.take().is_some() {
                        let _ = service.set_status(Some(&app), |status| {
                            if status.phase == SessionPhase::Writing {
                                return;
                            }
                            // Simulierten Mock-Tag nicht löschen
                            if status.mock_mode {
                                return;
                            }
                            status.tag = None;
                            status.phase = SessionPhase::WaitingForTag;
                            status.message = "Chip entfernt. Lege den nächsten Tag auf.".into();
                        });
                    }
                }
            }

            thread::sleep(Duration::from_millis(350));
        }
    });
}
