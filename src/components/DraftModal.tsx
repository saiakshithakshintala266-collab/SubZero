"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Shield, Loader2, ChevronRight, CheckSquare, Square } from "lucide-react";
import type { Subscription } from "@/lib/types";

interface DraftModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with only the IDs the user kept checked */
  onConfirm: (selectedIds: string[]) => void;
  flaggedSubs: Subscription[];
  isLoading?: boolean;
}

// ── Inner content — remounted on each open via `key` prop, so useState
// initialiser always runs fresh from the current flaggedSubs list.
function DraftContent({
  onClose,
  onConfirm,
  flaggedSubs,
  isLoading,
}: Omit<DraftModalProps, "open">) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Initialised once from flaggedSubs (remounted on each modal open via key)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(flaggedSubs.map((s) => s.id))
  );

  // Escape key closes
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, isLoading]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const totalSaving = flaggedSubs
    .filter((s) => selected.has(s.id))
    .reduce((a, s) => a + s.amount, 0);

  const selectedCount = selected.size;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        ref={backdropRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
        onClick={(e) => e.target === backdropRef.current && !isLoading && onClose()}
      />

      {/* Sheet — slides up from bottom on mobile, centered on desktop */}
      <motion.div
        id="draft-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-modal-title"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="fixed bottom-0 inset-x-0 z-50 md:inset-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[460px]"
      >
        <div className="bg-[var(--sz-card)] rounded-t-[28px] md:rounded-[28px] px-6 pt-5 pb-8 border border-[var(--sz-border)] shadow-[0_-4px_40px_rgba(0,0,0,0.12)]">
          {/* Drag handle (mobile) */}
          <div className="md:hidden w-10 h-1 bg-[var(--sz-ink-faint)] rounded-full mx-auto mb-5" />

          {/* Close */}
          <button
            id="draft-modal-close"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
            className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-full bg-[var(--sz-bg)] text-[var(--sz-ink-light)] hover:text-[var(--sz-ink)] transition-colors disabled:opacity-40"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Icon + heading */}
          <div className="w-12 h-12 rounded-2xl bg-[var(--sz-teal-light)] flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-[var(--sz-teal)]" />
          </div>

          <h2
            id="draft-modal-title"
            className="text-xl font-bold text-[var(--sz-ink)] mb-1"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Review Draft Cancellations
          </h2>
          <p
            className="text-sm text-[var(--sz-ink-mid)] mb-5"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            Uncheck any subscriptions you want to keep, then confirm.
          </p>

          {/* Subscription checklist */}
          <div className="space-y-2 mb-5 max-h-[280px] overflow-y-auto pr-1">
            {flaggedSubs.map((s) => {
              const checked = selected.has(s.id);
              return (
                <button
                  key={s.id}
                  id={`draft-row-${s.id}`}
                  onClick={() => toggle(s.id)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-150 text-left disabled:cursor-not-allowed ${
                    checked
                      ? "bg-[var(--sz-coral-dim)] border-[rgba(197,55,44,0.25)]"
                      : "bg-[var(--sz-bg)] border-[var(--sz-border)] opacity-60"
                  }`}
                >
                  {/* Checkbox icon */}
                  <span className="shrink-0">
                    {checked
                      ? <CheckSquare className="w-4 h-4 text-[var(--sz-coral)]" />
                      : <Square className="w-4 h-4 text-[var(--sz-ink-faint)]" />
                    }
                  </span>

                  {/* Logo char */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold text-white"
                    style={{ background: "var(--sz-ink)" }}
                  >
                    {s.name[0]}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold text-[var(--sz-ink)] truncate"
                      style={{ fontFamily: "var(--font-plus-jakarta)" }}
                    >
                      {s.name}
                    </p>
                    <p
                      className="text-[11px] text-[var(--sz-ink-light)]"
                      style={{ fontFamily: "var(--font-plus-jakarta)" }}
                    >
                      {s.lastUsed ? `Last used ${s.lastUsed}` : `Billed ${s.billingCycle}`}
                    </p>
                  </div>

                  {/* Amount */}
                  <span
                    className={`text-sm font-bold shrink-0 ${checked ? "text-[var(--sz-coral)]" : "text-[var(--sz-ink-light)]"}`}
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    ${s.amount.toFixed(2)}/mo
                  </span>
                </button>
              );
            })}
          </div>

          {/* Savings summary */}
          <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-[var(--sz-bg)] border border-[var(--sz-border)] mb-5">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sz-ink-light)]"
                style={{ fontFamily: "var(--font-plus-jakarta)" }}
              >
                {selectedCount === 0
                  ? "Nothing selected"
                  : `${selectedCount} subscription${selectedCount > 1 ? "s" : ""} selected`}
              </p>
              <p
                className="text-xl font-bold text-[var(--sz-teal)] mt-0.5"
                style={{ fontFamily: "var(--font-newsreader)" }}
              >
                {totalSaving > 0 ? `Save $${totalSaving.toFixed(2)}/mo` : "—"}
              </p>
            </div>
            <Shield className="w-5 h-5 text-[var(--sz-ink-faint)]" />
          </div>

          {/* Security note */}
          <p
            className="text-[11px] text-[var(--sz-ink-light)] text-center mb-5"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            Handled securely — no credentials shared with third parties.
          </p>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              id="draft-modal-confirm"
              onClick={() => onConfirm([...selected])}
              disabled={isLoading || selectedCount === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wide bg-[var(--sz-coral)] text-white hover:bg-[#a8302a] transition-colors disabled:opacity-50"
              style={{ fontFamily: "var(--font-plus-jakarta)" }}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling…</>
              ) : (
                <>Confirm &amp; Cancel {selectedCount > 0 ? `(${selectedCount})` : ""} <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
            <button
              id="draft-modal-back"
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-[var(--sz-ink-mid)] hover:text-[var(--sz-ink)] hover:bg-[var(--sz-bg)] transition-colors disabled:opacity-40"
              style={{ fontFamily: "var(--font-plus-jakarta)" }}
            >
              Go Back
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Public wrapper — uses AnimatePresence for enter/exit animations and
// passes `open` as a `key` to DraftContent so it remounts (resetting all
// internal state) each time the modal opens.
export default function DraftModal({ open, onClose, onConfirm, flaggedSubs, isLoading }: DraftModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <DraftContent
          key="draft-content"
          onClose={onClose}
          onConfirm={onConfirm}
          flaggedSubs={flaggedSubs}
          isLoading={isLoading}
        />
      )}
    </AnimatePresence>
  );
}
