import OpenAI from "openai";
import type { AgentRunOutput } from "@/lib/types/agent";
import { parseAgentRunOutput } from "@/lib/security/outputValidation";

export const MODELS = {
  classify: "claude-haiku-4-5",
  draft: "claude-sonnet-4-6",
  support: "claude-haiku-4-5",
  finance: "gpt-4o-mini",
} as const;

const FALLBACK_MODELS = ["claude-sonnet-4-6", "gpt-4o", "gemini-2.5-flash"];

/** Per-request OpenAI client timeout */
export function getTarsTimeoutMs(): number {
  return process.env.VERCEL ? 28_000 : 45_000;
}

/** Total wall-clock budget for one crew run (draft + optional repair) */
export function getTarsRunBudgetMs(): number {
  return process.env.VERCEL ? 55_000 : 45_000;
}

/** Haiku on Vercel — fast enough to finish live; Sonnet locally */
export function getDraftModel(agentType: keyof typeof MODELS = "draft"): string {
  if (agentType === "finance") return MODELS.finance;
  if (process.env.VERCEL) return MODELS.classify; // claude-haiku-4-5
  return MODELS.draft;
}

function modelsToTry(primary: string): string[] {
  const fallbacks = process.env.VERCEL
    ? ["gpt-4o-mini"]
    : FALLBACK_MODELS.filter((m) => m !== primary);
  return [primary, ...fallbacks];
}

function getTars(): OpenAI {
  return new OpenAI({
    apiKey: process.env.TARS_API_KEY ?? "demo",
    baseURL: process.env.TARS_BASE_URL ?? "https://api.router.tetrate.ai/v1",
    timeout: getTarsTimeoutMs(),
  });
}

/** TARS rejects json_object — parse JSON from model text (handles ``` fences) */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("No JSON object in model response");
  }
}

export async function tarsChat(
  model: string,
  system: string,
  user: string,
  options?: { maxTokens?: number }
): Promise<{ content: string; model: string }> {
  const tars = getTars();
  const chain = modelsToTry(model);
  let lastError: unknown;
  const maxTokens = options?.maxTokens ?? (process.env.VERCEL ? 2500 : 4096);

  for (const m of chain) {
    try {
      const response = await tars.chat.completions.create({
        model: m,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      });
      const content = response.choices[0]?.message?.content ?? "";
      return { content, model: response.model ?? m };
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  throw lastError ?? new Error("TARS unreachable after fallback chain");
}

export async function tarsDraftWithRetry(
  system: string,
  user: string,
  repairPrompt: string
): Promise<{ output: AgentRunOutput; model: string } | null> {
  const { content, model } = await tarsChat(MODELS.draft, system, user);
  let parsed = parseAgentRunOutput(extractJson(content || "{}"));
  if (parsed) return { output: parsed, model };

  const { content: repaired } = await tarsChat(MODELS.draft, repairPrompt, content);
  parsed = parseAgentRunOutput(extractJson(repaired || "{}"));
  if (parsed) return { output: parsed, model };
  return null;
}
