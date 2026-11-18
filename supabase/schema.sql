-- FinStack: tables and access rules for Supabase.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again; it only creates what is missing and replaces the policies.

-- One row per user: the imported workbook (with Monthly Track edits) and preferences.
create table if not exists public.finstack_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  model      jsonb,
  prefs      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- One row per Spend Tracker entry, so adding on the phone and on the PC never overwrite each other.
create table if not exists public.finstack_spends (
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id         text not null,
  date       date not null,
  amount     numeric(14, 2) not null check (amount > 0),
  cat        text not null,
  type       text not null check (type in ('need', 'want', 'savings')),
  note       text not null default '',
  at         bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists finstack_spends_user_date on public.finstack_spends (user_id, date);

-- Row Level Security: every signed-in user can see and change only their own rows.
alter table public.finstack_data enable row level security;
alter table public.finstack_spends enable row level security;

drop policy if exists "own data" on public.finstack_data;
create policy "own data" on public.finstack_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own spends" on public.finstack_spends;
create policy "own spends" on public.finstack_spends
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Signed-in users reach the tables through the Data API (the policies above still limit them to their own rows).
grant select, insert, update, delete on public.finstack_data, public.finstack_spends to authenticated;
-- Nobody who is signed out can read anything.
revoke all on public.finstack_data, public.finstack_spends from anon;
