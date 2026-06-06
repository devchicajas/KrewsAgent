-- Run after schema.sql when enabling Supabase Auth (Phase 1)
-- Supabase Dashboard → Authentication → Providers → enable Email

-- RLS: users read only their own rows (service role bypasses for API writes)
drop policy if exists "read own approvals" on approvals;
create policy "read own approvals" on approvals
  for select using (auth.uid() = user_id);

drop policy if exists "read own log" on action_log;
create policy "read own log" on action_log
  for select using (auth.uid() = user_id);

drop policy if exists "read own context" on founder_context;
create policy "read own context" on founder_context
  for select using (auth.uid() = user_id);

drop policy if exists "read own integrations" on integrations;
create policy "read own integrations" on integrations
  for select using (auth.uid() = user_id);

alter table integrations enable row level security;
