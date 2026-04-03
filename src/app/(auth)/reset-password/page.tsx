"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";
import AuthCard, { AuthInput } from "@/components/AuthCard";

// Client-side password strength check
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+",        pass: password.length >= 8 },
    { label: "Uppercase", pass: /[A-Z]/.test(password) },
    { label: "Number",    pass: /[0-9]/.test(password) },
    { label: "Symbol",    pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score  = checks.filter((c) => c.pass).length;
  const colors = ["bg-[var(--sz-coral)]", "bg-orange-400", "bg-yellow-400", "bg-[var(--sz-teal)]"];
  if (!password) return null;
  return (
    <div className="flex gap-1 mt-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < score ? colors[score - 1] : "bg-[var(--sz-border)]"}`} />
      ))}
    </div>
  );
}

export default function ResetPasswordPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");

  // No token in URL — show error immediately
  if (!token) {
    return (
      <AuthCard showBack backHref="/forgot-password">
        <div className="flex flex-col items-center text-center gap-4 py-12">
          <div className="w-12 h-12 rounded-full bg-[var(--sz-coral-dim)] flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-[var(--sz-coral)]" />
          </div>
          <h1 className="text-xl font-bold italic text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-newsreader)" }}>
            Invalid reset link
          </h1>
          <p className="text-sm text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            This reset link is missing or malformed. Please request a new one.
          </p>
        </div>
      </AuthCard>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8)      { setError("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(password))  { setError("Password must contain an uppercase letter."); return; }
    if (!/[0-9]/.test(password))  { setError("Password must contain a number."); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { setError("Password must contain a special character."); return; }
    if (password !== confirm)     { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password, confirm }),
      });
      const data = await res.json();

      if (res.status === 410) {
        setError("This reset link has expired. Please request a new one.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Invalid or expired reset link.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
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
            Choose a new password
          </h1>
          <p className="text-sm text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            Must be at least 8 characters with uppercase, number, and symbol.
          </p>
        </div>

        <div className="bg-[var(--sz-card)] rounded-2xl border border-[var(--sz-border)] p-5 mb-5">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-4 gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--sz-saved-bg)] flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-[var(--sz-teal)]" />
                </div>
                <h2 className="text-base font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-newsreader)" }}>
                  Password updated!
                </h2>
                <p className="text-sm text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  Redirecting to login…
                </p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* New password */}
                <div className="relative">
                  <AuthInput
                    id="reset-password"
                    label="New password"
                    type={showPwd ? "text" : "password"}
                    placeholder="Min. 8 chars with uppercase, number, symbol"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-[34px] text-[var(--sz-ink-faint)] hover:text-[var(--sz-ink-mid)] transition-colors"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <PasswordStrength password={password} />
                </div>

                {/* Confirm */}
                <AuthInput
                  id="reset-confirm"
                  label="Confirm password"
                  type={showPwd ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />

                {error && (
                  <p className="text-sm text-[var(--sz-coral)] text-center" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                    {error}
                  </p>
                )}

                <button
                  id="reset-submit"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating…</>
                  ) : (
                    "Update password"
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AuthCard>
  );
}
