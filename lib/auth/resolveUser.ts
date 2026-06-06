import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { DEMO_EMAIL, DEMO_NAME } from "@/lib/demo/seedCore";
import { getDemoUserId } from "@/lib/env";
import { DEMO_COOKIE, type RequestAuth } from "./types";
import { ensureUserProvisioned } from "./provision";
import { reconcileSession } from "./reconcileSession";
import { getSessionFromCookies } from "./session";

export async function resolveRequestAuth(
  req?: NextRequest
): Promise<RequestAuth | null> {
  const rawSession = await getSessionFromCookies(req);
  const session = rawSession ? await reconcileSession(rawSession) : null;

  if (session) {
    try {
      await ensureUserProvisioned({
        id: session.userId,
        email: session.email,
        name: session.email.split("@")[0],
      });
    } catch (err) {
      console.error("[auth] ensureUserProvisioned failed:", err);
    }
    return {
      userId: session.userId,
      isDemo: false,
      email: session.email,
      name: session.email.split("@")[0],
    };
  }

  const cookieStore = cookies();
  const demoVal =
    req?.cookies.get(DEMO_COOKIE)?.value ?? cookieStore.get(DEMO_COOKIE)?.value;

  if (demoVal === "1") {
    return {
      userId: getDemoUserId(),
      isDemo: true,
      email: DEMO_EMAIL,
      name: DEMO_NAME,
    };
  }

  return null;
}
