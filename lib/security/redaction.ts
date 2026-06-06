const PATTERNS: [RegExp, string][] = [
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]"],
  [/\b(?:\+?1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[phone]"],
  [/\bsk-[a-zA-Z0-9_-]{20,}\b/g, "[redacted-secret]"],
  [/\bghp_[a-zA-Z0-9]{20,}\b/g, "[redacted-secret]"],
  [/\bBearer\s+[a-zA-Z0-9._-]+\b/gi, "Bearer [redacted-secret]"],
  [/\b[a-zA-Z0-9+/]{40,}={0,2}\b/g, "[redacted-secret]"],
];

export function redact(text: string): string {
  let result = text;
  for (const [pattern, replacement] of PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function redactObject(obj: unknown): unknown {
  if (typeof obj === "string") return redact(obj);
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = redactObject(v);
    }
    return out;
  }
  return obj;
}
