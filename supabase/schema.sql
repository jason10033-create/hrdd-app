-- Moxa Risk Due Diligence & Management - Supabase schema
-- Run once in Supabase > SQL Editor. Safe to re-run.
--
-- Access model (owner's decision): no Supabase Auth accounts. The 5 pages (MAT/MCN/MUS/MEU + admin)
-- are protected by passwords checked in the browser; the tables below are open to the anon key.
-- Anyone with the site URL and technical skills can therefore read/write the data directly.

-- ---------- tables ----------
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists public.responses (
  id text primary key default gen_random_uuid()::text,
  cycle text not null,
  unit text not null,
  group_label text,
  name text,
  email text,
  lang text,
  submitted_at timestamptz default now(),
  source text not null default 'manual' check (source in ('manual', 'forms', 'aggregate')),
  answers jsonb not null,
  item_comments jsonb,
  comment text,
  adjusted jsonb,
  adjust_log jsonb,
  weight numeric default 1,
  note text
);
create index if not exists responses_cycle_unit on public.responses (cycle, unit);

create table if not exists public.inventories (
  unit text not null,
  cycle text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  primary key (unit, cycle)
);

create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz default now(),
  user_id uuid,
  actor text,
  action text,
  detail jsonb
);

-- ---------- clean up objects from the earlier account-based version (if it was run) ----------
drop function if exists public.admin_set_password(text, text);
drop function if exists public.get_scores(text);
drop policy if exists resp_insert_public on public.responses;
drop policy if exists resp_insert_import on public.responses;
drop policy if exists resp_select on public.responses;
drop policy if exists resp_update on public.responses;
drop policy if exists resp_delete on public.responses;
drop policy if exists config_read on public.app_config;
drop policy if exists config_write on public.app_config;
drop policy if exists inv_all on public.inventories;
drop policy if exists audit_insert on public.audit_log;
drop policy if exists audit_read on public.audit_log;
drop table if exists public.profiles cascade;
drop function if exists public.cycle_open(text);
drop function if exists public.is_admin();
drop function if exists public.my_unit();

-- ---------- open access for the anon key (front-end password protection only) ----------
alter table public.app_config enable row level security;
alter table public.responses enable row level security;
alter table public.inventories enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists open_all on public.app_config;
create policy open_all on public.app_config for all to anon, authenticated using (true) with check (true);
drop policy if exists open_all on public.responses;
create policy open_all on public.responses for all to anon, authenticated using (true) with check (true);
drop policy if exists open_all on public.inventories;
create policy open_all on public.inventories for all to anon, authenticated using (true) with check (true);
drop policy if exists open_all on public.audit_log;
create policy open_all on public.audit_log for all to anon, authenticated using (true) with check (true);

-- ---------- default cycle ----------
insert into public.app_config (key, value) values
('cycles', '[{"id":"2026","name":"2026","open":true,"active":true}]')
on conflict (key) do nothing;

-- ---------- MHQ 2025 results reused for the 2026 cycle (aggregated, no personal data) ----------
insert into public.responses (id, cycle, unit, group_label, name, source, weight, note, submitted_at, answers) values
('mhq2025-HRBP', '2026', 'MHQ', 'HRBP', 'HRBP', 'aggregate', 1, '2025 MHQ', '2025-10-01',
 '{"q1":{"p":1.1666666667,"s":1.4166666667},"q2":{"p":1.3333333333,"s":1.75},"q3":{"p":1,"s":1.3333333333},"q4":{"p":1,"s":1.4166666667},"q5":{"p":1.0833333333,"s":1.4166666667},"q6":{"p":1.5,"s":1.75},"q7":{"p":1.6666666667,"s":1.6666666667},"q8":{"p":1.1666666667,"s":1.25},"q9":{"p":1.1666666667,"s":1.3333333333}}'),
('mhq2025-RM', '2026', 'MHQ', 'RM', 'RM', 'aggregate', 1, '2025 MHQ', '2025-10-01',
 '{"q1":{"p":1.3333333333,"s":2.5833333333},"q2":{"p":1.5833333333,"s":3.0833333333},"q3":{"p":1,"s":2.4166666667},"q4":{"p":1,"s":2.5},"q5":{"p":1.25,"s":2.3333333333},"q6":{"p":1.1666666667,"s":2.6666666667},"q7":{"p":1.5,"s":2.5833333333},"q8":{"p":1.1666666667,"s":2.1666666667},"q9":{"p":1.3333333333,"s":2.25}}')
on conflict (id) do nothing;
