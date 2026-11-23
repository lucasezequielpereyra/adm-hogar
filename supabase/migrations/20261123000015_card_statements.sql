-- ════════════════════════════════════════════════════════════════════
-- 15 · Resúmenes de tarjeta por mes
-- Cada resumen (tarjeta + período) puede tener su fecha real de cierre y
-- de vencimiento (los bancos las mueven mes a mes) y si ya se pagó.
-- - Si no hay fila, valen los días de la tarjeta (closing_day / due_day):
--   sin resúmenes cargados, todo queda igual que antes.
-- - A qué resumen va una compra: el primero cuyo cierre es >= la fecha.
-- - Cambiar un cierre regenera las cuotas de las compras afectadas.
-- ════════════════════════════════════════════════════════════════════

create table public.card_statements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  card_id uuid not null,
  period date not null check (extract(day from period) = 1),
  closing_date date not null,
  due_date date not null,
  paid_at date,
  paid_by uuid references public.profiles (id) on delete set null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (card_id, period),
  unique (household_id, id),
  foreign key (household_id, card_id) references public.cards (household_id, id) on delete cascade,
  -- El cierre cae cerca de su mes (así los períodos no se pisan) y el
  -- vencimiento, después del cierre.
  constraint card_statements_closing_near_period
    check (closing_date >= period - 15 and closing_date < (period + interval '1 month')::date + 15),
  constraint card_statements_due_after_closing
    check (due_date > closing_date and due_date <= closing_date + 45)
);

create index card_statements_household_idx on public.card_statements (household_id, period);

select private.attach_standard_triggers('public.card_statements');
create trigger keep_household_id before update on public.card_statements
  for each row execute function private.keep_household_id();

alter table public.card_statements enable row level security;

create policy "miembros ven resúmenes" on public.card_statements
  for select to authenticated using (private.is_member(household_id));
create policy "miembros crean resúmenes" on public.card_statements
  for insert to authenticated
  with check (private.is_member(household_id) and created_by = (select auth.uid()));
create policy "miembros editan resúmenes" on public.card_statements
  for update to authenticated
  using (private.is_member(household_id)) with check (private.is_member(household_id));
create policy "miembros borran resúmenes" on public.card_statements
  for delete to authenticated using (private.is_member(household_id));

-- ── A qué resumen va una compra ─────────────────────────────────────
-- Recorre desde el mes anterior: el primer período cuyo cierre (el real
-- si está cargado, si no el del día de la tarjeta) es >= la fecha. Gemelo
-- de cardStatementPeriod en lib/domain/periods.ts.
create or replace function private.card_statement_period(p_card_id uuid, p_date date)
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cday integer;
  p date := (date_trunc('month', p_date) - interval '1 month')::date;
  closing date;
begin
  select c.closing_day into cday from public.cards c where c.id = p_card_id;
  for i in 0..3 loop
    select s.closing_date into closing from public.card_statements s
    where s.card_id = p_card_id and s.period = p;
    if closing is null then
      closing := make_date(
        extract(year from p)::int, extract(month from p)::int,
        least(cday, extract(day from (p + interval '1 month - 1 day'))::int));
    end if;
    if p_date <= closing then
      return p;
    end if;
    p := (p + interval '1 month')::date;
    closing := null;
  end loop;
  return p;
end;
$$;

-- ── Cuotas: una función por gasto (la usan los dos triggers) ────────
create or replace function private.regenerate_expense_installments(e public.card_expenses)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_period date;
  total_cents bigint;
  base_cents bigint;
  n integer;
begin
  delete from public.card_installments where card_expense_id = e.id;

  first_period := private.card_statement_period(e.card_id, e.purchase_date);
  n := e.installments_count;
  total_cents := round(e.amount * 100)::bigint;
  base_cents := total_cents / n;

  insert into public.card_installments (
    household_id, card_expense_id, card_id, installment_number, installments_count, period, amount, currency, created_by
  )
  select e.household_id, e.id, e.card_id, i, n,
         (first_period + make_interval(months => i - 1))::date,
         (case when i = n then total_cents - base_cents * (n - 1) else base_cents end) / 100.0,
         e.currency, e.created_by
  from generate_series(1, n) as i;
end;
$$;

create or replace function private.regenerate_installments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.regenerate_expense_installments(new);
  return null;
end;
$$;

-- Si cambia (o aparece, o se borra) el cierre de un resumen, se recalculan
-- las compras de esa tarjeta cercanas al cierre viejo y al nuevo.
create or replace function private.statement_closing_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid := coalesce(new.card_id, old.card_id);
  lo date;
  hi date;
  e public.card_expenses;
begin
  if tg_op = 'UPDATE' and new.closing_date = old.closing_date and new.card_id = old.card_id then
    return null;
  end if;
  -- Se está borrando la tarjeta (o el hogar): sus gastos se van igual.
  if not exists (select 1 from public.cards c where c.id = cid) then
    return null;
  end if;
  lo := least(coalesce(old.closing_date, new.closing_date), coalesce(new.closing_date, old.closing_date)) - 45;
  hi := greatest(coalesce(old.closing_date, new.closing_date), coalesce(new.closing_date, old.closing_date)) + 45;
  for e in
    select * from public.card_expenses x
    where x.card_id = cid and x.purchase_date between lo and hi
  loop
    perform private.regenerate_expense_installments(e);
  end loop;
  return null;
end;
$$;

create trigger statement_closing_changed
  after insert or update of closing_date or delete on public.card_statements
  for each row execute function private.statement_closing_changed();
