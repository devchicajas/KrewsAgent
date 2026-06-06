"use client";

import { useCallback, useEffect, useState } from "react";

interface AuthState {
  is_demo: boolean;
  account_type?: "demo_sandbox" | "user";
  email: string | null;
  display_name?: string | null;
}

interface AccountModeBadgeProps {
  /** compact = menu bar; banner = full-width under page title */
  variant?: "compact" | "banner";
}

export function AccountModeBadge({ variant = "compact" }: AccountModeBadgeProps) {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (r.status === 401) {
          setAuth(null);
          return;
        }
        setAuth(await r.json());
      })
      .catch(() => setAuth(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return variant === "compact" ? (
      <span className="account-badge account-badge--loading">···</span>
    ) : null;
  }

  if (!auth) {
    if (variant === "banner") {
      return (
        <p className="account-banner account-banner--guest mb-4">
          [ NOT SIGNED IN — log in or try demo to connect integrations ]
        </p>
      );
    }
    return (
      <span className="account-badge account-badge--guest" title="Not signed in">
        Guest
      </span>
    );
  }

  if (auth.is_demo || auth.account_type === "demo_sandbox") {
    if (variant === "banner") {
      return (
        <p className="account-banner account-banner--demo mb-4">
          [ PLACEHOLDER DEMO — not your login · fictional founder &quot;Jordan&quot;
          · simulated inbox/issues only · sign up to use your real account ]
        </p>
      );
    }
    return (
      <span
        className="account-badge account-badge--demo"
        title="Placeholder sandbox — not signed in as you"
      >
        Demo · placeholder
      </span>
    );
  }

  const email = auth.email ?? "your account";
  const short = auth.display_name ?? email.split("@")[0];

  if (variant === "banner") {
    return (
      <p className="account-banner account-banner--real mb-4">
        [ YOUR ACCOUNT — {email} · your Gmail/GitHub connections stay private
        to this login ]
      </p>
    );
  }

  return (
    <span className="account-badge account-badge--real" title={email}>
      Your account · {short}
    </span>
  );
}
