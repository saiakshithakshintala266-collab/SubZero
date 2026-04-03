"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, ChevronRight, Loader2, Shield } from "lucide-react";

interface CancelModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
  amount: number;
  isLoading?: boolean;
}

export default function CancelModal({
  open, onClose, onConfirm, name, amount, isLoading = false,
}: CancelModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            onClick={(e) => e.target === ref.current && onClose()}
          />

          {/* Sheet */}
          <motion.div
            id="cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed bottom-0 inset-x-0 z-50 md:inset-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px]"
          >
            <div className="bg-[var(--sz-card)] rounded-t-[28px] md:rounded-[28px] px-6 pt-5 pb-8 border border-[var(--sz-border)] shadow-[0_-4px_40px_rgba(0,0,0,0.12)]">
              {/* Handle */}
              <div className="md:hidden w-10 h-1 bg-[var(--sz-ink-faint)] rounded-full mx-auto mb-5" />

              {/* Close */}
              <button
                id="cancel-modal-close"
                onClick={onClose}
                className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-full bg-[var(--sz-bg)] text-[var(--sz-ink-light)] hover:text-[var(--sz-ink)] transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl bg-[var(--sz-coral-dim)] flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-[var(--sz-coral)]" />
              </div>

              <h2
                id="cancel-modal-title"
                className="text-xl font-bold text-[var(--sz-ink)] mb-2"
                style={{ fontFamily: "var(--font-newsreader)" }}
              >
                Cancel {name}?
              </h2>
              <p
                className="text-sm text-[var(--sz-ink-mid)] leading-relaxed mb-5"
                style={{ fontFamily: "var(--font-plus-jakarta)" }}
              >
                The SubZero agent will immediately begin cancellation. You&apos;ll save{" "}
                <span
                  className="font-bold text-[var(--sz-teal)]"
                  style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                >
                  ${amount.toFixed(2)}/mo
                </span>{" "}
                starting now.
              </p>

              {/* Security note */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--sz-bg)] border border-[var(--sz-border)] mb-5">
                <Shield className="w-3.5 h-3.5 text-[var(--sz-ink-light)] shrink-0" />
                <p className="text-xs text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  Handled securely — no credentials shared.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                <button
                  id="cancel-modal-confirm"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wide bg-[var(--sz-coral)] text-white hover:bg-[#a8302a] transition-colors disabled:opacity-60"
                  style={{ fontFamily: "var(--font-plus-jakarta)" }}
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling…</> : <>Cancel Subscription <ChevronRight className="w-4 h-4" /></>}
                </button>
                <button
                  id="cancel-modal-keep"
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-[var(--sz-ink-mid)] hover:text-[var(--sz-ink)] hover:bg-[var(--sz-bg)] transition-colors disabled:opacity-60"
                  style={{ fontFamily: "var(--font-plus-jakarta)" }}
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
