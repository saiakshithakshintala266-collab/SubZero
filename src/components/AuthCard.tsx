/**
 * Shared auth page wrapper — matches Stitch design:
 * - Mobile: full-screen cream, content starts near top
 * - Desktop: centered card (max-w-sm) with slight shadow
 */
import Link from "next/link";
import { Snowflake, ArrowLeft, HelpCircle } from "lucide-react";

interface AuthCardProps {
  children: React.ReactNode;
  showBack?: boolean;
  backHref?: string;
}

export default function AuthCard({ children, showBack, backHref = "/login" }: AuthCardProps) {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--sz-bg)]">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          {showBack ? (
            <Link href={backHref} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--sz-border)] transition-colors" aria-label="Go back">
              <ArrowLeft className="w-4 h-4 text-[var(--sz-ink-mid)]" />
            </Link>
          ) : (
            <div className="w-7 h-7 bg-[var(--sz-teal)] rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(26,107,87,0.3)]">
              <Snowflake className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
          )}
          <span
            className="text-base font-semibold text-[var(--sz-teal)]"
            style={{ fontFamily: "var(--font-newsreader)", fontStyle: "italic" }}
          >
            SubZero
          </span>
        </div>
        <button className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--sz-ink)] text-white text-xs font-bold hover:bg-[var(--sz-ink-mid)] transition-colors" aria-label="Help">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* ── Card area ── */}
      <div className="flex-1 flex flex-col md:items-center md:justify-center px-5 pt-6 pb-10">
        <div className="w-full md:max-w-sm">
          {children}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="px-5 pb-6 text-center">
        <p
          className="text-sm font-semibold text-[var(--sz-teal)] mb-1"
          style={{ fontFamily: "var(--font-newsreader)", fontStyle: "italic" }}
        >
          SubZero
        </p>
        <p className="text-[11px] text-[var(--sz-ink-light)] mb-2" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
          © 2024 SubZero Curator. All rights reserved.
        </p>
        <div className="flex items-center justify-center gap-4">
          {["Privacy Policy", "Terms of Service", "Security"].map((label) => (
            <button key={label} className="text-[11px] text-[var(--sz-ink-light)] hover:text-[var(--sz-teal)] transition-colors" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
              {label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}

/* ── Shared input ─────────────────────────────────────────────────────────── */
interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightLabel?: React.ReactNode;
}

export function AuthInput({ label, error, rightLabel, id, className, ...props }: AuthInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
          {label}
        </label>
        {rightLabel}
      </div>
      <input
        id={id}
        className={`
          w-full px-3.5 py-3 rounded-xl bg-white border text-[var(--sz-ink)] text-sm
          placeholder:text-[var(--sz-ink-faint)] outline-none transition-all duration-150
          focus:border-[var(--sz-teal)] focus:ring-2 focus:ring-[rgba(26,107,87,0.15)]
          ${error ? "border-[var(--sz-coral)]" : "border-[var(--sz-border)]"}
          ${className ?? ""}
        `}
        style={{ fontFamily: "var(--font-plus-jakarta)" }}
        {...props}
      />
      {error && (
        <p className="text-xs text-[var(--sz-coral)] mt-0.5" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Google button ────────────────────────────────────────────────────────── */
export function GoogleButton({ onClick, loading }: { onClick?: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-[var(--sz-border)] text-[var(--sz-ink)] text-sm font-semibold hover:border-[var(--sz-ink-faint)] hover:shadow-sm transition-all duration-150 disabled:opacity-60"
      style={{ fontFamily: "var(--font-plus-jakarta)" }}
    >
      {/* Google G SVG */}
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
      Continue with Google
    </button>
  );
}

/* ── Divider ─────────────────────────────────────────────────────────────── */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-[var(--sz-border)]" />
      <span className="text-[11px] text-[var(--sz-ink-light)] font-semibold uppercase tracking-widest" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
        or email
      </span>
      <div className="flex-1 h-px bg-[var(--sz-border)]" />
    </div>
  );
}
