"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Snowflake, Landmark, Eye, GitMerge, ShieldCheck, ChevronRight } from "lucide-react";

const STATS = [
  { value: "$284", label: "Avg. Found"    },
  { value: "4–7",  label: "Hidden Subs"  },
  { value: "73%",  label: "Success Rate" },
  { value: "$133", label: "Saved Monthly"},
];

const METHODS = [
  { id: "bank",   icon: Landmark, title: "Bank account",  sub: "Secure connection via Plaid",        recommended: false },
  { id: "email",  icon: Eye,      title: "Email receipts", sub: "Scan Gmail and Outlook",             recommended: false },
  { id: "hybrid", icon: GitMerge, title: "Hybrid audit",   sub: "Maximum discovery (Recommended)",   recommended: true  },
];

const stagger = (i: number) => ({ delay: 0.08 + i * 0.07, duration: 0.35, ease: [0.4, 0, 0.2, 1] as const });

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("bank");
  const [loading, setLoading] = useState(false);

  function connect() {
    setLoading(true);
    setTimeout(() => router.push("/scan"), 900);
  }

  return (
    <main className="min-h-screen bg-[var(--sz-bg)] flex flex-col">
      {/* ── Top nav (matches Stitch header) ── */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[var(--sz-teal)] rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(26,107,87,0.3)]">
            <Snowflake className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-base font-bold text-[var(--sz-ink)]"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            SubZero
          </span>
        </div>
        {/* Avatar placeholder matching Stitch */}
        <div className="w-8 h-8 rounded-full bg-[var(--sz-salmon)] flex items-center justify-center text-white text-xs font-bold">
          U
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="px-5 pt-8 pb-6">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(0)}
          className="text-[clamp(2.5rem,9vw,3.5rem)] leading-[1.05] font-bold italic text-[var(--sz-ink)]"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          Find every<br />forgotten<br />subscription.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(1)}
          className="mt-4 text-[var(--sz-ink-mid)] text-sm leading-relaxed max-w-xs"
          style={{ fontFamily: "var(--font-plus-jakarta)" }}
        >
          We scan your accounts and receipts to uncover hidden costs. Simple,
          safe, and entirely conversational.
        </motion.p>
      </section>

      {/* ── Stats 2×2 grid ── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stagger(2)}
        className="px-5 pb-7"
      >
        <div className="grid grid-cols-2 gap-3">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              className="bg-[var(--sz-card)] rounded-2xl px-4 py-4 border border-[var(--sz-border)]"
            >
              <p
                className="text-2xl font-bold text-[var(--sz-ink)]"
                style={{ fontFamily: "var(--font-newsreader)" }}
              >
                {s.value}
              </p>
              <p
                className="text-[11px] text-[var(--sz-ink-light)] uppercase tracking-[0.06em] mt-1 font-semibold"
                style={{ fontFamily: "var(--font-plus-jakarta)" }}
              >
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Choose connection ── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stagger(3)}
        className="px-5 pb-5"
      >
        <h2
          className="text-xs text-[var(--sz-ink-light)] font-semibold uppercase tracking-[0.06em] mb-3"
          style={{ fontFamily: "var(--font-plus-jakarta)" }}
        >
          Choose your connection
        </h2>
        <div className="space-y-2.5">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                id={`method-${m.id}`}
                onClick={() => setSelected(m.id)}
                className={`
                  w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left border transition-all duration-150
                  ${isSelected
                    ? "bg-[var(--sz-card)] border-[var(--sz-teal)] shadow-sm"
                    : "bg-[var(--sz-card)] border-[var(--sz-border)] hover:border-[var(--sz-ink-faint)]"
                  }
                `}
              >
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150 ${
                    isSelected ? "bg-[var(--sz-teal)]" : "bg-[var(--sz-bg)]"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isSelected ? "text-white" : "text-[var(--sz-ink-mid)]"}`}
                    strokeWidth={2}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold text-[var(--sz-ink)]"
                    style={{ fontFamily: "var(--font-plus-jakarta)" }}
                  >
                    {m.title}
                  </p>
                  <p
                    className="text-xs text-[var(--sz-ink-light)] mt-0.5"
                    style={{ fontFamily: "var(--font-plus-jakarta)" }}
                  >
                    {m.sub}
                  </p>
                </div>

                {/* Radio */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                    isSelected ? "border-[var(--sz-teal)] bg-[var(--sz-teal)]" : "border-[var(--sz-ink-faint)]"
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stagger(4)}
        className="px-5 pb-4"
      >
        <button
          id="onboarding-cta"
          onClick={connect}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Connecting…</>
          ) : (
            <>FIND MY SUBSCRIPTIONS <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </motion.div>

      {/* ── Legal ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="px-5 pb-6 space-y-3"
      >
        <p
          className="text-center text-[11px] text-[var(--sz-ink-light)] leading-relaxed"
          style={{ fontFamily: "var(--font-plus-jakarta)" }}
        >
          By continuing, you agree to our{" "}
          <span className="underline cursor-pointer">Terms of Service</span> and{" "}
          <span className="underline cursor-pointer">Privacy Policy</span>.{" "}
          Your data is encrypted and never sold.
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--sz-ink-light)]" />
          <p
            className="text-[11px] text-[var(--sz-ink-light)]"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            Bank-level 256-bit encryption
          </p>
        </div>
      </motion.div>

      {/* ── Bottom tab bar (shown on onboarding per Stitch design) ── */}
      <div className="sticky bottom-0 bg-[var(--sz-surface)] border-t border-[var(--sz-border)] flex items-center justify-around py-2 px-4 md:hidden">
        {[
          { label: "Subscriptions", active: true },
          { label: "Exchange",      active: false },
          { label: "Settings",      active: false },
        ].map((tab) => (
          <div key={tab.label} className="flex flex-col items-center gap-1 py-1">
            <div className={`w-6 h-1 rounded-full ${tab.active ? "bg-[var(--sz-teal)]" : "bg-transparent"}`} />
            <span
              className={`text-[10px] font-semibold ${tab.active ? "text-[var(--sz-teal)]" : "text-[var(--sz-ink-light)]"}`}
              style={{ fontFamily: "var(--font-plus-jakarta)" }}
            >
              {tab.label}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
