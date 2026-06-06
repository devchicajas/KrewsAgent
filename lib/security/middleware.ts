import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveRequestAuth } from "@/lib/auth/resolveUser";
import type { RequestAuth } from "@/lib/auth/types";
import { checkRateLimit } from "./rateLimit";
import { writeAuditEntry } from "./audit";

type RouteHandler = (
  req: NextRequest,
  body: unknown,
  auth: RequestAuth
) => Promise<NextResponse>;

interface SecurityOptions {
  method?: "POST" | "GET";
  schema?: z.ZodType;
  rateLimitRoute?: string;
  skipBody?: boolean;
  /** If false, allow unauthenticated (public routes). Default true. */
  requireAuth?: boolean;
}

export function withSecurity(handler: RouteHandler, options: SecurityOptions = {}) {
  const {
    method = "POST",
    schema,
    rateLimitRoute,
    skipBody = false,
    requireAuth = true,
  } = options;

  return async (req: NextRequest): Promise<NextResponse> => {
    if (req.method !== method) {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    const origin = req.headers.get("origin");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    if (origin && origin !== appUrl && !origin.includes("localhost")) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }

    const auth = await resolveRequestAuth(req);
    if (requireAuth && !auth) {
      return NextResponse.json({ error: "Unauthorized — sign in or try the demo" }, { status: 401 });
    }

    let body: unknown = {};
    if (!skipBody && method === "POST") {
      try {
        const text = await req.text();
        body = text.trim() ? JSON.parse(text) : {};
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      if (schema) {
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 400 }
          );
        }
        body = parsed.data;
      }
    }

    if (rateLimitRoute && auth) {
      try {
        const limit = await checkRateLimit(auth.userId, rateLimitRoute);
        if (!limit.allowed) {
          await writeAuditEntry({
            user_id: auth.userId,
            agent_type: "system",
            action: "rate_limited",
            reasoning: rateLimitRoute,
            status: "denied",
          }).catch(() => {});
          return NextResponse.json(
            { error: "Rate limited", retryAfterSec: limit.retryAfterSec },
            { status: 429 }
          );
        }
        if (rateLimitRoute === "/api/agent/run") {
          const minuteLimit = await checkRateLimit(auth.userId, "/api/agent/run/minute");
          if (!minuteLimit.allowed) {
            return NextResponse.json(
              { error: "Rate limited", retryAfterSec: minuteLimit.retryAfterSec },
              { status: 429 }
            );
          }
        }
      } catch {
        // allow if rate limit table unavailable during setup
      }
    }

    return handler(req, body, auth!);
  };
}
