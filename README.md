# Tagpress — NFC Writer (Desktop)

Desktop-App zum Beschreiben von NFC-Chips mit **Tauri + React + React Three Fiber**.

## Stack

- **UI:** React 19, Vite, React Three Fiber / Drei
- **Desktop-Shell:** Tauri 2 (Rust)
- **NFC:** Mock-Bridge jetzt, PC/SC-Reader später

## Lokal am Desktop sehen

Voraussetzungen: [Tauri Prerequisites](https://tauri.app/start/prerequisites/) (Node, Rust, OS-WebView).

```bash
npm install
npm run tauri:dev
```

Nur UI im Browser (Mock, ohne native Window-Shell):

```bash
npm run dev
```

Änderungen an der 3D-UI erscheinen per HMR sofort.

## Aktuelles Grundkonzept

1. Zentrale 3D-Szene mit schwebendem NFC-Chip (reagiert auf Session-Phase)
2. Dock rechts: URL/Text schreiben, Chip simulieren, Status
3. Rust-Commands: `get_nfc_status`, `simulate_tag_present`, `clear_tag`, `write_ndef`
4. Frontend-Client fällt ohne Tauri automatisch auf Browser-Mock zurück

## Nächste Schritte

- Echten USB-Reader per PC/SC anbinden
- NDEF schreiben/lesen für NTAG / Ultralight
- Batch-Modus für viele Chips

## Repo-Migration

Dieses Scaffold liegt vorübergehend im Repo `lernen`. Für das eigene Produkt-Repo:

1. Auf GitHub leeres Repo `nfc-writer` anlegen (unter deinem Account)
2. Neuen Cursor-Cloud-Agent / Chat auf **dieses** Repo starten
3. Code hierher übernehmen (oder Remote umbiegen) und weiterbauen
