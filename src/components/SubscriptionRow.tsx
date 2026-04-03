"use client";

import { motion } from "framer-motion";
import type { Subscription } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface SubscriptionRowProps {
  subscription: Subscription;
  index?: number;
  onCancel?: (id: string) => void;
}

const SERVICE_CONFIG: Record<string, { char: string; bg: string; color: string }> = {
  adobe:    { char: "Ad", bg: "#FF0000",  color: "#fff" },
  netflix:  { char: "N",  bg: "#E50914",  color: "#fff" },
  equinox:  { char: "Eq", bg: "#2D2D2D",  color: "#fff" },
  chatgpt:  { char: "GP", bg: "#10A37F",  color: "#fff" },
  openai:   { char: "AI", bg: "#10A37F",  color: "#fff" },
  nytimes:  { char: "ny", bg: "#000000",  color: "#fff" },
  spotify:  { char: "S",  bg: "#1db954",  color: "#fff" },
  amazon:   { char: "A",  bg: "#FF9900",  color: "#fff" },
  apple:    { char: "A",  bg: "#555555",  color: "#fff" },
};

function ServiceLogo({ name }: { name: string }) {
  const key = name.toLowerCase().split(" ")[0];
  const match = Object.entries(SERVICE_CONFIG).find(([k]) => key.includes(k));
  const cfg = match ? match[1] : { char: name.slice(0, 2), bg: "#1A6B57", color: "#fff" };
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0"
      style={{ background: cfg.bg, color: cfg.color, fontFamily: "var(--font-plus-jakarta)" }}
    >
      {cfg.char}
    </div>
  );
}

export default function SubscriptionRow({ subscription, index = 0, onCancel }: SubscriptionRowProps) {
  const { id, name, amount, billingCycle, nextBill, lastUsed, status } = subscription;

  const sublabel = lastUsed
    ? `Last used: ${lastUsed}`
    : nextBill
    ? `Next bill: ${nextBill}`
    : `Billed ${billingCycle === "monthly" ? "Monthly" : "Annually"}`;

  const isActionable = status === "active" || status === "flagged";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`
        flex items-center gap-3 px-4 py-3.5 bg-[var(--sz-card)] rounded-2xl
        border border-[var(--sz-border)]
        transition-all duration-150
        ${isActionable ? "cursor-pointer hover:border-[var(--sz-teal)] hover:shadow-sm" : ""}
        ${status === "flagged" ? "border-l-4 border-l-[var(--sz-coral)]" : ""}
        ${status === "cancelled" ? "border-l-4 border-l-[var(--sz-teal)] opacity-60" : ""}
        ${status === "running" ? "border-l-4 border-l-[var(--sz-orange)]" : ""}
      `}
      onClick={() => isActionable && onCancel?.(id)}
      role={isActionable ? "button" : undefined}
      aria-label={`${name} — $${amount.toFixed(2)}/mo`}
    >
      <ServiceLogo name={name} />

      <div className="flex-1 min-w-0">
        <p
          className="text-[var(--sz-ink)] text-sm font-semibold truncate"
          style={{ fontFamily: "var(--font-plus-jakarta)" }}
        >
          {name}
        </p>
        <p
          className="text-[var(--sz-ink-light)] text-xs mt-0.5"
          style={{ fontFamily: "var(--font-plus-jakarta)" }}
        >
          {sublabel}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className="text-[var(--sz-ink)] text-sm font-semibold"
          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
        >
          ${amount.toFixed(2)}
        </span>
        <StatusBadge status={status} />
      </div>

      {isActionable && (
        <button
          id={`cancel-btn-${id}`}
          onClick={(e) => { e.stopPropagation(); onCancel?.(id); }}
          className="ml-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider text-[var(--sz-coral)] hover:bg-[var(--sz-coral-dim)] transition-colors duration-150 shrink-0"
          style={{ fontFamily: "var(--font-plus-jakarta)" }}
        >
          Cancel
        </button>
      )}
    </motion.div>
  );
}
