"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, RefreshCw } from "lucide-react";
import SubscriptionRow from "@/components/SubscriptionRow";
import AgentBar from "@/components/AgentBar";
import SkeletonRow from "@/components/SkeletonRow";
import CancelModal from "@/components/CancelModal";
import DraftModal from "@/components/DraftModal";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import type { Subscription, SubscriptionStatus } from "@/lib/types";


const SUBS: Subscription[] = [
  { id: "adobe",   name: "Adobe Creative Cloud", amount: 54.99, billingCycle: "monthly", nextBill: "Oct 12",      status: "active"    },
  { id: "netflix", name: "Netflix Premium",       amount: 22.99, billingCycle: "monthly", lastUsed: "14 days ago", status: "flagged"   },
  { id: "equinox", name: "Equinox Membership",    amount: 285.00,billingCycle: "monthly", lastUsed: "42 days ago", status: "cancelled" },
  { id: "chatgpt", name: "ChatGPT Plus",          amount: 20.00, billingCycle: "monthly",                          status: "running"   },
  { id: "nytimes", name: "NY Times Digital",      amount: 4.88,  billingCycle: "monthly", nextBill: "Oct 04",      status: "cancelled" },
];

export default function DashboardPage() {
  const [subs, setSubs] = useState<Subscription[]>(SUBS);
  const [modalSub, setModalSub] = useState<Subscription | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftCancelling, setDraftCancelling] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();

  const monthly = subs.filter(s => s.status !== "cancelled").reduce((a, s) => a + s.amount, 0);
  const flagged  = subs.filter(s => s.status === "flagged").length;
  const cancelled = subs.filter(s => s.status === "cancelled").length;
  const saved    = subs.filter(s => s.status === "cancelled").reduce((a, s) => a + s.amount, 0);

  const visible = subs;

  function onCancel(id: string) {
    const s = subs.find(x => x.id === id);
    if (s && (s.status === "active" || s.status === "flagged")) setModalSub(s);
  }

  async function confirmCancel() {
    if (!modalSub) return;
    setCancelling(true);
    await new Promise(r => setTimeout(r, 1800));
    setSubs(prev => prev.map(s => s.id === modalSub.id ? { ...s, status: "cancelled" as SubscriptionStatus } : s));
    addToast("success", `${modalSub.name} cancelled — saving $${modalSub.amount.toFixed(2)}/mo`);
    setCancelling(false);
    setModalSub(null);
  }

  async function handleAutoCancel() {
    const flaggedSubs = subs.filter(s => s.status === "flagged");
    for (const s of flaggedSubs) {
      await new Promise(r => setTimeout(r, 600));
      setSubs(prev => prev.map(x => x.id === s.id ? { ...x, status: "cancelled" as SubscriptionStatus } : x));
    }
    addToast("success", `${flaggedSubs.length} flagged subscription(s) cancelled`);
  }

  function handleDraft() {
    setDraftOpen(true);
  }

  async function handleDraftConfirm(selectedIds: string[]) {
    if (selectedIds.length === 0) return;
    setDraftCancelling(true);
    const selectedSubs = subs.filter(s => selectedIds.includes(s.id));
    for (const s of selectedSubs) {
      await new Promise(r => setTimeout(r, 700));
      setSubs(prev => prev.map(x => x.id === s.id ? { ...x, status: "cancelled" as SubscriptionStatus } : x));
    }
    const totalSaved = selectedSubs.reduce((a, s) => a + s.amount, 0);
    addToast("success", `${selectedSubs.length} subscription(s) cancelled — saving $${totalSaved.toFixed(2)}/mo`);
    setDraftCancelling(false);
    setDraftOpen(false);
  }

  async function refresh() {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1200));
    setRefreshing(false);
    addToast("info", "Subscriptions refreshed");
  }

  return (
    <div className="min-h-screen bg-[var(--sz-bg)] px-5 pt-6 pb-6 max-w-2xl mx-auto">
      {/* ── Header row ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {/* SubZero snowflake */}
          <div className="w-7 h-7 bg-[var(--sz-teal)] rounded-lg flex items-center justify-center">
            <span className="text-white text-base">❄</span>
          </div>
          <span className="text-base font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            SUBZERO
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button id="dashboard-refresh" onClick={refresh} disabled={refreshing}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--sz-card)] border border-[var(--sz-border)] text-[var(--sz-ink-mid)] hover:text-[var(--sz-ink)] transition-colors disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="w-8 h-8 rounded-full bg-[var(--sz-salmon)] flex items-center justify-center text-white text-xs font-bold">U</div>
        </div>
      </motion.div>

      {/* ── Agent bar ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="mb-5">
        <AgentBar
          status="ready"
          flaggedCount={flagged}
          onDraft={flagged > 0 ? handleDraft : undefined}
          onAutoCancel={flagged > 0 ? handleAutoCancel : undefined}
        />
      </motion.div>

      {/* ── Stats — 4 editorial number boxes ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="grid grid-cols-2 gap-3 mb-6">
        {/* Monthly */}
        <div className="bg-[var(--sz-card)] border border-[var(--sz-border)] rounded-2xl px-4 py-4">
          <p className="text-[10px] text-[var(--sz-ink-light)] uppercase tracking-[0.06em] font-semibold mb-1" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Monthly</p>
          <p className="text-3xl font-bold text-[var(--sz-coral)]" style={{ fontFamily: "var(--font-newsreader)" }}>
            <span className="text-lg align-super">$</span>{monthly.toFixed(2)}
          </p>
          <p className="text-[10px] text-[var(--sz-ink-light)] mt-0.5" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Total burn</p>
        </div>
        {/* Flagged */}
        <div className="bg-[var(--sz-card)] border border-[var(--sz-border)] rounded-2xl px-4 py-4">
          <p className="text-[10px] text-[var(--sz-ink-light)] uppercase tracking-[0.06em] font-semibold mb-1" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Flagged</p>
          <p className="text-3xl font-bold text-[var(--sz-coral)]" style={{ fontFamily: "var(--font-newsreader)" }}>
            {String(flagged).padStart(2, "0")}
          </p>
          <p className="text-[10px] text-[var(--sz-ink-light)] mt-0.5" style={{ fontFamily: "var(--font-plus-jakarta)" }}>High risk</p>
        </div>
        {/* Cancelled */}
        <div className="bg-[var(--sz-card)] border border-[var(--sz-border)] rounded-2xl px-4 py-4">
          <p className="text-[10px] text-[var(--sz-ink-light)] uppercase tracking-[0.06em] font-semibold mb-1" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Cancelled</p>
          <p className="text-3xl font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-newsreader)" }}>
            {String(cancelled).padStart(2, "0")}
          </p>
          <p className="text-[10px] text-[var(--sz-ink-light)] mt-0.5" style={{ fontFamily: "var(--font-plus-jakarta)" }}>This month</p>
        </div>
        {/* Saved */}
        <div className="bg-[var(--sz-coral-dim)] border border-[rgba(197,55,44,0.2)] rounded-2xl px-4 py-4">
          <p className="text-[10px] text-[var(--sz-coral)] uppercase tracking-[0.06em] font-semibold mb-1" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Saved/mo</p>
          <p className="text-3xl font-bold text-[var(--sz-coral)]" style={{ fontFamily: "var(--font-newsreader)" }}>
            <span className="text-lg align-super">$</span>{saved.toFixed(2)}
          </p>
          <p className="text-[10px] text-[var(--sz-coral)] mt-0.5 opacity-70" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Efficiency</p>
        </div>
      </motion.div>

      {/* ── Subscriptions list ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-newsreader)", fontStyle: "italic" }}>
          Active Subscriptions
        </h2>
        <button className="flex items-center gap-1 text-xs text-[var(--sz-ink-light)] hover:text-[var(--sz-teal)] transition-colors" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
          View Archive <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <p className="text-[11px] text-[var(--sz-ink-light)] mb-4 font-mono">
        {visible.length} total
      </p>

      <div className="space-y-2.5">
        {refreshing ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : (
          visible.map((s, i) => (
            <SubscriptionRow key={s.id} subscription={s} index={i} onCancel={onCancel} />
          ))
        )}
      </div>

      <CancelModal
        open={!!modalSub}
        onClose={() => !cancelling && setModalSub(null)}
        onConfirm={confirmCancel}
        name={modalSub?.name ?? ""}
        amount={modalSub?.amount ?? 0}
        isLoading={cancelling}
      />
      <DraftModal
        open={draftOpen}
        onClose={() => !draftCancelling && setDraftOpen(false)}
        onConfirm={handleDraftConfirm}
        flaggedSubs={subs.filter(s => s.status === "flagged")}
        isLoading={draftCancelling}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
