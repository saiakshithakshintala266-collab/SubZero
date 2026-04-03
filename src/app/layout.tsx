import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import SessionProvider from "@/components/SessionProvider";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SubZero — AI Subscription Audit & Cancellation",
  description:
    "SubZero's AI agent finds every forgotten subscription charge and cancels it automatically — in seconds.",
  keywords: ["subscription management", "AI", "cancel subscriptions", "fintech"],
  openGraph: {
    title: "SubZero — Find Every Forgotten Subscription",
    description:
      "AI-powered audit and cancellation. Find and kill every forgotten charge automatically.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full bg-[var(--sz-bg)] text-[var(--sz-ink)] antialiased">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
