-- KrewsAgent schema — run via `npm run setup` or Supabase SQL Editor

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  password_hash text,
  created_at timestamptz default now()
);

create table if not exists founder_context (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  founder_name text default 'Jordan',
  company text default 'KrewsAgent',
  stage text default 'Pre-seed, solo',
  persona text default 'AI Engineering Fellow, building nights and weekends',
  mrr int default 1240,
  mrr_change int default 340,
  runway_months int default 8,
  burn_rate int default 4200,
  created_at timestamptz default now(),
  unique (user_id)
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  agent_type text not null,
  action_title text not null,
  action_type text not null,
  risk_level text not null check (risk_level in ('low','medium','high')),
  reasoning text not null,
  preview text not null,
  consequence_approve text not null,
  consequence_reject text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','executed','denied')),
  security_flag text,
  acknowledged_high_risk boolean default false,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists approvals_status_idx on approvals(status);
create index if not exists approvals_user_idx on approvals(user_id);

create table if not exists action_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  agent_type text not null,
  action text not null,
  reasoning text,
  status text not null,
  tars_model text,
  details jsonb,
  prev_hash text,
  entry_hash text not null,
  created_at timestamptz default now()
);

create index if not exists action_log_created_idx on action_log(created_at);
create index if not exists action_log_user_idx on action_log(user_id);

create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  route text not null,
  window_start timestamptz not null default now(),
  count int not null default 1,
  unique (user_id, route, window_start)
);

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists password_reset_tokens_hash_idx on password_reset_tokens(token_hash);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  provider text not null,
  connected boolean default false,
  connected_at timestamptz,
  revoked_at timestamptz,
  payload jsonb default '{}',
  unique (user_id, provider)
);

-- Row Level Security: anon key reads only demo user rows
alter table approvals enable row level security;
alter table action_log enable row level security;
alter table founder_context enable row level security;

drop policy if exists "read own approvals" on approvals;
create policy "read own approvals" on approvals
  for select using (user_id = current_setting('app.demo_user_id', true)::uuid);

drop policy if exists "read own log" on action_log;
create policy "read own log" on action_log
  for select using (user_id = current_setting('app.demo_user_id', true)::uuid);

drop policy if exists "read own context" on founder_context;
create policy "read own context" on founder_context
  for select using (user_id = current_setting('app.demo_user_id', true)::uuid);
