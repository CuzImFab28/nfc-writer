import { useMemo } from "react";

const HEX = "0123456789ABCDEF";

type HexCell = {
  id: number;
  value: string;
  highlight: boolean;
};

function buildCells(pairs = 40): HexCell[] {
  const cells: HexCell[] = [];
  for (let i = 0; i < pairs; i++) {
    const value = `${HEX[Math.floor(Math.random() * 16)]}${HEX[Math.floor(Math.random() * 16)]}`;
    cells.push({
      id: i,
      value,
      highlight: Math.random() < 0.15,
    });
  }
  return cells;
}

type HexdumpTickerProps = {
  className?: string;
};

export function HexdumpTicker({ className }: HexdumpTickerProps) {
  const cells = useMemo(() => buildCells(), []);

  return (
    <div className={["hexdump-ticker", className].filter(Boolean).join(" ")} aria-hidden>
      <div className="hexdump-track mono">
        {[0, 1].map((copy) => (
          <span key={copy} className="hexdump-segment">
            {cells.map((cell) => (
              <span
                key={`${copy}-${cell.id}`}
                className={cell.highlight ? "hex-highlight" : undefined}
              >
                {cell.value}{" "}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
