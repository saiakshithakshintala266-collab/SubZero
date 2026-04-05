"use client";

/**
 * PlaidConnectButton
 *
 * A self-contained component that:
 *  1. Fetches a Plaid link token from /api/plaid/link-token
 *  2. Opens the Plaid Link modal (react-plaid-link)
 *  3. On success: POSTs public_token to /api/plaid/exchange
 *  4. Calls onSuccess() so the parent can trigger a rescan
 *
 * Security: public_token is exchanged immediately server-side.
 *           No access_token is ever exposed to the client.
 */
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink }                      from "react-plaid-link";
import { Building2, Loader2 }               from "lucide-react";

interface Props {
  onSuccess?: (institutionName: string) => void;
  onError?:   (error: string) => void;
  className?: string;
  label?:     string;
}

export default function PlaidConnectButton({
  onSuccess,
  onError,
  className = "",
  label     = "Connect Bank Account",
}: Props) {
  const [linkToken, setLinkToken]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [exchanging, setExchanging] = useState(false);

  // ── 1. Fetch link token on mount ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/plaid/link-token", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.link_token) setLinkToken(data.link_token);
      })
      .catch(() => {
        if (!cancelled) onError?.("Failed to initialize bank connection");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Handle Plaid Link success ───────────────────────────────────
  const handleSuccess = useCallback(
    async (publicToken: string) => {
      setExchanging(true);
      try {
        const res  = await fetch("/api/plaid/exchange", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ public_token: publicToken }),
        });
        const data = await res.json();

        if (!res.ok) {
          onError?.(data.error ?? "Failed to connect bank");
          return;
        }

        onSuccess?.(data.institutionName ?? "Your bank");
      } catch {
        onError?.("Failed to connect bank account");
      } finally {
        setExchanging(false);
      }
    },
    [onSuccess, onError]
  );

  // ── 3. Plaid Link hook ─────────────────────────────────────────────
  const { open, ready } = usePlaidLink({
    token:     linkToken ?? "",
    onSuccess: (publicToken) => handleSuccess(publicToken),
    onExit:    (err) => {
      if (err) onError?.(err.display_message ?? "Connection cancelled");
    },
  });

  const isReady = ready && !loading && !exchanging && !!linkToken;

  return (
    <button
      id="plaid-connect-btn"
      onClick={() => isReady && open()}
      disabled={!isReady}
      className={`flex items-center gap-2 justify-center ${className}`}
    >
      {(loading || exchanging) ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Building2 className="w-4 h-4" />
      )}
      {exchanging ? "Connecting…" : loading ? "Initializing…" : label}
    </button>
  );
}
