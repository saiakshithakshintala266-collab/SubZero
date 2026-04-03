import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Standalone output (required for Docker + Railway/Render) ───────────────
  // Output a minimal self-contained server bundle in .next/standalone/
  // The Docker image copies only this directory + static assets.
  output: "standalone",

  // ── Remove "X-Powered-By: Next.js" fingerprinting header ──────────────────
  poweredByHeader: false,

  // ── HTTP security headers (defence-in-depth alongside proxy.ts) ───────────
  // These run at the CDN/edge level before the application layer.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key:   "X-Frame-Options",
            value: "DENY",
          },
          {
            key:   "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key:   "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key:   "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key:   "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          {
            key:   "Strict-Transport-Security",
            // 2 years, all subdomains, preload list eligible
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // ── Image domains ──────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      // Google profile images (OAuth)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // ── Turbopack (Next.js 16 default dev bundler) ────────────────────────────
  // An empty turbopack config silences the "webpack config but no turbopack
  // config" warning that Next.js 16 emits. pino-pretty is server-only and
  // never imported on the client, so no extra exclusion rule is needed.
  turbopack: {},

  // ── Webpack (silence pino server-side bundling warnings in prod) ──────────
  // Still used by `next build` in some configurations.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // pino-pretty is server-only — exclude from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "pino-pretty": false,
      };
    }
    return config;
  },
};

export default nextConfig;
