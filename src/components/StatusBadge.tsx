import type { SubscriptionStatus } from "@/lib/types";

const CONFIG: Record<SubscriptionStatus, { label: string; bg: string; text: string }> = {
  active:    { label: "ACTIVE",    bg: "rgba(26,107,87,0.12)",   text: "#1A6B57" },
  flagged:   { label: "FLAGGED",   bg: "rgba(197,55,44,0.12)",   text: "#C5372C" },
  running:   { label: "RUNNING",   bg: "rgba(224,123,58,0.12)",  text: "#E07B3A" },
  cancelled: { label: "CANCELLED", bg: "rgba(26,107,87,0.10)",   text: "#1A6B57" },
  idle:      { label: "IDLE",      bg: "rgba(138,138,138,0.10)", text: "#8A8A8A" },
};

export default function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const cfg = CONFIG[status] ?? { label: String(status).toUpperCase(), bg: "rgba(138,138,138,0.10)", text: "#8A8A8A" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{
        background: cfg.bg,
        color: cfg.text,
        fontFamily: "var(--font-jetbrains-mono)",
        letterSpacing: "0.05em",
      }}
    >
      {cfg.label}
    </span>
  );
}
