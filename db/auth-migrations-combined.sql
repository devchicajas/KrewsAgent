-- Run once in Supabase → SQL Editor (fixes sign-up / sign-in / forgot-password)

alter table users add column if not exists password_hash text;

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists password_reset_tokens_hash_idx on password_reset_tokens(token_hash);
