"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";

export interface ToastData {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const cfg = {
    success: { Icon: CheckCircle2, color: "var(--sz-teal)",  border: "rgba(26,107,87,0.3)"  },
    error:   { Icon: AlertCircle,  color: "var(--sz-coral)", border: "rgba(197,55,44,0.3)"  },
    info:    { Icon: Info,         color: "var(--sz-ink-mid)",border: "var(--sz-border)"    },
  }[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{ opacity: 0, y: 8,     scale: 0.96 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="flex items-start gap-3 px-4 py-3 rounded-2xl max-w-sm bg-[var(--sz-card)] shadow-lg"
      style={{ border: `1px solid ${cfg.border}` }}
    >
      <cfg.Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: cfg.color }} />
      <p className="flex-1 text-sm text-[var(--sz-ink)] leading-snug" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
        {toast.message}
      </p>
      <button onClick={() => onDismiss(toast.id)} className="w-4 h-4 text-[var(--sz-ink-light)] hover:text-[var(--sz-ink)] transition-colors shrink-0" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[100] flex flex-col gap-2 items-end" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
      </AnimatePresence>
    </div>
  );
}
