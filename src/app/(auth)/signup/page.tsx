"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { ChevronRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import AuthCard, { AuthInput, GoogleButton, OrDivider } from "@/components/AuthCard";

// ── Password strength indicator ────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters",  pass: password.length >= 8 },
    { label: "Uppercase",      pass: /[A-Z]/.test(password) },
    { label: "Number",         pass: /[0-9]/.test(password) },
    { label: "Special char",   pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["bg-[var(--sz-coral)]", "bg-orange-400", "bg-yellow-400", "bg-[var(--sz-teal)]"];

  if (!password) return null;
  return (
    <div className="space-y-1.5 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < score ? colors[score - 1] : "bg-[var(--sz-border)]"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`text-[10px] ${c.pass ? "text-[var(--sz-teal)]" : "text-[var(--sz-ink-faint)]"}`}
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            {c.pass ? "✓" : "·"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  /** Client-side UX validation (mirrors server Zod schema) */
  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = "Name must be at least 2 characters.";
    if (!form.email.includes("@"))
      e.email = "Enter a valid email address.";
    if (form.password.length < 8)
      e.password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(form.password))
      e.password = "Password must contain at least one uppercase letter.";
    else if (!/[0-9]/.test(form.password))
      e.password = "Password must contain at least one number.";
    else if (!/[^A-Za-z0-9]/.test(form.password))
      e.password = "Password must contain at least one special character.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError("");
    try {
      // 1. Register via API
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.status === 429) {
        setServerError(data.error ?? "Too many attempts. Please try again later.");
        return;
      }
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // 2. Sign in with credentials so session is live
      const result = await signIn("credentials", {
        email:    form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) {
        setServerError("Account created — please check your email to verify, then log in.");
        router.push("/verify-email?email=" + encodeURIComponent(form.email));
        return;
      }

      // 3. Redirect to verify-email
      router.push("/verify-email?email=" + encodeURIComponent(form.email));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <AuthCard>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Hero text */}
        <div className="mb-7">
          <h1
            className="text-[clamp(1.85rem,7vw,2.5rem)] font-bold italic leading-[1.1] text-[var(--sz-ink)] mb-3"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Start cancelling subscriptions in 60 seconds
          </h1>
          <p className="text-sm text-[var(--sz-ink-mid)] leading-relaxed" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            Take control of your digital recurring spend with our concierge curator.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[var(--sz-card)] rounded-2xl border border-[var(--sz-border)] p-5 mb-4">
          <GoogleButton onClick={handleGoogle} loading={googleLoading} />
          <div className="mt-4 mb-4"><OrDivider /></div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AuthInput
              id="signup-name"
              label="Full name"
              type="text"
              placeholder="Jane Smith"
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <AuthInput
              id="signup-email"
              label="Email address"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />

            {/* Password with show/hide toggle */}
            <div className="space-y-1">
              <div className="relative">
                <AuthInput
                  id="signup-password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 chars with uppercase, number, symbol"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  error={errors.password}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-[var(--sz-ink-faint)] hover:text-[var(--sz-ink-mid)] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            {serverError && (
              <p className="text-sm text-[var(--sz-coral)] text-center" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                {serverError}
              </p>
            )}

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-1"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account…</>
              ) : (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-center text-sm text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[var(--sz-teal)] hover:underline">
                Log In
              </Link>
            </p>
          </form>
        </div>

        {/* Security badge */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--sz-teal-light)] border border-[rgba(26,107,87,0.15)]">
          <div className="w-8 h-8 rounded-full bg-[var(--sz-salmon)] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Bank-grade security</p>
            <p className="text-xs text-[var(--sz-ink-light)] mt-0.5" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
              We use 256-bit encryption to keep your data curated and secure.
            </p>
          </div>
        </div>
      </motion.div>
    </AuthCard>
  );
}
