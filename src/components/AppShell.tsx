"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, ArrowLeftRight, Settings, Snowflake, Menu, X, LogIn, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { href: "/dashboard",              label: "Subs",     icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Exchange", icon: ArrowLeftRight   },
  { href: "/dashboard/settings",     label: "Settings", icon: Settings         },
];

// Routes that render their own full-screen layout (no shell)
const SHELL_BYPASS = ["/login", "/signup", "/forgot-password", "/verify-email"];

function UserAvatar({ name, image }: { name?: string | null; image?: string | null }) {
  if (image) return <Image src={image} alt={name ?? ""} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />;
  const initial = name?.[0]?.toUpperCase() ?? "U";
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--sz-salmon)] flex items-center justify-center text-white text-xs font-bold">
      {initial}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth pages & onboarding handle their own chrome
  const bypassShell = SHELL_BYPASS.some((p) => pathname.startsWith(p)) || pathname === "/" || pathname === "/scan";
  if (bypassShell) return <>{children}</>;

  const isAuthed = status === "authenticated";

  return (
    <div className="flex min-h-screen bg-[var(--sz-bg)]">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-[var(--sz-surface)] border-r border-[var(--sz-border)] fixed left-0 top-0 bottom-0 z-30">
        {/* Logo */}
        <div className="px-5 pt-7 pb-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-[var(--sz-teal)] rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(26,107,87,0.3)] group-hover:shadow-[0_4px_16px_rgba(26,107,87,0.4)] transition-shadow">
              <Snowflake className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
              SubZero
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group ${
                  active ? "bg-[var(--sz-teal-light)] text-[var(--sz-teal)]" : "text-[var(--sz-ink-mid)] hover:bg-[var(--sz-bg)] hover:text-[var(--sz-ink)]"
                }`}
                style={{ fontFamily: "var(--font-plus-jakarta)" }}
              >
                {active && (
                  <motion.div layoutId="sidebar-pill" className="absolute inset-0 rounded-xl bg-[var(--sz-teal-light)]" transition={{ type: "spring", bounce: 0.25, duration: 0.4 }} />
                )}
                <Icon className={`w-4 h-4 shrink-0 relative z-10 ${active ? "text-[var(--sz-teal)]" : "text-[var(--sz-ink-light)] group-hover:text-[var(--sz-ink-mid)]"}`} />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 pb-6 space-y-3">
          {/* Agent status */}
          <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-[var(--sz-bg)] border border-[var(--sz-border)]">
            <span className="w-2 h-2 rounded-full bg-[var(--sz-teal)] animate-pulse shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Agent · Ready</p>
              <p className="text-[10px] text-[var(--sz-ink-light)]">Playwright + Claude</p>
            </div>
          </div>

          {/* Auth state */}
          {isAuthed ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--sz-bg)] border border-[var(--sz-border)]">
              <UserAvatar name={session?.user?.name} image={session?.user?.image} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--sz-ink)] truncate" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  {session?.user?.name ?? "User"}
                </p>
                <p className="text-[10px] text-[var(--sz-ink-light)] truncate">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--sz-coral-dim)] text-[var(--sz-ink-light)] hover:text-[var(--sz-coral)] transition-colors"
                aria-label="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border border-[var(--sz-teal)] text-[var(--sz-teal)] text-sm font-semibold hover:bg-[var(--sz-teal-light)] transition-colors"
              style={{ fontFamily: "var(--font-plus-jakarta)" }}
            >
              <LogIn className="w-4 h-4" /> Log in
            </Link>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 md:ml-60 min-h-screen flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-40 bg-[var(--sz-surface)] border-b border-[var(--sz-border)]">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[var(--sz-teal)] rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(26,107,87,0.3)]">
                <Snowflake className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-base font-bold text-[var(--sz-ink)]" style={{ fontFamily: "var(--font-plus-jakarta)" }}>SubZero</span>
            </Link>
            <div className="flex items-center gap-2">
              {isAuthed
                ? <UserAvatar name={session?.user?.name} image={session?.user?.image} />
                : <Link href="/login" className="text-xs font-semibold text-[var(--sz-teal)] px-3 py-1.5 rounded-full border border-[var(--sz-teal)] hover:bg-[var(--sz-teal-light)] transition-colors" style={{ fontFamily: "var(--font-plus-jakarta)" }}>Log in</Link>
              }
              <button onClick={() => setMobileOpen(!mobileOpen)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--sz-bg)] text-[var(--sz-ink-mid)] hover:text-[var(--sz-ink)] transition-colors" aria-label="Toggle menu">
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden fixed top-[53px] inset-x-0 z-50 bg-[var(--sz-surface)] border-b border-[var(--sz-border)] px-4 py-2 space-y-1"
            >
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
                return (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      active ? "bg-[var(--sz-teal-light)] text-[var(--sz-teal)]" : "text-[var(--sz-ink-mid)] hover:bg-[var(--sz-bg)]"
                    }`}
                    style={{ fontFamily: "var(--font-plus-jakarta)" }}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </Link>
                );
              })}
              {isAuthed && (
                <button
                  onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/login" }); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--sz-coral)] hover:bg-[var(--sz-coral-dim)] transition-colors w-full"
                  style={{ fontFamily: "var(--font-plus-jakarta)" }}
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 pb-24 md:pb-0">{children}</div>
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--sz-surface)] border-t border-[var(--sz-border)]">
        <div className="flex items-center justify-around py-2 px-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 px-4 py-1">
                <div className={`w-10 h-7 flex items-center justify-center rounded-full transition-all duration-150 ${active ? "bg-[var(--sz-teal-light)]" : ""}`}>
                  <Icon className={`w-5 h-5 transition-colors duration-150 ${active ? "text-[var(--sz-teal)]" : "text-[var(--sz-ink-light)]"}`} />
                </div>
                <span className={`text-[10px] font-semibold transition-colors duration-150 ${active ? "text-[var(--sz-teal)]" : "text-[var(--sz-ink-light)]"}`} style={{ fontFamily: "var(--font-plus-jakarta)" }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
