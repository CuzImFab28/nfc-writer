import { useEffect, useState, useTransition, type FormEvent } from "react";
import {
  clearTag,
  getNfcStatus,
  simulateTagPresent,
  writeNdef,
} from "./nfc/client";
import type { NfcStatus, SessionPhase } from "./nfc/types";
import { Scene } from "./scene/Scene";
import "./App.css";

const phaseLabel: Record<SessionPhase, string> = {
  idle: "Bereit",
  waitingForTag: "Warte auf Chip",
  tagPresent: "Chip erkannt",
  writing: "Schreibe…",
  success: "Geschrieben",
  error: "Fehler",
};

const initialStatus: NfcStatus = {
  phase: "idle",
  readerConnected: false,
  mockMode: true,
  tag: null,
  lastPayload: null,
  message: "Lade Status…",
};

function App() {
  const [status, setStatus] = useState<NfcStatus>(initialStatus);
  const [payload, setPayload] = useState("https://example.com");
  const [kind, setKind] = useState<"url" | "text">("url");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    (async () => {
      const next = await getNfcStatus();
      if (alive) setStatus(next);
    })();
    return () => {
      alive = false;
    };
  }, []);

  function run(action: () => Promise<NfcStatus>) {
    startTransition(async () => {
      const next = await action();
      setStatus(next);
    });
  }

  function onWrite(event: FormEvent) {
    event.preventDefault();
    run(() => writeNdef({ payload, kind }));
  }

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden />
      <Scene phase={status.phase} />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">T</span>
          <div>
            <p className="brand-name">Tagpress</p>
            <p className="brand-sub">NFC Writer · Desktop</p>
          </div>
        </div>
        <div className={`status-pill phase-${status.phase}`}>
          <span className="status-dot" />
          {phaseLabel[status.phase]}
        </div>
      </header>

      <section className="hero-copy">
        <h1>Schreibe den Chip. Sieh ihn leben.</h1>
        <p>
          3D-Workspace für NDEF-Tags. Mock-Bridge jetzt, echte PC/SC-Reader-Anbindung als
          nächster Schritt.
        </p>
      </section>

      <aside className="control-dock">
        <form className="write-form" onSubmit={onWrite}>
          <label className="field">
            <span>Inhalt</span>
            <input
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder={kind === "url" ? "https://…" : "Text…"}
              autoComplete="off"
            />
          </label>

          <div className="kind-row" role="group" aria-label="Payload-Typ">
            <button
              type="button"
              className={kind === "url" ? "active" : ""}
              onClick={() => setKind("url")}
            >
              URL
            </button>
            <button
              type="button"
              className={kind === "text" ? "active" : ""}
              onClick={() => setKind("text")}
            >
              Text
            </button>
          </div>

          <button className="primary" type="submit" disabled={pending}>
            Auf Chip schreiben
          </button>
        </form>

        <div className="tool-row">
          <button type="button" onClick={() => run(simulateTagPresent)} disabled={pending}>
            Chip simulieren
          </button>
          <button type="button" onClick={() => run(clearTag)} disabled={pending}>
            Entfernen
          </button>
        </div>

        <div className="meta">
          <p>{status.message}</p>
          {status.tag && (
            <dl>
              <div>
                <dt>UID</dt>
                <dd>{status.tag.uid}</dd>
              </div>
              <div>
                <dt>Typ</dt>
                <dd>{status.tag.chipType}</dd>
              </div>
              <div>
                <dt>Kapazität</dt>
                <dd>{status.tag.capacityBytes} Byte</dd>
              </div>
            </dl>
          )}
          {status.lastPayload && (
            <p className="last-payload">Zuletzt: {status.lastPayload}</p>
          )}
          <p className="mode-hint">
            {status.mockMode ? "Mock-Modus" : "Live-Reader"} ·{" "}
            {status.readerConnected ? "Reader online" : "kein Reader"}
          </p>
        </div>
      </aside>
    </div>
  );
}

export default App;
