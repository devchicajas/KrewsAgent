"use client";

import { useState } from "react";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  hint?: string;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  minLength = 8,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block" htmlFor={id}>
      <span className="card-label">{label}</span>
      <div className="password-field mt-1">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className="input-retro password-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? "[ HIDE ]" : "[ SHOW ]"}
        </button>
      </div>
      {hint && <p className="text-text-muted text-sm mt-1">{hint}</p>}
    </label>
  );
}
