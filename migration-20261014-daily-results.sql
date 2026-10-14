-- Add daily P/L tracking to the existing CandleX Supabase project.
-- This is additive: it preserves the current JSONB accounts, trades, and images.

create table if not exists public.daily_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id text not null check (account_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  trade_date date not null,
  pnl numeric(14,2) not null default 0,
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_results_user_account_date_unique unique (user_id, account_id, trade_date)
);

create index if not exists daily_results_user_date_idx
  on public.daily_results (user_id, trade_date desc);

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

drop trigger if exists daily_results_touch_updated_at on public.daily_results;
create trigger daily_results_touch_updated_at
before update on public.daily_results
for each row execute function public.candlex_touch_updated_at();

alter table public.daily_results enable row level security;
grant select, insert, update, delete on public.daily_results to authenticated;

drop policy if exists "CandleX users manage own daily results" on public.daily_results;
create policy "CandleX users manage own daily results"
on public.daily_results for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace view public.account_month_summary
with (security_invoker = true) as
select
  account_id,
  date_trunc('month', trade_date)::date as month,
  sum(pnl) as net_pnl,
  coalesce(sum(pnl) filter (where pnl > 0), 0) as gross_profit,
  coalesce(sum(pnl) filter (where pnl < 0), 0) as gross_loss,
  count(*) filter (where pnl > 0) as win_days,
  count(*) filter (where pnl < 0) as loss_days,
  max(pnl) as best_day,
  min(pnl) as worst_day
from public.daily_results
group by account_id, date_trunc('month', trade_date);

grant select on public.account_month_summary to authenticated;
