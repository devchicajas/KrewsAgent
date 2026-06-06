"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { signOutAndRedirect } from "@/lib/auth/signOutClient";

interface AuthState {
  user_id: string;
  is_demo: boolean;
  email: string | null;
}

export function AuthNav() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAuth = useCallback(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (r.status === 401) {
          setLoggedOut(true);
          setAuth(null);
          return;
        }
        const d = await r.json();
        setAuth(d);
        setLoggedOut(false);
      })
      .catch(() => {
        setLoggedOut(true);
        setAuth(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  const handleLogOut = () => signOutAndRedirect("/login?tab=signin");

  if (loading) {
    return <span className="menu-item menu-item-dim">···</span>;
  }

  if (loggedOut || !auth) {
    return (
      <>
        <Link href="/login?tab=signin" className="menu-item">
          Log In
        </Link>
        <Link href="/login?tab=signup" className="menu-item">
          Sign Up
        </Link>
      </>
    );
  }

  if (auth.is_demo) {
    return (
      <>
        <button type="button" className="menu-item" onClick={handleLogOut}>
          Exit Demo
        </button>
        <Link href="/login?tab=signup" className="menu-item">
          Create Account
        </Link>
      </>
    );
  }

  return (
    <>
      <button type="button" className="menu-item" onClick={handleLogOut}>
        Log Out
      </button>
    </>
  );
}
