export const DEMO_COOKIE = "krews_demo";

export interface RequestAuth {
  userId: string;
  isDemo: boolean;
  email?: string | null;
  name?: string | null;
}
