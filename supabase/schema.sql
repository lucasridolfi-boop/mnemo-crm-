-- Mnemo — cloud sync schema. Run once in Supabase: SQL Editor → New query → paste → Run.
-- Safe to run again.

create table if not exists public.mnemo_items (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('person', 'deal', 'li')),
  id         text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  updated_ms bigint      not null,
  server_at  timestamptz not null default now(),
  primary key (user_id, kind, id)
);

create index if not exists mnemo_items_pull on public.mnemo_items (user_id, server_at);

-- Every write gets a fresh server timestamp, so other devices can ask "what changed since X?".
create or replace function public.mnemo_touch() returns trigger
language plpgsql as $$
begin
  new.server_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists mnemo_items_touch on public.mnemo_items;
create trigger mnemo_items_touch before insert or update on public.mnemo_items
for each row execute function public.mnemo_touch();

-- Row level security: each account can only see and change its own rows.
alter table public.mnemo_items enable row level security;

drop policy if exists "own rows: read"   on public.mnemo_items;
drop policy if exists "own rows: insert" on public.mnemo_items;
drop policy if exists "own rows: update" on public.mnemo_items;
drop policy if exists "own rows: delete" on public.mnemo_items;

create policy "own rows: read"   on public.mnemo_items for select to authenticated using (auth.uid() = user_id);
create policy "own rows: insert" on public.mnemo_items for insert to authenticated with check (auth.uid() = user_id);
create policy "own rows: update" on public.mnemo_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows: delete" on public.mnemo_items for delete to authenticated using (auth.uid() = user_id);

revoke all on public.mnemo_items from anon;
grant select, insert, update, delete on public.mnemo_items to authenticated;
