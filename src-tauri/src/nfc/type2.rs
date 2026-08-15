//! ACR122U / PC/SC Helpers für NFC Forum Type 2 Tags (NTAG21x).

use crate::nfc::types::{format_uid, TagInfo};
use pcsc::{Card, Disposition, Protocols, MAX_BUFFER_SIZE};
use std::ffi::CStr;

#[derive(Debug, thiserror::Error)]
pub enum Type2Error {
    #[error("PC/SC: {0}")]
    Pcsc(#[from] pcsc::Error),
    #[error("{0}")]
    Msg(String),
}

fn transmit(card: &Card, apdu: &[u8]) -> Result<Vec<u8>, Type2Error> {
    let mut buf = [0u8; MAX_BUFFER_SIZE];
    let response = card.transmit(apdu, &mut buf)?;
    if response.len() < 2 {
        return Err(Type2Error::Msg("Ungültige APDU-Antwort.".into()));
    }
    let sw1 = response[response.len() - 2];
    let sw2 = response[response.len() - 1];
    if sw1 != 0x90 || sw2 != 0x00 {
        return Err(Type2Error::Msg(format!(
            "APDU fehlgeschlagen (SW={sw1:02X}{sw2:02X})."
        )));
    }
    Ok(response[..response.len() - 2].to_vec())
}

pub fn get_uid(card: &Card) -> Result<Vec<u8>, Type2Error> {
    transmit(card, &[0xFF, 0xCA, 0x00, 0x00, 0x00])
}

/// Liest 16 Bytes ab `page` (4 Pages).
pub fn read_pages(card: &Card, page: u8) -> Result<[u8; 16], Type2Error> {
    let data = transmit(card, &[0xFF, 0xB0, 0x00, page, 0x10])?;
    if data.len() < 16 {
        return Err(Type2Error::Msg(format!(
            "Zu wenige Daten beim Lesen von Page {page}."
        )));
    }
    let mut out = [0u8; 16];
    out.copy_from_slice(&data[..16]);
    Ok(out)
}

/// Schreibt genau 4 Bytes auf eine Page (Ultralight/NTAG).
pub fn write_page(card: &Card, page: u8, data: &[u8; 4]) -> Result<(), Type2Error> {
    let mut apdu = [0u8; 9];
    apdu[0] = 0xFF;
    apdu[1] = 0xD6;
    apdu[2] = 0x00;
    apdu[3] = page;
    apdu[4] = 0x04;
    apdu[5..9].copy_from_slice(data);
    transmit(card, &apdu)?;
    Ok(())
}

fn chip_from_cc(cc: &[u8]) -> TagInfo {
    let size_units = *cc.get(2).unwrap_or(&0);
    let capacity = u32::from(size_units) * 8;
    let chip_type = match size_units {
        0x12 => "NTAG213",
        0x3E => "NTAG215",
        0x6D => "NTAG216",
        _ if capacity > 0 => "Type2",
        _ => "Unbekannt",
    };
    let writable = cc.get(3).map(|b| b & 0x0F == 0x00).unwrap_or(true);
    TagInfo {
        uid: String::new(),
        chip_type: chip_type.into(),
        writable,
        capacity_bytes: capacity,
    }
}

pub fn inspect_tag(card: &Card) -> Result<TagInfo, Type2Error> {
    let uid = get_uid(card)?;
    let pages = read_pages(card, 3).unwrap_or([0u8; 16]);
    let mut info = chip_from_cc(&pages[0..4]);
    info.uid = format_uid(&uid);
    if info.capacity_bytes == 0 {
        info.chip_type = "NTAG/Ultralight".into();
        info.capacity_bytes = 144;
        info.writable = true;
    }
    Ok(info)
}

pub fn write_type2_bytes(card: &Card, start_page: u8, bytes: &[u8]) -> Result<(), Type2Error> {
    let mut page = start_page;
    let mut offset = 0usize;
    while offset < bytes.len() {
        let mut block = [0u8; 4];
        let end = (offset + 4).min(bytes.len());
        block[..end - offset].copy_from_slice(&bytes[offset..end]);
        write_page(card, page, &block)?;
        page = page.saturating_add(1);
        offset += 4;
    }
    Ok(())
}

/// Schreibt NDEF-TLV ab User-Memory (Page 4). Legt bei Bedarf ein einfaches CC an.
pub fn write_ndef_tlv(card: &Card, tlv: &[u8], capacity_bytes: u32) -> Result<(), Type2Error> {
    if (tlv.len() as u32) > capacity_bytes.max(144) {
        return Err(Type2Error::Msg(
            "Payload zu groß für die Chip-Kapazität.".into(),
        ));
    }

    let cc_page = read_pages(card, 3)?;
    if cc_page[0] != 0xE1 {
        let size_units = ((capacity_bytes / 8).min(0xFF)) as u8;
        let cc = [0xE1, 0x10, size_units.max(0x12), 0x00];
        write_page(card, 3, &cc)?;
    }

    write_type2_bytes(card, 4, tlv)?;
    Ok(())
}

pub fn connect_to_reader(
    ctx: &pcsc::Context,
    reader_name: &CStr,
) -> Result<Card, Type2Error> {
    Ok(ctx.connect(reader_name, pcsc::ShareMode::Shared, Protocols::ANY)?)
}

pub fn disconnect(card: Card) {
    let _ = card.disconnect(Disposition::LeaveCard);
}
