import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import {
  clearTag,
  getNfcStatus,
  simulateTagPresent,
  writeNdef,
} from "./nfc/client";
import { isChipPresent, phaseStatusLabel } from "./nfc/status";
import type { NfcStatus } from "./nfc/types";
import { Scene } from "./scene/Scene";
import { CornerBrackets } from "./ui/CornerBrackets";
import { HexdumpTicker } from "./ui/HexdumpTicker";
import { RadarSweep } from "./ui/RadarSweep";
import { WriteBurst } from "./ui/WriteBurst";
import "./App.css";

const WRITE_FX_MS = 2200;

const initialStatus: NfcStatus = {
  phase: "idle",
  readerConnected: false,
  mockMode: true,
  tag: null,
  lastPayload: null,
  message: "Lade Status…",
};

function scanPrimaryLabel(status: NfcStatus, chipPresent: boolean): string {
  if (status.phase === "writing") return "WRITE.IN_PROGRESS";
  if (status.phase === "success") return "WRITE.OK";
  if (status.phase === "error") return "WRITE.ERROR";
  if (chipPresent && status.tag) {
    return `${status.tag.chipType.toUpperCase()} · GEKOPPELT`;
  }
  return "KEIN SIGNAL";
}

function scanSecondaryLabel(status: NfcStatus, chipPresent: boolean): string {
  if (!chipPresent || !status.tag) return "—";
  const shortUid = status.tag.uid.split(":").slice(0, 3).join(":");
  return `UID ${shortUid}`;
}

function App() {
  const [status, setStatus] = useState<NfcStatus>(initialStatus);
  const [payload, setPayload] = useState("https://example.com");
  const [kind, setKind] = useState<"url" | "text">("url");
  const [pending, startTransition] = useTransition();
  const [writingFx, setWritingFx] = useState(false);
  const writeTimer = useRef<number | null>(null);

  const chipPresent = isChipPresent(status);
  const writing = writingFx || status.phase === "writing";

  useEffect(() => {
    let alive = true;
    (async () => {
      const next = await getNfcStatus();
      if (alive) setStatus(next);
    })();
    return () => {
      alive = false;
      if (writeTimer.current != null) {
        window.clearTimeout(writeTimer.current);
      }
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
    if (!chipPresent || writingFx || pending) return;

    setWritingFx(true);
    setStatus((prev) => ({
      ...prev,
      phase: "writing",
      message: "Schreibsequenz läuft…",
    }));

    if (writeTimer.current != null) {
      window.clearTimeout(writeTimer.current);
    }

    writeTimer.current = window.setTimeout(() => {
      startTransition(async () => {
        const next = await writeNdef({ payload, kind });
        setStatus(next);
        setWritingFx(false);
      });
    }, WRITE_FX_MS);
  }

  const modeLabel = status.mockMode ? "Mock" : "PC/SC";
  const chipTypeLabel = status.tag?.chipType ?? "—";
  const capacityLabel = status.tag ? `${status.tag.capacityBytes} B` : "—";

  return (
    <div className={["app-shell", writing ? "is-writing" : ""].filter(Boolean).join(" ")}>
      <WriteBurst active={writing} />

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <rect x="9.5" y="9.5" width="5" height="5" />
            </svg>
          </div>
          <div>
            <p className="brand-name mono">TAGPRESS</p>
            <p className="brand-sub">NFC Writer</p>
          </div>
        </div>

        <dl className="session-meta mono">
          <div>
            <dt>Modus</dt>
            <dd>{modeLabel}</dd>
          </div>
          <div>
            <dt>Typ</dt>
            <dd>{chipTypeLabel}</dd>
          </div>
          <div>
            <dt>Kapazität</dt>
            <dd>{capacityLabel}</dd>
          </div>
        </dl>

        <div
          className={[
            "status-pill mono",
            chipPresent ? "is-detected" : "",
            `phase-${status.phase}`,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="status-dot" />
          {phaseStatusLabel(status.phase, chipPresent)}
        </div>
      </header>

      <main className="workspace">
        <section
          className={[
            "scanner",
            chipPresent ? "has-chip" : "",
            writing ? "is-writing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="NFC-Scanner"
        >
          <RadarSweep intensified={chipPresent || writing} />
          <p
            className={[
              "scan-label mono",
              status.phase === "writing" ? "is-writing" : "",
              status.phase === "error" ? "is-error" : "",
              chipPresent ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {scanPrimaryLabel(status, chipPresent)}
          </p>
          <p className="scan-label mono right">{scanSecondaryLabel(status, chipPresent)}</p>
          <CornerBrackets active={chipPresent || writing} />
          {!chipPresent && !writing && (
            <p className="tap-hint mono">Chip auf den Reader legen</p>
          )}
          <Scene chipPresent={chipPresent} writing={writing} />
          <HexdumpTicker />
        </section>

        <aside className="panel">
          <div className="panel-bar">
            <div className="panel-title mono">NDEF schreiben</div>
          </div>

          <form className="panel-body" onSubmit={onWrite}>
            <label className="field-label mono" htmlFor="payload">
              Inhalt
            </label>
            <div className="input-row">
              <input
                id="payload"
                className="mono"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder={kind === "url" ? "https://…" : "Text…"}
                autoComplete="off"
                disabled={writing}
              />
            </div>

            <p className="field-label mono" id="kind-label">
              Typ
            </p>
            <div className="tabs" role="group" aria-labelledby="kind-label">
              <button
                type="button"
                className={["tab mono", kind === "url" ? "active" : ""].filter(Boolean).join(" ")}
                onClick={() => setKind("url")}
                disabled={writing}
              >
                URL
              </button>
              <button
                type="button"
                className={["tab mono", kind === "text" ? "active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setKind("text")}
                disabled={writing}
              >
                Text
              </button>
            </div>

            <button
              className={["btn primary mono", writing ? "is-firing" : ""]
                .filter(Boolean)
                .join(" ")}
              type="submit"
              disabled={pending || !chipPresent || writing}
            >
              {writing ? "Schreibe…" : "Auf Chip schreiben"}
            </button>

            <div className="btn-row">
              <button
                type="button"
                className="btn mono"
                onClick={() => run(simulateTagPresent)}
                disabled={pending || writing}
              >
                Chip simulieren
              </button>
              <button
                type="button"
                className="btn danger mono"
                onClick={() => run(clearTag)}
                disabled={pending || writing}
              >
                Entfernen
              </button>
            </div>

            <div className="footnote mono">
              <p>
                {status.message}
                {status.lastPayload ? ` · Zuletzt: ${status.lastPayload}` : ""}
              </p>
              {status.tag && (
                <p className="footnote-meta">
                  UID {status.tag.uid} · {status.tag.chipType} · {status.tag.capacityBytes} Byte
                </p>
              )}
            </div>
          </form>
        </aside>
      </main>
    </div>
  );
}

export default App;
