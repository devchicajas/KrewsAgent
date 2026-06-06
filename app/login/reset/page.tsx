"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { WindowChrome } from "@/components/WindowChrome";
import { PasswordField } from "@/components/PasswordField";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!token) {
      setMessage("Missing reset token — use the link from your email.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Reset failed");
      }
      window.location.href = "/connect";
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading && token.length > 0 && password.length >= 8 && confirm.length >= 8;

  if (!token) {
    return (
      <WindowChrome title="KREWSAGENT.EXE — Reset Password">
        <h1 className="page-h">{">> INVALID LINK"}</h1>
        <p className="page-s max-w-xl mb-4">
          This reset link is missing a token. Request a new one from the forgot
          password page.
        </p>
        <Link href="/login/forgot" className="btn-primary inline-block">
          [ REQUEST NEW LINK ]
        </Link>
      </WindowChrome>
    );
  }

  return (
    <WindowChrome title="KREWSAGENT.EXE — Reset Password">
      <h1 className="page-h">{">> SET NEW PASSWORD"}</h1>
      <p className="page-s max-w-xl mb-4">
        Choose a new password. This link expires in 1 hour.
      </p>

      <div className="card max-w-md space-y-3 mb-4">
        <PasswordField
          id="reset-password"
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint="At least 8 characters"
        />
        <PasswordField
          id="reset-confirm"
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />

        {message && (
          <p className="text-base text-strawberry-light" role="status">
            {message}
          </p>
        )}

        <button
          type="button"
          className="btn-primary"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          [ UPDATE PASSWORD ]
        </button>
      </div>

      <Link href="/login/forgot" className="btn-retro inline-block">
        [ REQUEST NEW LINK ]
      </Link>
    </WindowChrome>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <WindowChrome title="KREWSAGENT.EXE — Reset Password">Loading…</WindowChrome>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
