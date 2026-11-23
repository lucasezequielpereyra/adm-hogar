-- ════════════════════════════════════════════════════════════════════
-- 09 · IA: logs de categorización y rate limit por hogar
-- ════════════════════════════════════════════════════════════════════

create table public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  entity_type text not null check (entity_type in ('card_expense', 'fixed_expense', 'pending_purchase')),
  entity_id uuid not null,
  source text check (source in ('ai', 'rule', 'fallback')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  model text,
  latency_ms integer,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  error text,
  -- Privacidad heredada del gasto: los logs de ítems personales solo los ve su dueño.
  is_private boolean not null default false,
  owner_id uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_logs_household_idx on public.ai_logs (household_id, created_at desc);

create trigger set_updated_at before update on public.ai_logs
  for each row execute function private.set_updated_at();

alter table public.ai_logs enable row level security;

-- Los admins leen los logs del hogar, salvo los de ítems personales ajenos.
-- Solo el servidor escribe, con la secret key.
create policy "admins leen logs de IA" on public.ai_logs
  for select to authenticated
  using (private.is_admin(household_id) and (not is_private or owner_id = (select auth.uid())));

-- ── Rate limit por hogar (ventanas fijas de minuto y día) ───────────
create table public.ai_usage_counters (
  household_id uuid not null references public.households (id) on delete cascade,
  window_kind text not null check (window_kind in ('minute', 'day')),
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (household_id, window_kind, window_start)
);

alter table public.ai_usage_counters enable row level security;
-- Sin policies: solo service_role.

-- Suma `p_cost` llamadas si hay cupo en las dos ventanas. Atómico gracias
-- al upsert; si se pasa, revierte y devuelve false.
create or replace function public.consume_ai_quota(
  p_household_id uuid,
  p_cost integer,
  p_per_minute integer,
  p_per_day integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  minute_count integer;
  day_count integer;
  minute_start timestamptz := date_trunc('minute', now());
  day_start timestamptz := date_trunc('day', now());
begin
  insert into public.ai_usage_counters (household_id, window_kind, window_start, count)
  values (p_household_id, 'minute', minute_start, p_cost)
  on conflict (household_id, window_kind, window_start)
  do update set count = public.ai_usage_counters.count + excluded.count
  returning count into minute_count;

  insert into public.ai_usage_counters (household_id, window_kind, window_start, count)
  values (p_household_id, 'day', day_start, p_cost)
  on conflict (household_id, window_kind, window_start)
  do update set count = public.ai_usage_counters.count + excluded.count
  returning count into day_count;

  if minute_count > p_per_minute or day_count > p_per_day then
    update public.ai_usage_counters set count = count - p_cost
    where household_id = p_household_id
      and ((window_kind = 'minute' and window_start = minute_start) or (window_kind = 'day' and window_start = day_start));
    return false;
  end if;

  -- Limpieza oportunista de ventanas viejas.
  if random() < 0.02 then
    delete from public.ai_usage_counters where window_start < now() - interval '3 days';
  end if;

  return true;
end;
$$;

revoke execute on function public.consume_ai_quota(uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, integer, integer, integer) to service_role;
