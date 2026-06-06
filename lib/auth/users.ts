import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { hashPassword, verifyPassword } from "./password";

const DEMO_SANDBOX_EMAIL = "demo-sandbox@krewsagent.local";

export interface AppUser {
  id: string;
  email: string;
  name: string;
}

export interface UserRow extends AppUser {
  password_hash: string | null;
}

export async function findUserRowByEmail(email: string): Promise<UserRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, password_hash")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    name: data.name ?? data.email.split("@")[0],
    password_hash: data.password_hash ?? null,
  };
}

export async function findUserByEmail(
  email: string
): Promise<(AppUser & { password_hash: string }) | null> {
  const row = await findUserRowByEmail(email);
  if (!row?.password_hash) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    password_hash: row.password_hash,
  };
}

/**
 * Create a new account, or set a password on an orphaned row (old Supabase Auth
 * provision without password_hash).
 */
export async function createUserWithPassword(
  email: string,
  password: string,
  name: string
): Promise<AppUser> {
  const supabase = createServiceClient();
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = name.trim();
  const password_hash = await hashPassword(password);

  const existing = await findUserRowByEmail(normalizedEmail);

  if (existing) {
    if (existing.password_hash) {
      throw new Error("Email already registered");
    }
    const { error } = await supabase
      .from("users")
      .update({ password_hash, name: trimmedName })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return {
      id: existing.id,
      email: normalizedEmail,
      name: trimmedName,
    };
  }

  const id = randomUUID();
  const { error } = await supabase.from("users").insert({
    id,
    email: normalizedEmail,
    name: trimmedName,
    password_hash,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { id, email: normalizedEmail, name: trimmedName };
}

export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<AppUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

/** Any non-demo account by email (with or without password yet). */
export async function findAccountByEmailForReset(
  email: string
): Promise<AppUser | null> {
  const row = await findUserRowByEmail(email);
  if (!row || row.email === DEMO_SANDBOX_EMAIL) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}

export async function userNeedsPasswordSetup(email: string): Promise<boolean> {
  const row = await findUserRowByEmail(email);
  return !!row && !row.password_hash && row.email !== DEMO_SANDBOX_EMAIL;
}

export async function updateUserPassword(
  userId: string,
  password: string
): Promise<void> {
  const supabase = createServiceClient();
  const password_hash = await hashPassword(password);
  const { error } = await supabase
    .from("users")
    .update({ password_hash })
    .eq("id", userId);

  if (error) {
    throw new Error(`password update failed: ${error.message}`);
  }
}
