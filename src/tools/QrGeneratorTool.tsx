import QRCode from "qrcode";
import { useMemo, useState } from "react";
import QRCodeSvg from "react-qr-code";

type QrKind = "url" | "text";

const SIZE_OPTIONS = [
  { label: "256 px", value: 256 },
  { label: "512 px", value: 512 },
  { label: "1024 px", value: 1024 },
] as const;

function normalizePayload(kind: QrKind, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (kind === "url" && !/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function QrGeneratorTool() {
  const [input, setInput] = useState("https://example.com");
  const [kind, setKind] = useState<QrKind>("url");
  const [exportSize, setExportSize] = useState<(typeof SIZE_OPTIONS)[number]["value"]>(512);
  const [status, setStatus] = useState<string | null>(null);

  const payload = useMemo(() => normalizePayload(kind, input), [kind, input]);
  const hasPayload = payload.length > 0;

  async function downloadPng() {
    if (!hasPayload) return;
    try {
      const dataUrl = await QRCode.toDataURL(payload, {
        width: exportSize,
        margin: 2,
        color: {
          dark: "#08070c",
          light: "#efeaf9",
        },
        errorCorrectionLevel: "M",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `tagpress-qr-${exportSize}.png`;
      link.click();
      setStatus(`PNG (${exportSize}px) gespeichert.`);
    } catch {
      setStatus("Export fehlgeschlagen.");
    }
  }

  async function copyPayload() {
    if (!hasPayload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setStatus("Inhalt in Zwischenablage kopiert.");
    } catch {
      setStatus("Kopieren fehlgeschlagen.");
    }
  }

  return (
    <div className="tool-view">
      <header className="tool-topbar">
        <dl className="session-meta mono">
          <div>
            <dt>Typ</dt>
            <dd>{kind === "url" ? "URL" : "Text"}</dd>
          </div>
          <div>
            <dt>Zeichen</dt>
            <dd>{payload.length || "—"}</dd>
          </div>
          <div>
            <dt>Export</dt>
            <dd>{exportSize}px</dd>
          </div>
        </dl>

        <div className="status-pill mono is-detected">
          <span className="status-dot" />
          {hasPayload ? "Bereit" : "Leer"}
        </div>
      </header>

      <main className="workspace qr-workspace">
        <section className="qr-preview-panel" aria-label="QR-Vorschau">
          <CornerBracketsStatic active={hasPayload} />
          <div className="qr-preview-frame">
            {hasPayload ? (
              <QRCodeSvg
                value={payload}
                size={Math.min(320, exportSize)}
                bgColor="#efeaf9"
                fgColor="#08070c"
                level="M"
              />
            ) : (
              <p className="qr-empty mono">Inhalt eingeben…</p>
            )}
          </div>
          {hasPayload && (
            <p className="qr-encoded mono" title={payload}>
              {payload}
            </p>
          )}
        </section>

        <aside className="panel">
          <div className="panel-bar">
            <div className="panel-title mono">QR erzeugen</div>
          </div>

          <div className="panel-body">
            <label className="field-label mono" htmlFor="qr-input">
              Inhalt
            </label>
            <div className="input-row">
              <input
                id="qr-input"
                className="mono"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setStatus(null);
                }}
                placeholder={kind === "url" ? "https://…" : "Text…"}
                autoComplete="off"
              />
            </div>

            <p className="field-label mono" id="qr-kind-label">
              Typ
            </p>
            <div className="tabs" role="group" aria-labelledby="qr-kind-label">
              <button
                type="button"
                className={["tab mono", kind === "url" ? "active" : ""].filter(Boolean).join(" ")}
                onClick={() => setKind("url")}
              >
                URL
              </button>
              <button
                type="button"
                className={["tab mono", kind === "text" ? "active" : ""].filter(Boolean).join(" ")}
                onClick={() => setKind("text")}
              >
                Text
              </button>
            </div>

            <p className="field-label mono" id="qr-size-label">
              Export-Größe
            </p>
            <div className="tabs" role="group" aria-labelledby="qr-size-label">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={[
                    "tab mono tab-compact",
                    exportSize === opt.value ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setExportSize(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn primary mono"
              onClick={downloadPng}
              disabled={!hasPayload}
            >
              PNG herunterladen
            </button>

            <button
              type="button"
              className="btn mono"
              onClick={copyPayload}
              disabled={!hasPayload}
            >
              Inhalt kopieren
            </button>

            <div className="footnote mono">
              <p>
                {status ??
                  (kind === "url"
                    ? "URLs ohne Schema werden automatisch mit https:// ergänzt."
                    : "Beliebiger Text wird als QR-Code kodiert.")}
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function CornerBracketsStatic({ active }: { active: boolean }) {
  return (
    <div className={["corner-brackets", active ? "is-active" : ""].filter(Boolean).join(" ")} aria-hidden>
      <span className="bracket tl" />
      <span className="bracket tr" />
      <span className="bracket bl" />
      <span className="bracket br" />
    </div>
  );
}
