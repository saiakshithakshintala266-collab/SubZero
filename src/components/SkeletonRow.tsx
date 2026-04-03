export default function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-[var(--sz-card)] rounded-2xl border border-[var(--sz-border)] animate-pulse" aria-hidden="true">
      <div className="w-9 h-9 rounded-xl bg-[var(--sz-bg)]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 rounded-full bg-[var(--sz-bg)]" />
        <div className="h-2.5 w-20 rounded-full bg-[var(--sz-ink-faint)] opacity-40" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-3.5 w-14 rounded-full bg-[var(--sz-bg)]" />
        <div className="h-5 w-16 rounded-full bg-[var(--sz-ink-faint)] opacity-30" />
      </div>
    </div>
  );
}
