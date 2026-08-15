type CornerBracketsProps = {
  active?: boolean;
  className?: string;
};

export function CornerBrackets({ active = false, className }: CornerBracketsProps) {
  return (
    <div
      className={["corner-brackets", active ? "is-active" : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      <span className="bracket tl" />
      <span className="bracket tr" />
      <span className="bracket bl" />
      <span className="bracket br" />
    </div>
  );
}
