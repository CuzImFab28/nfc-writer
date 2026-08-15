import { useEffect, useState, useTransition, type FormEvent } from "react";
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
import "./App.css";

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

  const chipPresent = isChipPresent(status);

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
    if (!chipPresent) return;
    setStatus((prev) => ({
      ...prev,
      phase: "writing",
      message: "Schreibe NDEF…",
    }));
    run(() => writeNdef({ payload, kind }));
  }

  const modeLabel = status.mockMode ? "Mock · Dev" : "PC/SC · Live";
  const chipTypeLabel = status.tag?.chipType ?? "—";
  const capacityLabel = status.tag
    ? `${status.tag.capacityBytes} B`
    : "—";

  return (
    <div className="app-shell">
      <div className="wrap">
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
              <p className="brand-sub">NFC Writer // Desktop</p>
            </div>
          </div>

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

        <section className="hero-copy">
          <p className="eyebrow mono">write.exe</p>
          <h1>
            Schreibe den Chip.
            <br />
            Sieh ihn <span>leben.</span>
          </h1>
          <p>
            3D-Workspace für NDEF-Tags. Lege einen Chip auf den Scanner — die Visualisierung
            reagiert live auf die Erkennung.
          </p>
          <div className="meta-row mono">
            <div className="meta-item">
              <div className="k">Modus</div>
              <div className="v">{modeLabel}</div>
            </div>
            <div className="meta-item">
              <div className="k">Chip-Typ</div>
              <div className="v">{chipTypeLabel}</div>
            </div>
            <div className="meta-item">
              <div className="k">Kapazität</div>
              <div className="v">{capacityLabel}</div>
            </div>
          </div>
        </section>

        <main className="workspace">
          <section
            className={["scanner", chipPresent ? "has-chip" : ""].filter(Boolean).join(" ")}
            aria-label="NFC-Scanner"
          >
            <RadarSweep intensified={chipPresent} />
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
            <CornerBrackets active={chipPresent} />
            {!chipPresent && (
              <p className="tap-hint mono">Chip auf den Reader legen</p>
            )}
            <Scene chipPresent={chipPresent} />
            <HexdumpTicker />
          </section>

          <aside className="panel">
            <div className="panel-bar">
              <div className="dots" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <div className="panel-title mono">write_config.sh</div>
              <div className="panel-bar-spacer" />
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
                >
                  URL
                </button>
                <button
                  type="button"
                  className={["tab mono", kind === "text" ? "active" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setKind("text")}
                >
                  Text
                </button>
              </div>

              <button
                className="btn primary mono"
                type="submit"
                disabled={pending || !chipPresent}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M12 2v20M2 12h20" />
                </svg>
                Auf Chip schreiben
              </button>

              <div className="btn-row">
                <button
                  type="button"
                  className="btn mono"
                  onClick={() => run(simulateTagPresent)}
                  disabled={pending}
                >
                  Chip simulieren
                </button>
                <button
                  type="button"
                  className="btn danger mono"
                  onClick={() => run(clearTag)}
                  disabled={pending}
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
    </div>
  );
}

export default App;
