import OpenAI from "openai";
import type { AgentRunOutput } from "@/lib/types/agent";
import { parseAgentRunOutput } from "@/lib/security/outputValidation";

const TARS_TIMEOUT_MS = 45_000;

function getTars(): OpenAI {
  return new OpenAI({
    apiKey: process.env.TARS_API_KEY ?? "demo",
    baseURL: process.env.TARS_BASE_URL ?? "https://api.router.tetrate.ai/v1",
    timeout: TARS_TIMEOUT_MS,
  });
}

export const MODELS = {
  classify: "claude-haiku-4-5",
  draft: "claude-sonnet-4-6",
  support: "claude-haiku-4-5",
  finance: "gpt-4o-mini",
} as const;

const FALLBACK_MODELS = ["claude-sonnet-4-6", "gpt-4o", "gemini-2.5-flash"];

/** TARS rejects json_object — parse JSON from model text (handles ``` fences) */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

export async function tarsChat(
  model: string,
  system: string,
  user: string
): Promise<{ content: string; model: string }> {
  const tars = getTars();
  const modelsToTry = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
  let lastError: unknown;

  for (const m of modelsToTry) {
    try {
      const response = await tars.chat.completions.create({
        model: m,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 4096,
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
