type WriteBurstProps = {
  active: boolean;
};

/** Ruhige, präzise Schreib-Feedback-Overlay — kein Chaos, klare Sequenz. */
export function WriteBurst({ active }: WriteBurstProps) {
  if (!active) return null;

  return (
    <div className="write-burst" aria-hidden>
      <div className="write-burst-veil" />
      <div className="write-burst-ring" />
      <div className="write-burst-sweep" />
      <div className="write-burst-hud mono">
        <p className="write-burst-title">NDEF schreiben</p>
        <div className="write-burst-track" role="presentation">
          <span className="write-burst-progress" />
        </div>
        <p className="write-burst-sub">Payload wird auf den Tag übertragen…</p>
      </div>
    </div>
  );
}
