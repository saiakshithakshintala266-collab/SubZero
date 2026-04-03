"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import AuthCard from "@/components/AuthCard";

const CODE_LENGTH = 6;

export default function VerifyEmailPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const emailParam   = searchParams.get("email")  ?? "j***@example.com";
  const tokenParam   = searchParams.get("token")  ?? "";
  const noticeParam  = searchParams.get("notice") ?? "";

  const [digits, setDigits]   = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resent, setResent]   = useState(false);
  const [resentMsg, setResentMsg] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError]     = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // If a token was passed in the URL (magic link from email) auto-verify
  useEffect(() => {
    if (tokenParam.length >= 64) {
      verifyToken(tokenParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam]);

  async function verifyToken(token: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token }),
      });
      const data = await res.json();

      if (res.status === 410) {
        setError("Verification link has expired. Please request a new one.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Invalid verification code.");
        return;
      }
      setVerified(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(index: number, value: string) {
    const d = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = d;
    setDigits(next);
    setError("");
    if (d && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (paste.length) {
      setDigits([...paste.split(""), ...Array(CODE_LENGTH - paste.length).fill("")]);
      inputs.current[Math.min(paste.length, CODE_LENGTH - 1)]?.focus();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < CODE_LENGTH) { setError("Enter all 6 digits."); return; }
    // In production: OTP codes would be validated server-side
    // For now, the OTP acts as a demo path — the real flow uses the email link token
    await verifyToken(code);
  }

  async function handleResend() {
    setResent(false);
    setResentMsg("");
    const res = await fetch("/api/auth/verify-email", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "resend", email: emailParam }),
    });
    const data = await res.json();

    if (res.status === 429) {
      setResentMsg(data.error ?? "Too many requests. Please wait before resending.");
      return;
    }
    setResent(true);
    setDigits(Array(CODE_LENGTH).fill(""));
    setResentMsg("A new verification link has been sent to your email.");
  }

  return (
    <AuthCard showBack backHref="/signup">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="h-10" />

        {noticeParam && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 mb-4">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
            <p className="text-sm text-orange-700" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
              {noticeParam}
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {verified ? (
            <motion.div
              key="verified"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center gap-4 py-8"
            >
              <div className="w-16 h-16 rounded-full bg-[var(--sz-saved-bg)] flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-[var(--sz-teal)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-newsreader)" }}>
                Email verified!
              </h2>
              <p className="text-sm text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                Redirecting to your dashboard…
              </p>
            </motion.div>
          ) : (
            <motion.div key="form">
              <div className="mb-7">
                <h1
                  className="text-[clamp(1.75rem,7vw,2.5rem)] font-bold italic text-[var(--sz-ink)] mb-3"
                  style={{ fontFamily: "var(--font-newsreader)" }}
                >
                  Check your email
                </h1>
                <p className="text-sm text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  We&apos;ve sent a verification link to{" "}
                  <span
                    className="font-semibold text-[var(--sz-teal)]"
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    {emailParam}
                  </span>
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-5">
                <p className="text-xs text-[var(--sz-ink-light)] text-center" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  Or enter the 6-digit code from the email:
                </p>

                {/* OTP digit boxes */}
                <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputs.current[i] = el; }}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleDigit(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      aria-label={`Digit ${i + 1}`}
                      className={`
                        w-11 text-center text-lg font-bold rounded-xl border-2 bg-white
                        outline-none transition-all duration-150 text-[var(--sz-ink)] py-3
                        focus:border-[var(--sz-teal)] focus:ring-2 focus:ring-[rgba(26,107,87,0.15)]
                        ${d ? "border-[var(--sz-teal)]" : "border-[var(--sz-border)]"}
                        ${error ? "border-[var(--sz-coral)]" : ""}
                      `}
                      style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-[var(--sz-coral)] text-center" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                    {error}
                  </p>
                )}

                {resentMsg && (
                  <p
                    className={`text-sm text-center ${resent ? "text-[var(--sz-teal)]" : "text-orange-500"}`}
                    style={{ fontFamily: "var(--font-plus-jakarta)" }}
                  >
                    {resentMsg}
                  </p>
                )}

                <button
                  id="verify-submit"
                  type="submit"
                  disabled={loading || digits.join("").length < CODE_LENGTH}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying…</>
                  ) : (
                    "Verify email"
                  )}
                </button>

                <p className="text-center text-sm text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  Didn&apos;t receive the email?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    className="font-semibold text-[var(--sz-teal)] hover:underline"
                  >
                    Resend code
                  </button>
                </p>

                <p className="text-center text-sm text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  Wrong account?{" "}
                  <button
                    type="button"
                    onClick={() => signOut({ redirectTo: "/login" })}
                    className="font-semibold text-[var(--sz-teal)] hover:underline"
                  >
                    Sign in with a different account
                  </button>
                </p>

                <div className="h-px bg-[var(--sz-border)]" />
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AuthCard>
  );
}
