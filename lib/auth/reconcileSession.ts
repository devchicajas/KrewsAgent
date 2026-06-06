import { createServiceClient } from "@/lib/supabase/server";
import type { SessionPayload } from "./session";

/**
 * Map JWT session → live DB user. Rebinds by email when the account was reset
 * and the browser still holds an old user id in krews_session.
 */
export async function reconcileSession(
  session: SessionPayload
): Promise<SessionPayload | null> {
  const supabase = createServiceClient();
  const email = session.email.toLowerCase().trim();

  const { data: byId } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", session.userId)
    .maybeSingle();

  if (byId?.email?.toLowerCase() === email) {
    return { userId: byId.id, email: byId.email };
  }

  const { data: byEmail } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (byEmail) {
    return { userId: byEmail.id, email: byEmail.email };
  }

  return null;
}
