# Tagpress — NFC Writer (Desktop)

Desktop-App zum Beschreiben von NFC-Chips mit **Tauri + React + React Three Fiber**.

## Stack

- **UI:** React 19, Vite, React Three Fiber
- **Desktop-Shell:** Tauri 2 (Rust)
- **NFC:** PC/SC (ACR122U und kompatible Reader), Mock-Fallback

## Lokal am Desktop

Voraussetzungen: [Tauri Prerequisites](https://tauri.app/start/prerequisites/) (Node, Rust, OS-WebView).

Windows + ACR122U: Hersteller-Treiber / PC/SC (WinSCard) installieren, Reader anschließen.

```bash
npm install
npm run tauri:dev
```

Nur UI im Browser (Mock):

```bash
npm run dev
```

## Nutzung mit ACR122U

1. Reader anstecken, App starten (`tauri:dev` / gebaute `.exe`)
2. Status sollte auf **PC/SC** wechseln („Reader verbunden…“)
3. NTAG213/215/216 auflegen → UID/Typ erscheinen automatisch
4. URL oder Text eingeben → **Auf Chip schreiben**
5. Mit dem Handy prüfen (NFC-Tag lesen)

Ohne Reader bleibt der **Mock**-Modus („Chip simulieren“) nutzbar.

## Architektur (kurz)

- Rust pollt PC/SC, erkennt Tags, schreibt Type-2-NDEF (URI/Text)
- Frontend lauscht auf Event `nfc-status`
- Commands: `get_nfc_status`, `simulate_tag_present`, `clear_tag`, `write_ndef`
