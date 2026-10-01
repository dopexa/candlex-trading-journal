-- CandleX hosted authentication and private trade storage.
-- Run this once in the Supabase SQL Editor for the CandleX project.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{"currency":"USD","theme":"dark"}'::jsonb,
  accounts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_preferences_settings_object check (jsonb_typeof(settings) = 'object'),
  constraint user_preferences_accounts_array check (jsonb_typeof(accounts) = 'array')
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trade_date date not null,
  trade_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trades_data_object check (jsonb_typeof(trade_data) = 'object'),
  constraint trades_id_user_id_unique unique (id, user_id)
);

create index if not exists trades_user_date_idx
  on public.trades (user_id, trade_date desc, created_at desc);

create table if not exists public.trade_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trade_id uuid not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  created_at timestamptz not null default now(),
  constraint trade_images_trade_owner_fk foreign key (trade_id, user_id)
    references public.trades (id, user_id) on delete cascade
);

create index if not exists trade_images_trade_idx
  on public.trade_images (trade_id, user_id, created_at, id);

create or replace function public.candlex_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_preferences_touch_updated_at on public.user_preferences;
create trigger user_preferences_touch_updated_at
before update on public.user_preferences
for each row execute function public.candlex_touch_updated_at();

drop trigger if exists trades_touch_updated_at on public.trades;
create trigger trades_touch_updated_at
before update on public.trades
for each row execute function public.candlex_touch_updated_at();

-- Give every newly registered user a private default preferences row.
create or replace function public.candlex_create_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists candlex_create_preferences_after_signup on auth.users;
create trigger candlex_create_preferences_after_signup
after insert on auth.users
for each row execute function public.candlex_create_user_preferences();

-- Keep the five-image limit enforced by the database as well as the UI.
create or replace function public.candlex_limit_trade_images()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.trade_id::text, 0));
  if (select count(*) from public.trade_images where trade_id = new.trade_id and user_id = new.user_id) >= 5 then
    raise exception 'A trade can have at most five screenshots.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trade_images_limit_per_trade on public.trade_images;
create trigger trade_images_limit_per_trade
before insert on public.trade_images
for each row execute function public.candlex_limit_trade_images();

alter table public.user_preferences enable row level security;
alter table public.trades enable row level security;
alter table public.trade_images enable row level security;

grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.trades to authenticated;
grant select, insert, update, delete on public.trade_images to authenticated;

drop policy if exists "CandleX users manage own preferences" on public.user_preferences;
create policy "CandleX users manage own preferences"
on public.user_preferences for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "CandleX users manage own trades" on public.trades;
create policy "CandleX users manage own trades"
on public.trades for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "CandleX users manage own image records" on public.trade_images;
create policy "CandleX users manage own image records"
on public.trade_images for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- A private Storage bucket. The browser may use only the publishable key;
-- these policies restrict every object to a folder named with its owner's UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-screenshots',
  'trade-screenshots',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "CandleX users read own screenshots" on storage.objects;
create policy "CandleX users read own screenshots"
on storage.objects for select to authenticated
using (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "CandleX users upload own screenshots" on storage.objects;
create policy "CandleX users upload own screenshots"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "CandleX users delete own screenshots" on storage.objects;
create policy "CandleX users delete own screenshots"
on storage.objects for delete to authenticated
using (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
