"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Snowflake, ShieldCheck, Pause, ChevronRight } from "lucide-react";

type LogType = "init" | "analy" | "class" | "prime" | "ident";

interface LogLine {
  time: string;
  tag:  LogType;
  msg:  string;
}

const TAG_COLOR: Record<LogType, string> = {
  init:  "#8A8A8A",
  analy: "#8A8A8A",
  class: "#2A8A70",
  prime: "#E07B3A",
  ident: "#2A8A70",
};

const LOG_LINES: LogLine[] = [
  { time: "14:21:55", tag: "init",  msg: "Initializing connection with Chase Bank API…"              },
  { time: "14:22:09", tag: "analy", msg: "Scanning metadata for 1,847 receipts…"                    },
  { time: "14:22:32", tag: "class", msg: "Analyzing semantic patterns in 'Marketing Cloud Services'…"},
  { time: "14:22:18", tag: "prime", msg: "Cross-referencing historical transaction data with known vendor signatures…" },
  { time: "14:22:51", tag: "ident", msg: "Identified: Netflix Premium · $22.99/mo"                  },
  { time: "14:23:04", tag: "class", msg: "Analyzing: Adobe Creative Cloud · $54.99/mo"              },
  { time: "14:23:17", tag: "prime", msg: "FLAGGED: Equinox Membership · last check-in 42 days ago"  },
  { time: "14:23:28", tag: "ident", msg: "Identified: NY Times Digital · $17.00/mo"                  },
  { time: "14:23:40", tag: "class", msg: "Scan complete — building report…"                           },
];

export default function ScanPage() {
  const router = useRouter();
  const [lines, setLines] = useState(0);
  const [paused, setPaused] = useState(false);

  // Derive done from lines — no setState needed, avoids react-hooks/set-state-in-effect
  const done = lines >= LOG_LINES.length;

  // Advance log lines every 380ms while not paused
  useEffect(() => {
    if (paused || done) return;
    const t = setTimeout(() => setLines((v) => v + 1), 380);
    return () => clearTimeout(t);
  }, [lines, paused, done]);

  // Redirect to dashboard 1.4s after scan completes
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.push("/dashboard"), 1400);
    return () => clearTimeout(t);
  }, [done, router]);

  const pct = Math.round((lines / LOG_LINES.length) * 100);
  const detected = LOG_LINES.slice(0, lines).filter((l) => l.tag === "ident").length;
  const sources = 4;

  return (
    <main className="min-h-screen bg-[var(--sz-bg)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[var(--sz-teal)] rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(26,107,87,0.3)]">
            <Snowflake className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            SubZero
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[var(--sz-salmon)] flex items-center justify-center text-white text-xs font-bold">U</div>
      </header>

      <div className="px-5 pt-8 pb-6 flex flex-col gap-8 max-w-lg mx-auto w-full">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1
            className="text-[clamp(2.5rem,9vw,3.5rem)] font-bold uppercase leading-[0.95] text-[var(--sz-ink)]"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            SCANNING<br />YOUR DATA
          </h1>
          <p className="mt-3 text-sm text-[var(--sz-ink-mid)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            AI is analyzing your transactions and emails in real-time
          </p>
        </motion.div>

        {/* Stats: 3 column */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "SUBSCRIPTIONS DETECTED", value: String(detected), accent: detected > 0 ? "teal" : "none" },
            { label: "SOURCES LINKED",          value: String(sources)             },
            { label: "ANALYSIS DEPTH",          value: `${pct}%`, accent: done ? "teal" : "none" },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--sz-card)] border border-[var(--sz-border)] rounded-2xl px-3 py-4 text-center">
              <p
                className="text-[10px] text-[var(--sz-ink-light)] uppercase tracking-[0.06em] font-semibold mb-2"
                style={{ fontFamily: "var(--font-plus-jakarta)" }}
              >
                {s.label}
              </p>
              <p
                className={`text-2xl font-bold ${s.accent === "teal" ? "text-[var(--sz-teal)]" : "text-[var(--sz-ink)]"}`}
                style={{ fontFamily: "var(--font-newsreader)" }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Dark terminal block — matches Stitch design exactly */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "#1A1A1A" }}
        >
          {/* Terminal chrome */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C5372C]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#E07B3A]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#1A6B57]" />
            <span
              className="ml-3 text-[10px] text-white/40"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              LIVE_ANALYSIS_STREAM v2.8.4
            </span>
          </div>

          {/* Log lines */}
          <div className="p-4 space-y-2.5 min-h-[220px]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            <AnimatePresence>
              {LOG_LINES.slice(0, lines).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex gap-3 text-[11px] leading-relaxed"
                >
                  <span className="text-white/30 shrink-0">{line.time}</span>
                  <span
                    className="shrink-0 font-bold uppercase text-[10px]"
                    style={{ color: TAG_COLOR[line.tag] }}
                  >
                    {line.tag}
                  </span>
                  <span className="text-white/70">{line.msg}</span>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Cursor */}
            {!done && !paused && (
              <div className="flex gap-3 text-[11px]">
                <span className="text-white/20">████████</span>
                <span className="text-[var(--sz-teal-mid)] animate-term-blink">▌</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Pause/Resume button — matches Stitch "Pause Analysis" pill */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.52 }}
          className="flex flex-col items-center gap-4"
        >
          <button
            id="scan-pause-btn"
            onClick={() => setPaused((p) => !p)}
            className="btn-primary flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            {paused ? "Resume Analysis" : "Pause Analysis"}
          </button>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--sz-ink-light)]" />
            <p className="text-[11px] text-[var(--sz-ink-light)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
              Your data is end-to-end encrypted and never stored on public servers.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1 text-sm text-[var(--sz-ink-light)] hover:text-[var(--sz-ink)] transition-colors"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            Skip to dashboard <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </main>
  );
}
