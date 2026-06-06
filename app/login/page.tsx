"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { WindowChrome } from "@/components/WindowChrome";
import { PasswordField } from "@/components/PasswordField";

type AuthTab = "signup" | "signin";

function formatAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Request failed";
  if (/wrong email or password/i.test(msg)) {
    return "Wrong email or password. Create an account if you have not signed up yet.";
  }
  if (/already registered/i.test(msg)) {
    return "That email is already registered — use Sign In instead.";
  }
  if (/no password set/i.test(msg)) {
    return msg;
  }
  if (/password_hash does not exist/i.test(msg)) {
    return "Database needs a quick update — run db/auth-migrations-combined.sql in Supabase SQL Editor, then try again.";
  }
  return msg;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/connect";
  const authError = searchParams.get("error");
  const initialTab: AuthTab =
    searchParams.get("tab") === "signup" ? "signup" : "signin";

  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    authError ? "Sign-in failed — try again." : null
  );
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage("Please enter your name.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: trimmedName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Sign-up failed");
      }
      window.location.href = next;
    } catch (e) {
      setMessage(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Sign-in failed");
      }
      window.location.href = next;
    } catch (e) {
      setMessage(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const canSubmitSignUp =
    !loading && name.trim().length > 0 && email.length > 0 && password.length >= 8;
  const canSubmitSignIn = !loading && email.length > 0 && password.length >= 8;

  return (
    <WindowChrome title="KREWSAGENT.EXE — Account">
      <h1 className="page-h">
        {tab === "signup" ? ">> CREATE YOUR ACCOUNT" : ">> SIGN IN"}
      </h1>
      <p className="page-s max-w-xl mb-4">
        {tab === "signup"
          ? "Open-source email + password auth. If you tried signing up before, use the same email here to finish setting your password."
          : "Sign in with the email and password you created. No emails are sent."}
      </p>

      <div className="auth-tabs mb-4">
        <button
          type="button"
          className={`auth-tab ${tab === "signup" ? "auth-tab-active" : ""}`}
          onClick={() => {
            setTab("signup");
            setMessage(null);
          }}
        >
          [ CREATE ACCOUNT ]
        </button>
        <button
          type="button"
          className={`auth-tab ${tab === "signin" ? "auth-tab-active" : ""}`}
          onClick={() => {
            setTab("signin");
            setMessage(null);
          }}
        >
          [ SIGN IN ]
        </button>
      </div>

      <div className="card max-w-md space-y-3 mb-4">
        {tab === "signup" && (
          <label className="block">
            <span className="card-label">Your name</span>
            <input
              type="text"
              className="input-retro w-full mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Jordan Lee"
              required
            />
          </label>
        )}

        <label className="block">
          <span className="card-label">Email</span>
          <input
            type="email"
            className="input-retro w-full mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <PasswordField
          id="auth-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete={tab === "signup" ? "new-password" : "current-password"}
          hint={tab === "signup" ? "At least 8 characters" : undefined}
        />

        {message && (
          <p className="text-base text-strawberry-light" role="status">
            {message}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {tab === "signup" ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!canSubmitSignUp}
              onClick={handleSignUp}
            >
              [ CREATE ACCOUNT ]
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-primary"
                disabled={!canSubmitSignIn}
                onClick={handleSignIn}
              >
                [ SIGN IN ]
              </button>
              <Link href="/login/forgot" className="btn-retro text-sm text-center">
                Forgot password?
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/api/auth/demo?next=${encodeURIComponent("/connect")}`}
          className="btn-retro text-center"
        >
          [ TRY DEMO WITHOUT SIGN-UP ]
        </Link>
        <Link href="/" className="btn-retro text-center">
          [ ← HOME ]
        </Link>
      </div>
    </WindowChrome>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <WindowChrome title="KREWSAGENT.EXE — Account">Loading…</WindowChrome>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
