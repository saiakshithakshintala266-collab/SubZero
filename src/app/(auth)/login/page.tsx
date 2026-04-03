"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import AuthCard, { AuthInput, GoogleButton } from "@/components/AuthCard";

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/dashboard";

  const [form, setForm]     = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError]   = useState("");
  const [rateLimited, setRateLimited]   = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.email.includes("@")) e.email = "Enter a valid email address.";
    if (!form.password)            e.password = "Password is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError("");
    setRateLimited(false);
    try {
      const result = await signIn("credentials", {
        email:    form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth wraps the error — check for rate limit signal
        if (result.error.includes("429") || result.error.toLowerCase().includes("too many")) {
          setRateLimited(true);
          setServerError("Too many sign-in attempts. Please wait before trying again.");
        } else {
          // Generic — never reveal which field is wrong
          setServerError("Invalid email or password.");
        }
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
  }

  return (
    <AuthCard>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Gradient orb — matches Stitch design */}
        <div
          className="w-28 h-28 rounded-full bg-gradient-to-br from-[var(--sz-salmon)] to-[var(--sz-coral-dim)] opacity-30 blur-2xl mx-auto mb-4 -mt-4"
          aria-hidden
        />

        <div className="text-center mb-7">
          <h1
            className="text-[clamp(2rem,7vw,2.75rem)] font-bold italic text-[var(--sz-ink)]"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Welcome back
          </h1>
          <p className="text-sm text-[var(--sz-ink-mid)] mt-2" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            Enter your credentials to access your curated portfolio.
          </p>
        </div>

        <div className="bg-[var(--sz-card)] rounded-2xl border border-[var(--sz-border)] p-5 mb-5">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AuthInput
              id="login-email"
              label="Email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />

            {/* Password + show/hide */}
            <div className="relative">
              <AuthInput
                id="login-password"
                label="Password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
                className="pr-10"
                rightLabel={
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[var(--sz-teal)] hover:underline"
                    tabIndex={-1}
                    style={{ fontFamily: "var(--font-plus-jakarta)" }}
                  >
                    Forgot password?
                  </Link>
                }
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-[34px] text-[var(--sz-ink-faint)] hover:text-[var(--sz-ink-mid)] transition-colors"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {serverError && (
              <p
                className={`text-sm text-center ${rateLimited ? "text-orange-500" : "text-[var(--sz-coral)]"}`}
                style={{ fontFamily: "var(--font-plus-jakarta)" }}
              >
                {serverError}
              </p>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading || rateLimited}
              className="btn-primary w-full"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
              ) : (
                "Log In"
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--sz-border)]" />
              <span className="text-[11px] text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>or</span>
              <div className="flex-1 h-px bg-[var(--sz-border)]" />
            </div>

            <GoogleButton onClick={handleGoogle} loading={googleLoading} />
          </form>
        </div>

        <p className="text-center text-sm text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-[var(--sz-teal)] hover:underline">
            Sign Up
          </Link>
        </p>

        {/* Dev hint — shows ONLY in development, not production */}
        {process.env.NODE_ENV !== "production" && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-[var(--sz-teal-light)] border border-[rgba(26,107,87,0.15)] text-center">
            <p className="text-[10px] text-[var(--sz-teal)] font-bold uppercase tracking-wider mb-1" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
              Dev credentials
            </p>
            <p className="text-xs text-[var(--sz-teal)]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
              demo@subzero.ai · D3m0User!
            </p>
          </div>
        )}
      </motion.div>
    </AuthCard>
  );
}
