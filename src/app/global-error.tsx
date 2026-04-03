"use client";

/**
 * src/app/global-error.tsx
 *
 * Catches unhandled client-side errors — rendered in a React error boundary.
 * Logs structured events (visible in browser console; in production these
 * should be sent to a real error-tracking service like Sentry).
 *
 * Renders a minimal recovery UI that matches the SubZero design system.
 */
import { useEffect } from "react";
import Link from "next/link";


export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side structured log (replace with Sentry.captureException in production)
    console.error(JSON.stringify({
      event:     "client.error.unhandled",
      message:   error.message,
      digest:    error.digest,
      timestamp: new Date().toISOString(),
    }));
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F5F0EA",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          textAlign: "center",
          padding: "2rem",
          maxWidth: "400px",
        }}>
          {/* SubZero snowflake */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "#1A6B57",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: 24,
          }}>
            ❄
          </div>

          <h1 style={{ fontSize: "1.5rem", color: "#1A1A1A", marginBottom: "0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6B6B6B", fontSize: "0.875rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            An unexpected error occurred. Our team has been notified.
            {error.digest && (
              <span style={{ display: "block", marginTop: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                Error ID: {error.digest}
              </span>
            )}
          </p>

          <button
            onClick={reset}
            style={{
              background: "#1A6B57",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              marginRight: "0.75rem",
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              color: "#1A6B57",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go home
          </Link>
        </div>
      </body>
    </html>
  );
}
