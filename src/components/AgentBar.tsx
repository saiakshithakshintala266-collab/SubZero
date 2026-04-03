"use client";

import { Loader2 } from "lucide-react";

interface AgentBarProps {
  status: "idle" | "ready" | "scanning" | "cancelling" | "done";
  label?: string;
  progress?: number;
  onDraft?: () => void;
  onAutoCancel?: () => void;
  flaggedCount?: number;
}

export default function AgentBar({
  status,
  label,
  progress,
  onDraft,
  onAutoCancel,
  flaggedCount = 0,
}: AgentBarProps) {
  const isActive = status === "scanning" || status === "cancelling";
  const dotColor =
    status === "ready" || status === "done" ? "bg-[var(--sz-teal)]" :
    isActive                                ? "bg-[var(--sz-orange)]" :
    "bg-[var(--sz-ink-faint)]";

  const displayLabel =
    label ??
    (status === "idle"       ? "Agent Offline"                   :
     status === "ready"      ? "Playwright + Claude Agent · Ready" :
     status === "scanning"   ? "Agent Scanning…"                 :
     status === "cancelling" ? "Agent Cancelling…"              :
     "Agent Done");

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--sz-teal-light)] border border-[rgba(26,107,87,0.2)]">
      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${isActive ? "animate-pulse" : ""}`} />

      {/* Label */}
      <p
        className="flex-1 text-sm font-semibold text-[var(--sz-teal)] truncate"
        style={{ fontFamily: "var(--font-plus-jakarta)" }}
      >
        {displayLabel}
      </p>

      {/* Progress */}
      {progress !== undefined && progress > 0 && progress < 100 && (
        <span
          className="text-xs text-[var(--sz-teal)]"
          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
        >
          {progress}%
        </span>
      )}

      {/* Auto-cancel button */}
      {status === "ready" && flaggedCount > 0 && onAutoCancel && (
        <div className="flex gap-2 ml-2">
          <button
            id="agent-draft-btn"
            onClick={onDraft}
            className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white border border-[var(--sz-border)] text-[var(--sz-ink-mid)] hover:border-[var(--sz-ink-light)] transition-colors"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            Draft
          </button>
          <button
            id="agent-autocancel-btn"
            onClick={onAutoCancel}
            className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--sz-coral)] text-white hover:bg-[#a8302a] transition-colors"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            Auto-Cancel Flagged ({flaggedCount})
          </button>
        </div>
      )}

      {isActive && <Loader2 className="w-3.5 h-3.5 text-[var(--sz-teal)] animate-spin shrink-0" />}
    </div>
  );
}
