import { createServiceClient } from "@/lib/supabase/server";

const LIMITS: Record<string, { windowMs: number; max: number }> = {
  "/api/agent/run": { windowMs: 10_000, max: 1 },
  "/api/agent/run/minute": { windowMs: 60_000, max: 6 },
  "/api/approvals/approve": { windowMs: 60_000, max: 20 },
  "/api/approvals/reject": { windowMs: 60_000, max: 20 },
};

export async function checkRateLimit(
  userId: string,
  route: string
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const config = LIMITS[route];
  if (!config) return { allowed: true };

  const supabase = createServiceClient();
  const windowStart = new Date(
    Math.floor(Date.now() / config.windowMs) * config.windowMs
  ).toISOString();

  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, count")
    .eq("user_id", userId)
    .eq("route", route)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (!existing) {
    await supabase.from("rate_limits").insert({
      user_id: userId,
      route,
      window_start: windowStart,
      count: 1,
    });
    return { allowed: true };
  }

  if (existing.count >= config.max) {
    const retryAfterSec = Math.ceil(
      (new Date(windowStart).getTime() + config.windowMs - Date.now()) / 1000
    );
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  await supabase
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("id", existing.id);

  return { allowed: true };
}
