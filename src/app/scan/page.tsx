"use client";

import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Snowflake,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Mail,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import PlaidConnectButton from "@/components/PlaidConnectButton";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "connect" | "scanning" | "done" | "error";

interface ScanResult {
  detected:      number;
  saved:         number;
  bankAccounts:  number;
  gmailScanned:  boolean;
  subscriptions: Array<{
    name:         string;
    amount:       number;
    billingCycle: string;
    source:       string;
    confidence:   string;
  }>;
}

// ── Live log lines shown during scanning ──────────────────────────────────────

const SCAN_LOGS = [
  { tag: "init",  msg: "Establishing secure connection to bank…"              },
  { tag: "analy", msg: "Fetching 90-day transaction history…"                 },
  { tag: "analy", msg: "Scanning Gmail for subscription receipts…"            },
  { tag: "class", msg: "Running rule-based subscription matching…"            },
  { tag: "prime", msg: "Sending unknown merchants to AI classifier…"          },
  { tag: "class", msg: "Cross-referencing bank + email signals…"              },
  { tag: "ident", msg: "Building subscription report…"                        },
] as const;

type LogTag = "init" | "analy" | "class" | "prime" | "ident";

const TAG_COLOR: Record<LogTag, string> = {
  init:  "#8A8A8A",
  analy: "#8A8A8A",
  class: "#2A8A70",
  prime: "#E07B3A",
  ident: "#2A8A70",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter();

  const [step, setStep]         = useState<Step>("connect");
  const [bankName, setBankName] = useState<string>("");
  const [logIdx, setLogIdx]     = useState(0);
  const [result, setResult]     = useState<ScanResult | null>(null);
  const [errMsg, setErrMsg]     = useState<string>("");

  // ── Advance log lines during scan ──────────────────────────────────
  useEffect(() => {
    if (step !== "scanning" || logIdx >= SCAN_LOGS.length) return;
    const t = setTimeout(() => setLogIdx((v) => v + 1), 900);
    return () => clearTimeout(t);
  }, [step, logIdx]);

  // ── Auto-redirect to dashboard 2s after completion ─────────────────
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(() => router.push("/dashboard"), 3000);
    return () => clearTimeout(t);
  }, [step, router]);

  // ── Handlers ───────────────────────────────────────────────────────

  async function startScan(institution: string) {
    setBankName(institution);
    setStep("scanning");
    setLogIdx(0);

    try {
      const res  = await fetch("/api/scan/analyze", { method: "POST" });
      const data = await res.json() as ScanResult;

      if (!res.ok) throw new Error("Scan failed");

      setResult(data);
      setStep("done");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Scan failed unexpectedly");
      setStep("error");
    }
  }

  function handleError(msg: string) {
    setErrMsg(msg);
    setStep("error");
  }

  const pct = Math.round((logIdx / SCAN_LOGS.length) * 100);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--sz-bg)] flex flex-col">
      {/* Header */}
      <header className="flex items-center px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[var(--sz-teal)] rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(26,107,87,0.3)]">
            <Snowflake className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            SubZero
          </span>
        </div>
      </header>

      <div className="px-5 pt-8 pb-10 flex flex-col gap-8 max-w-lg mx-auto w-full">

        {/* ── STEP: CONNECT ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {step === "connect" && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h1
                  className="text-[clamp(2.5rem,9vw,3.5rem)] font-bold uppercase leading-[0.95] text-[var(--sz-ink)]"
                  style={{ fontFamily: "var(--font-newsreader)" }}
                >
                  CONNECT<br />YOUR DATA
                </h1>
                <p className="mt-3 text-sm text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  Link your bank account to detect subscriptions automatically.
                  Gmail is connected via Google sign-in.
                </p>
              </div>

              {/* Source cards */}
              <div className="flex flex-col gap-3">
                {/* Bank card */}
                <div className="bg-[var(--sz-card)] border border-[var(--sz-border)] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-[var(--sz-teal)] flex items-center justify-center">
                      <Building2 className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                        Bank Account
                      </p>
                      <p className="text-xs text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                        Powered by Plaid — 12,000+ banks
                      </p>
                    </div>
                  </div>
                  <PlaidConnectButton
                    onSuccess={startScan}
                    onError={handleError}
                    className="btn-primary w-full text-sm"
                    label="Connect Bank Account"
                  />
                </div>

                {/* Gmail card (always connected via Google OAuth) */}
                <div className="bg-[var(--sz-card)] border border-[var(--sz-border)] rounded-2xl p-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EA4335] flex items-center justify-center">
                    <Mail className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                      Gmail
                    </p>
                    <p className="text-xs text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                      Connected via Google sign-in
                    </p>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--sz-saved-bg)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sz-teal)]" />
                    <span className="text-xs font-semibold text-[var(--sz-teal)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                      Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Skip */}
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-1 text-sm text-[var(--sz-ink-light)] hover:text-[var(--sz-ink)] transition-colors self-center"
                style={{ fontFamily: "var(--font-plus-jakarta)" }}
              >
                Skip to dashboard <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--sz-ink-light)]" />
                <p className="text-[11px] text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  Bank credentials never touch SubZero servers — secured by Plaid.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── STEP: SCANNING ──────────────────────────────────── */}
          {step === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h1
                  className="text-[clamp(2.5rem,9vw,3.5rem)] font-bold uppercase leading-[0.95] text-[var(--sz-ink)]"
                  style={{ fontFamily: "var(--font-newsreader)" }}
                >
                  SCANNING<br />YOUR DATA
                </h1>
                <p className="mt-3 text-sm text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  AI is analyzing transactions from <span className="font-semibold text-[var(--sz-ink)]">{bankName}</span> and your Gmail.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "ANALYSIS DEPTH", value: `${pct}%`, teal: true },
                  { label: "SOURCES",         value: "2",      teal: false },
                ].map((s) => (
                  <div key={s.label} className="bg-[var(--sz-card)] border border-[var(--sz-border)] rounded-2xl px-3 py-4 text-center">
                    <p className="text-[10px] text-[var(--sz-ink-light)] uppercase tracking-[0.06em] font-semibold mb-2" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                      {s.label}
                    </p>
                    <p className={`text-2xl font-bold ${s.teal ? "text-[var(--sz-teal)]" : "text-[var(--sz-ink)]"}`} style={{ fontFamily: "var(--font-newsreader)" }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Terminal */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "#1A1A1A" }}>
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C5372C]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E07B3A]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1A6B57]" />
                  <span className="ml-3 text-[10px] text-white/40" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                    LIVE_ANALYSIS_STREAM v2.8.4
                  </span>
                </div>
                <div className="p-4 space-y-2.5 min-h-[200px]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                  <AnimatePresence>
                    {SCAN_LOGS.slice(0, logIdx).map((line, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                        className="flex gap-3 text-[11px] leading-relaxed"
                      >
                        <span className="text-white/30 shrink-0 text-[10px] font-bold uppercase" style={{ color: TAG_COLOR[line.tag as LogTag] }}>
                          {line.tag}
                        </span>
                        <span className="text-white/70">{line.msg}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div className="flex gap-2 items-center text-[11px]">
                    <Loader2 className="w-3 h-3 text-[var(--sz-teal)] animate-spin" />
                    <span className="text-white/40" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Processing…</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP: DONE ──────────────────────────────────────── */}
          {step === "done" && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6 items-center text-center"
            >
              <div className="w-20 h-20 rounded-full bg-[var(--sz-saved-bg)] flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-[var(--sz-teal)]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-newsreader)" }}>
                  Scan Complete
                </h1>
                <p className="mt-2 text-sm text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  Found <span className="font-bold text-[var(--sz-teal)]">{result.detected} subscription{result.detected !== 1 ? "s" : ""}</span>
                  {result.gmailScanned ? " across bank and Gmail." : " from your bank."}
                </p>
              </div>

              {/* Detected list */}
              {result.subscriptions.length > 0 && (
                <div className="w-full rounded-2xl border border-[var(--sz-border)] bg-[var(--sz-card)] overflow-hidden">
                  {result.subscriptions.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-[var(--sz-border)] last:border-0">
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>{s.name}</p>
                        <p className="text-xs text-[var(--sz-ink-light)] capitalize" style={{ fontFamily: "var(--font-plus-jakarta)" }}>{s.source} · {s.billingCycle}</p>
                      </div>
                      <p className="text-sm font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                        {s.amount > 0 ? `$${s.amount.toFixed(2)}` : "—"}
                      </p>
                    </div>
                  ))}
                  {result.subscriptions.length > 5 && (
                    <div className="px-4 py-3 text-center text-xs text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                      +{result.subscriptions.length - 5} more on the dashboard
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                Redirecting to dashboard in 3 seconds…
              </p>
              <button onClick={() => router.push("/dashboard")} className="btn-primary">
                Go to Dashboard <ChevronRight className="w-4 h-4 inline" />
              </button>
            </motion.div>
          )}

          {/* ── STEP: ERROR ──────────────────────────────────────── */}
          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6 items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-newsreader)" }}>
                  Something went wrong
                </h2>
                <p className="mt-2 text-sm text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  {errMsg || "An unexpected error occurred."}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("connect")} className="btn-primary">
                  Try Again
                </button>
                <button onClick={() => router.push("/dashboard")} className="text-sm text-[var(--sz-ink-light)] hover:text-[var(--sz-ink)] transition-colors" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  Skip to Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
