type RadarSweepProps = {
  intensified?: boolean;
  className?: string;
};

export function RadarSweep({ intensified = false, className }: RadarSweepProps) {
  return (
    <div
      className={["radar-sweep", intensified ? "is-intensified" : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    />
  );
}
