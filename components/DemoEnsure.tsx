"use client";

import { useEffect } from "react";

/** Self-seed safety net on first page load */
export function DemoEnsure() {
  useEffect(() => {
    fetch("/api/demo/ensure").catch(() => {});
  }, []);
  return null;
}
