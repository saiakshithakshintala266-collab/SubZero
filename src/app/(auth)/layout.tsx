import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SubZero — Account",
};

/**
 * The (auth) group bypasses the root AppShell — auth screens have
 * their own minimal layout (no sidebar, no nav bar).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--sz-bg)] flex flex-col">
      {children}
    </div>
  );
}
