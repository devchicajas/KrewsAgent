"use client";

import Link from "next/link";
import { useState } from "react";
import { WindowChrome } from "@/components/WindowChrome";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    setDevLink(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      setDone(true);
      setMessage(data.message);
      if (data.dev_reset_url) {
        setDevLink(data.dev_reset_url);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WindowChrome title="KREWSAGENT.EXE — Reset Password">
      <h1 className="page-h">{">> FORGOT PASSWORD"}</h1>
      <p className="page-s max-w-xl mb-4">
        Enter your account email. We will send a reset link if an account exists.
      </p>

      <div className="card max-w-md space-y-3 mb-4">
        <label className="block">
          <span className="card-label">Email</span>
          <input
            type="email"
            className="input-retro w-full mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={done}
            required
          />
        </label>

        {message && (
          <p className="text-base text-strawberry-light" role="status">
            {message}
          </p>
        )}

        {devLink && (
          <p className="text-sm break-all">
            Reset link:{" "}
            <a href={devLink} className="underline font-medium">
              open reset link
            </a>
          </p>
        )}

        {!done && (
          <button
            type="button"
            className="btn-primary"
            disabled={loading || !email}
            onClick={handleSubmit}
          >
            [ SEND RESET LINK ]
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/login?tab=signin" className="btn-retro text-center">
          [ ← BACK TO SIGN IN ]
        </Link>
        <Link href="/" className="btn-retro text-center">
          [ HOME ]
        </Link>
      </div>
    </WindowChrome>
  );
}
