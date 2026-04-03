interface StatCardProps {
  label: string;
  value: string;
  isMoney?: boolean;
  accent?: "coral" | "teal" | "none";
  large?: boolean;
}

export default function StatCard({
  label,
  value,
  isMoney = false,
  accent = "none",
  large = false,
}: StatCardProps) {
  const bg =
    accent === "coral" ? "var(--sz-coral-dim)" :
    accent === "teal"  ? "var(--sz-saved-bg)"  : "var(--sz-card)";
  const valueColor =
    accent === "coral" ? "var(--sz-coral)" :
    accent === "teal"  ? "var(--sz-teal)"  : "var(--sz-ink)";

  return (
    <div
      className="flex flex-col gap-1 px-5 py-4 rounded-2xl border border-[var(--sz-border)]"
      style={{ background: bg }}
    >
      <p
        className="text-[var(--sz-ink-light)] text-[11px] font-semibold uppercase tracking-[0.06em]"
        style={{ fontFamily: "var(--font-plus-jakarta)" }}
      >
        {label}
      </p>
      <p
        className={large ? "text-4xl font-bold" : "text-2xl font-bold"}
        style={{
          fontFamily: isMoney ? "var(--font-newsreader)" : "var(--font-newsreader)",
          color: valueColor,
          fontStyle: "normal",
        }}
      >
        {isMoney && <span className="text-[0.6em] align-super mr-0.5">$</span>}
        {value}
      </p>
    </div>
  );
}
