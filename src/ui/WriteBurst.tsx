import { useMemo } from "react";

const HEX = "0123456789ABCDEF";

type WriteBurstProps = {
  active: boolean;
};

function randomHex(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += HEX[Math.floor(Math.random() * 16)];
  }
  return out;
}

export function WriteBurst({ active }: WriteBurstProps) {
  const columns = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${4 + ((i * 5.3) % 92)}%`,
        delay: `${(i % 7) * 0.08}s`,
        duration: `${0.7 + (i % 5) * 0.12}s`,
        text: Array.from({ length: 14 }, () => randomHex(2)).join("\n"),
      })),
    [],
  );

  const sparks = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.4}s`,
        size: 2 + Math.random() * 5,
      })),
    [],
  );

  if (!active) return null;

  return (
    <div className="write-burst" aria-hidden>
      <div className="write-burst-flash" />
      <div className="write-burst-ring r1" />
      <div className="write-burst-ring r2" />
      <div className="write-burst-ring r3" />
      <div className="write-burst-beam" />
      <div className="write-burst-beam delayed" />
      <div className="write-burst-glitch mono">
        <span>WRITE SEQUENCE</span>
        <span>NDEF // INJECTION</span>
        <span>0xFF · BURN · COMMIT</span>
      </div>
      <div className="write-burst-rain">
        {columns.map((col) => (
          <pre
            key={col.id}
            className="write-burst-col mono"
            style={{
              left: col.left,
              animationDelay: col.delay,
              animationDuration: col.duration,
            }}
          >
            {col.text}
          </pre>
        ))}
      </div>
      <div className="write-burst-sparks">
        {sparks.map((spark) => (
          <span
            key={spark.id}
            style={{
              left: spark.left,
              top: spark.top,
              width: spark.size,
              height: spark.size,
              animationDelay: spark.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
}
