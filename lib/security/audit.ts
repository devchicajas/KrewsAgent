import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { redact, redactObject } from "./redaction";

export interface AuditEntry {
  user_id: string;
  agent_type: string;
  action: string;
  reasoning?: string;
  status: string;
  tars_model?: string;
  details?: Record<string, unknown>;
}

function canonical(entry: Omit<AuditEntry, "user_id"> & { created_at: string }): string {
  return JSON.stringify({
    agent_type: entry.agent_type,
    action: entry.action,
    reasoning: entry.reasoning ?? "",
    status: entry.status,
    tars_model: entry.tars_model ?? "",
    details: entry.details ?? {},
    created_at: entry.created_at,
  });
}

export async function writeAuditEntry(entry: AuditEntry): Promise<string> {
  const supabase = createServiceClient();
  const created_at = new Date().toISOString();

  const { data: last } = await supabase
    .from("action_log")
    .select("entry_hash")
    .eq("user_id", entry.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prev_hash = last?.entry_hash ?? "GENESIS";
  const redactedDetails = entry.details
    ? (redactObject(entry.details) as Record<string, unknown>)
    : null;

  const row = {
    agent_type: entry.agent_type,
    action: entry.action,
    reasoning: entry.reasoning ? redact(entry.reasoning) : null,
    status: entry.status,
    tars_model: entry.tars_model ?? null,
    details: redactedDetails,
    created_at,
  };

  const entry_hash = createHash("sha256")
    .update(
      prev_hash +
        canonical({
          agent_type: row.agent_type,
          action: row.action,
          reasoning: row.reasoning ?? "",
          status: row.status,
          tars_model: row.tars_model ?? "",
          details: row.details ?? {},
          created_at,
        })
    )
    .digest("hex");

  const { data, error } = await supabase
    .from("action_log")
    .insert({
      user_id: entry.user_id,
      ...row,
      prev_hash,
      entry_hash,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Audit write failed: ${error.message}`);
  return data.id;
}

/** Best-effort audit — never blocks the pipeline */
export async function safeWriteAuditEntry(entry: AuditEntry): Promise<string | null> {
  try {
    return await writeAuditEntry(entry);
  } catch {
    return null;
  }
}

export async function verifyAuditChain(userId: string): Promise<{
  intact: boolean;
  brokenAt?: string;
}> {
  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("action_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) return { intact: false, brokenAt: "query_failed" };
  if (!rows?.length) return { intact: true };

  let expectedPrev = "GENESIS";
  for (const row of rows) {
    if (row.prev_hash !== expectedPrev) {
      return { intact: false, brokenAt: row.id };
    }
    const hash = createHash("sha256")
      .update(
        expectedPrev +
          canonical({
            agent_type: row.agent_type,
            action: row.action,
            reasoning: row.reasoning ?? "",
            status: row.status,
            tars_model: row.tars_model ?? "",
            details: (row.details as Record<string, unknown>) ?? {},
            created_at: row.created_at,
          })
      )
      .digest("hex");
    if (hash !== row.entry_hash) {
      return { intact: false, brokenAt: row.id };
    }
    expectedPrev = row.entry_hash;
  }
  return { intact: true };
}
