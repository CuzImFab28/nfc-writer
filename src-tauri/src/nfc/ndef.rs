//! NDEF-Encoding für URL- und Text-Records (NFC Forum Well-Known).

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NdefKind {
    Url,
    Text,
}

impl NdefKind {
    pub fn parse(kind: &str) -> Self {
        match kind.trim().to_ascii_lowercase().as_str() {
            "url" | "uri" => Self::Url,
            _ => Self::Text,
        }
    }
}

/// URI-Identifier-Codes (NFC RTD-URI).
fn uri_prefix(url: &str) -> (u8, &str) {
    const PREFIXES: &[(u8, &str)] = &[
        (0x01, "http://www."),
        (0x02, "https://www."),
        (0x03, "http://"),
        (0x04, "https://"),
    ];
    for (code, prefix) in PREFIXES {
        if let Some(rest) = url.strip_prefix(prefix) {
            return (*code, rest);
        }
    }
    (0x00, url)
}

fn build_record(tnf_and_flags: u8, type_field: &[u8], payload: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(3 + type_field.len() + payload.len());
    out.push(tnf_and_flags);
    out.push(type_field.len() as u8);
    out.push(payload.len() as u8);
    out.extend_from_slice(type_field);
    out.extend_from_slice(payload);
    out
}

pub fn encode_ndef(kind: NdefKind, payload: &str) -> Result<Vec<u8>, String> {
    let payload = payload.trim();
    if payload.is_empty() {
        return Err("Payload ist leer.".into());
    }

    let record = match kind {
        NdefKind::Url => {
            let (code, rest) = uri_prefix(payload);
            let mut body = Vec::with_capacity(1 + rest.len());
            body.push(code);
            body.extend_from_slice(rest.as_bytes());
            // MB=1 ME=1 CF=0 SR=1 IL=0 TNF=0x01 (Well-Known)
            build_record(0xD1, b"U", &body)
        }
        NdefKind::Text => {
            // Status byte: UTF-8, language code length 2 ("en")
            let mut body = Vec::with_capacity(3 + payload.len());
            body.push(0x02);
            body.extend_from_slice(b"en");
            body.extend_from_slice(payload.as_bytes());
            build_record(0xD1, b"T", &body)
        }
    };

    Ok(record)
}

/// Type-2-Tag NDEF Message TLV (+ Terminator).
pub fn wrap_type2_tlv(ndef: &[u8]) -> Result<Vec<u8>, String> {
    if ndef.len() > 0xFFFE {
        return Err("NDEF-Nachricht ist zu groß für Type-2-Tags.".into());
    }

    let mut out = Vec::with_capacity(ndef.len() + 4);
    out.push(0x03); // NDEF Message TLV
    if ndef.len() < 0xFF {
        out.push(ndef.len() as u8);
    } else {
        out.push(0xFF);
        out.push((ndef.len() >> 8) as u8);
        out.push((ndef.len() & 0xFF) as u8);
    }
    out.extend_from_slice(ndef);
    out.push(0xFE); // Terminator TLV
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_https_url() {
        let ndef = encode_ndef(NdefKind::Url, "https://example.com").unwrap();
        assert_eq!(ndef[0], 0xD1);
        assert_eq!(&ndef[3..4], b"U");
        assert_eq!(ndef[4], 0x04); // https://
    }
}
