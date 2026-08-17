import { useState } from "react";
import "./App.css";
import { NfcWriterTool } from "./tools/NfcWriterTool";
import { QrGeneratorTool } from "./tools/QrGeneratorTool";
import { TOOL_LABELS, type AppTool } from "./tools/types";

function App() {
  const [tool, setTool] = useState<AppTool>("nfc");

  return (
    <div className="app-shell">
      <header className="app-chrome">
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
            <p className="brand-sub">{TOOL_LABELS[tool]}</p>
          </div>
        </div>

        <nav className="tool-switcher mono" aria-label="Tools">
          {(Object.keys(TOOL_LABELS) as AppTool[]).map((id) => (
            <button
              key={id}
              type="button"
              className={["tool-tab", tool === id ? "active" : ""].filter(Boolean).join(" ")}
              onClick={() => setTool(id)}
              aria-current={tool === id ? "page" : undefined}
            >
              {TOOL_LABELS[id]}
            </button>
          ))}
        </nav>
      </header>

      {tool === "nfc" ? <NfcWriterTool /> : <QrGeneratorTool />}
    </div>
  );
}

export default App;
