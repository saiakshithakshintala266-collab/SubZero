"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Search, Filter } from "lucide-react";

interface Tx {
  id: string; merchant: string; date: string;
  amount: number; type: "debit" | "credit"; flagged?: boolean;
}

const TXS: Tx[] = [
  { id: "t1",  merchant: "Netflix Premium",      date: "Oct 01", amount: 22.99,  type: "debit",  flagged: true  },
  { id: "t2",  merchant: "Adobe Creative Cloud", date: "Oct 01", amount: 54.99,  type: "debit"                  },
  { id: "t3",  merchant: "Clarity Refund",        date: "Sep 30", amount: 14.50,  type: "credit"                 },
  { id: "t4",  merchant: "ChatGPT Plus",          date: "Sep 28", amount: 20.00,  type: "debit"                  },
  { id: "t5",  merchant: "NY Times Digital",      date: "Sep 25", amount: 4.88,   type: "debit"                  },
  { id: "t6",  merchant: "Equinox Membership",    date: "Sep 15", amount: 285.00, type: "debit",  flagged: true  },
  { id: "t7",  merchant: "Spotify Premium",       date: "Sep 12", amount: 11.99,  type: "debit"                  },
  { id: "t8",  merchant: "Netflix Premium",       date: "Sep 01", amount: 22.99,  type: "debit",  flagged: true  },
  { id: "t9",  merchant: "Amazon Prime",          date: "Aug 28", amount: 14.99,  type: "debit"                  },
];

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "flagged">("all");

  const filtered = TXS.filter((t) => {
    const q = !query || t.merchant.toLowerCase().includes(query.toLowerCase());
    const f = filter === "all" || (filter === "flagged" && t.flagged);
    return q && f;
  });

  const totalSpend = TXS.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const flaggedCount = TXS.filter(t => t.flagged).length;

  return (
    <div className="min-h-screen bg-[var(--sz-bg)] px-5 pt-6 pb-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold italic text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-newsreader)" }}>Exchange</h1>
        <p className="text-sm text-[var(--sz-ink-light)] mt-1" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
          All detected subscription transactions
        </p>
      </motion.div>

      {/* Summary cards */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[var(--sz-card)] border border-[var(--sz-border)] rounded-2xl px-4 py-4">
          <p className="text-[10px] text-[var(--sz-ink-light)] uppercase tracking-[0.06em] font-semibold mb-1" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Total Spend</p>
          <p className="text-2xl font-bold text-[var(--sz-teal)]" style={{ fontFamily: "var(--font-newsreader)" }}>
            <span className="text-sm align-super">$</span>{totalSpend.toFixed(2)}
          </p>
          <p className="text-[10px] text-[var(--sz-ink-light)] mt-0.5" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Last 60 days</p>
        </div>
        <div className="bg-[var(--sz-coral-dim)] border border-[rgba(197,55,44,0.2)] rounded-2xl px-4 py-4">
          <p className="text-[10px] text-[var(--sz-coral)] uppercase tracking-[0.06em] font-semibold mb-1" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Flagged</p>
          <p className="text-2xl font-bold text-[var(--sz-coral)]" style={{ fontFamily: "var(--font-newsreader)" }}>{flaggedCount}</p>
          <p className="text-[10px] text-[var(--sz-coral)] mt-0.5 opacity-70" style={{ fontFamily: "var(--font-plus-jakarta)" }}>transactions</p>
        </div>
      </motion.div>

      {/* Search + filter */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--sz-ink-light)]" />
          <input
            id="tx-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchants…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--sz-card)] border border-[var(--sz-border)] text-[var(--sz-ink)] text-sm placeholder:text-[var(--sz-ink-light)] outline-none focus:border-[var(--sz-teal)] focus:ring-1 focus:ring-[var(--sz-teal)] transition-all"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          />
        </div>
        <button
          id="tx-filter-btn"
          onClick={() => setFilter(f => f === "all" ? "flagged" : "all")}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150 ${
            filter === "flagged"
              ? "bg-[var(--sz-coral-dim)] border-[rgba(197,55,44,0.3)] text-[var(--sz-coral)]"
              : "bg-[var(--sz-card)] border-[var(--sz-border)] text-[var(--sz-ink-mid)]"
          }`}
          style={{ fontFamily: "var(--font-plus-jakarta)" }}
        >
          <Filter className="w-3.5 h-3.5" />
          {filter === "flagged" ? "Flagged" : "All"}
        </button>
      </motion.div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((tx, i) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 + 0.18 }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-150 ${
              tx.flagged
                ? "bg-[var(--sz-coral-dim)] border-[rgba(197,55,44,0.2)]"
                : "bg-[var(--sz-card)] border-[var(--sz-border)] hover:border-[var(--sz-ink-faint)]"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              tx.type === "credit" ? "bg-[var(--sz-saved-bg)]" : tx.flagged ? "bg-[rgba(197,55,44,0.12)]" : "bg-[var(--sz-bg)]"
            }`}>
              {tx.type === "credit"
                ? <ArrowDownLeft className="w-4 h-4 text-[var(--sz-teal)]" />
                : <ArrowUpRight  className={`w-4 h-4 ${tx.flagged ? "text-[var(--sz-coral)]" : "text-[var(--sz-ink-light)]"}`} />
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--sz-ink)] truncate" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                {tx.merchant}
                {tx.flagged && (
                  <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(197,55,44,0.12)", color: "var(--sz-coral)", fontFamily: "var(--font-jetbrains-mono)" }}>
                    FLAGGED
                  </span>
                )}
              </p>
              <p className="text-xs text-[var(--sz-ink-light)] mt-0.5" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                {tx.date}
              </p>
            </div>

            <p
              className={`text-sm font-semibold shrink-0 ${tx.type === "credit" ? "text-[var(--sz-teal)]" : tx.flagged ? "text-[var(--sz-coral)]" : "text-[var(--sz-ink)]"}`}
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              {tx.type === "credit" ? "+" : "−"}${tx.amount.toFixed(2)}
            </p>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center py-16 text-[var(--sz-ink-light)] text-sm" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            No transactions found.
          </p>
        )}
      </div>
    </div>
  );
}
