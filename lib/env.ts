import { z } from "zod";

const envSchema = z.object({
  TARS_API_KEY: z.string().optional(),
  TARS_BASE_URL: z.string().default("https://api.router.tetrate.ai/v1"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().default("demoprojectz56t-max"),
  GITHUB_REPO: z.string().default("concept-to-code-dash"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  DEMO_MODE: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .default("true"),
  DEMO_USER_ID: z.string().uuid().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  SUPABASE_DB_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}

const STABLE_DEMO_ID = "c0ffee00-0000-4000-8000-000000000001";

export function getDemoUserId(): string {
  return process.env.DEMO_USER_ID || STABLE_DEMO_ID;
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1" || !process.env.DEMO_MODE;
}
