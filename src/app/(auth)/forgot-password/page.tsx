"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import AuthCard, { AuthInput } from "@/components/AuthCard";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    setError("");
    setLoading(true);
    setRateLimited(false);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      if (res.status === 429) {
        const data = await res.json();
        setRateLimited(true);
        setError(data.error ?? "Too many attempts. Please try again later.");
        return;
      }
      // Always show "sent" regardless of whether the email exists
      // to prevent user enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard showBack backHref="/login">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="text-center mb-8">
          <h1
            className="text-[clamp(2rem,8vw,2.75rem)] font-bold italic text-[var(--sz-ink)] mb-3"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Reset your password
          </h1>
          <p className="text-sm text-[var(--sz-ink-mid)] leading-relaxed" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <div className="bg-[var(--sz-card)] rounded-2xl border border-[var(--sz-border)] p-5 mb-5">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-4 gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--sz-saved-bg)] flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-[var(--sz-teal)]" />
                </div>
                <h2 className="text-base font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-newsreader)" }}>
                  Check your inbox
                </h2>
                <p className="text-sm text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  If that email is registered, a reset link has been sent to{" "}
                  <span className="font-semibold text-[var(--sz-teal)]">{email}</span>.
                </p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} noValidate className="space-y-4">
                <AuthInput
                  id="forgot-email"
                  label="Email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error}
                />

                {rateLimited && (
                  <p className="text-sm text-orange-500 text-center" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                    {error}
                  </p>
                )}

                <button
                  id="forgot-submit"
                  type="submit"
                  disabled={loading || rateLimited}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
                  ) : (
                    <>Send reset link <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>

                <div className="h-px bg-[var(--sz-border)] my-1" />

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1 text-sm text-[var(--sz-ink-mid)] hover:text-[var(--sz-teal)] transition-colors"
                  style={{ fontFamily: "var(--font-plus-jakarta)" }}
                >
                  ← Back to login
                </Link>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 justify-center">
          <div className="h-px flex-1 bg-[var(--sz-border)]" />
          <span className="text-[10px] text-[var(--sz-ink-faint)] uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            SubZero Curated Security
          </span>
          <div className="h-px flex-1 bg-[var(--sz-border)]" />
        </div>
      </motion.div>
    </AuthCard>
  );
}
