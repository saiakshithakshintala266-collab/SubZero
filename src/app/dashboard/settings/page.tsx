"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Bell, Zap, Shield, CreditCard, Trash2, ChevronRight, Landmark, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

function Toggle({ on, onToggle, id }: { on: boolean; onToggle: () => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? "bg-[var(--sz-teal)]" : "bg-[var(--sz-ink-faint)]"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function Row({ icon: Icon, label, sub, value, onToggle, destructive, onClick, idx }: {
  icon: typeof Bell; label: string; sub?: string; value?: boolean;
  onToggle?: () => void; destructive?: boolean; onClick?: () => void; idx?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (idx ?? 0) * 0.06 + 0.1 }}
      onClick={onToggle ?? onClick}
      className={`flex items-center gap-3.5 px-4 py-4 bg-[var(--sz-card)] rounded-2xl border border-[var(--sz-border)] cursor-pointer
        hover:border-[${destructive ? "rgba(197,55,44,0.3)" : "var(--sz-ink-faint)"}]
        transition-all duration-150 group`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${destructive ? "bg-[var(--sz-coral-dim)]" : "bg-[var(--sz-bg)]"}`}>
        <Icon className={`w-4 h-4 ${destructive ? "text-[var(--sz-coral)]" : "text-[var(--sz-ink-light)] group-hover:text-[var(--sz-ink-mid)]"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${destructive ? "text-[var(--sz-coral)]" : "text-[var(--sz-ink)]"}`} style={{ fontFamily: "var(--font-plus-jakarta)" }}>
          {label}
        </p>
        {sub && <p className="text-xs text-[var(--sz-ink-light)] mt-0.5" style={{ fontFamily: "var(--font-plus-jakarta)" }}>{sub}</p>}
      </div>
      {onToggle !== undefined && value !== undefined
        ? <Toggle on={value} onToggle={onToggle} id={`toggle-${label.toLowerCase().replace(/\s/g, "-")}`} />
        : !destructive && <ChevronRight className="w-4 h-4 text-[var(--sz-ink-faint)] shrink-0" />
      }
    </motion.div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(false);
  const [autoCancel, setAutoCancel] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();

  return (
    <div className="min-h-screen bg-[var(--sz-bg)] px-5 pt-6 pb-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <h1 className="text-3xl font-bold italic text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-newsreader)" }}>Settings</h1>
        <p className="text-sm text-[var(--sz-ink-light)] mt-1" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Preferences & account configuration</p>
      </motion.div>

      {/* Account */}
      {session?.user && (
        <Section label="Account">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="flex items-center gap-3.5 px-4 py-4 bg-[var(--sz-card)] rounded-2xl border border-[var(--sz-teal)] border-opacity-30">
            <div className="w-9 h-9 rounded-full bg-[var(--sz-salmon)] flex items-center justify-center shrink-0 text-white text-xs font-bold">
              {session.user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>{session.user.name}</p>
              <p className="text-xs text-[var(--sz-ink-light)] mt-0.5" style={{ fontFamily: "var(--font-plus-jakarta)" }}>{session.user.email}</p>
            </div>
          </motion.div>
          <Row icon={LogOut} label="Log Out" sub="Sign out of your account" destructive onClick={() => signOut({ callbackUrl: "/login" })} idx={1} />
        </Section>
      )}

      {/* Connected Accounts */}
      <Section label="Connected Accounts">
        {[ { Icon: Landmark, title: "Bank Account", sub: "Chase ···· 4821 · Connected", live: true },
           { Icon: Mail,     title: "Gmail",        sub: "user@gmail.com · Connected",  live: true },
        ].map(({ Icon, title, sub, live }, i) => (
          <motion.div key={title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 + 0.08 }}
            className="flex items-center gap-3.5 px-4 py-4 bg-[var(--sz-card)] rounded-2xl border border-[var(--sz-teal)] border-opacity-30">
            <div className="w-9 h-9 rounded-xl bg-[var(--sz-teal-light)] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[var(--sz-teal)]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>{title}</p>
              <p className="text-xs text-[var(--sz-ink-light)] mt-0.5" style={{ fontFamily: "var(--font-plus-jakarta)" }}>{sub}</p>
            </div>
            {live && <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "var(--sz-saved-bg)", color: "var(--sz-teal)", fontFamily: "var(--font-jetbrains-mono)" }}>LIVE</span>}
          </motion.div>
        ))}
      </Section>

      {/* Notifications */}
      <Section label="Notifications">
        <Row icon={Mail} label="Email Alerts"        sub="New subscriptions & cancellations" value={email}      onToggle={() => { setEmail(v => !v); addToast("info", `Email alerts ${email ? "disabled" : "enabled"}`); }} idx={0} />
        <Row icon={Bell} label="Push Notifications"  sub="Billing reminders & agent updates"  value={push}       onToggle={() => { setPush(v => !v);  addToast("info", `Push ${push ? "disabled" : "enabled"}`);  }} idx={1} />
      </Section>

      {/* AI Agent */}
      <Section label="AI Agent">
        <Row icon={Zap}    label="Auto-Cancel Flagged" sub="Agent cancels unused subs automatically" value={autoCancel} onToggle={() => { setAutoCancel(v => !v); addToast("info", `Auto-cancel ${autoCancel ? "off" : "on"}`); }} idx={0} />
        <Row icon={Shield} label="Security & Permissions" sub="Manage API access & encryption" onClick={() => addToast("info", "Coming soon")} idx={1} />
      </Section>

      {/* Billing */}
      <Section label="Billing">
        <Row icon={CreditCard} label="Subscription Plan" sub="SubZero Pro — $9.99/mo" onClick={() => addToast("info", "Billing management coming soon")} idx={0} />
      </Section>

      {/* Danger */}
      <Section label="Danger Zone" labelColor="var(--sz-coral)">
        <Row icon={Trash2} label="Delete Account" sub="Permanently removes all your data" destructive onClick={() => addToast("error", "Contact support@subzero.ai to delete your account")} idx={0} />
      </Section>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-center text-[10px] text-[var(--sz-ink-faint)] mt-8"
        style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
        SubZero v1.0.0 · secure by design
      </motion.p>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function Section({ label, labelColor, children }: { label: string; labelColor?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3 px-1" style={{ fontFamily: "var(--font-plus-jakarta)", color: labelColor ?? "var(--sz-ink-light)" }}>
        {label}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
