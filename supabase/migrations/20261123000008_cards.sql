-- ════════════════════════════════════════════════════════════════════
-- 08 · Tarjetas, gastos con cuotas y períodos de resumen
-- ════════════════════════════════════════════════════════════════════

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  bank text check (char_length(bank) <= 40),
  holder_id uuid,
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  color public.palette_color not null default 'azul',
  last4 text check (last4 ~ '^\d{4}$'),
  is_active boolean not null default true,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, id),
  foreign key (household_id, holder_id)
    references public.household_members (household_id, user_id) on delete set null (holder_id)
);

-- Período (primer día del mes) del resumen en el que cae una compra.
-- El cierre del mes es min(closing_day, último día del mes); si la compra
-- es hasta el cierre va a ese mes, si no, al siguiente.
create or replace function public.statement_period(p_date date, p_closing_day integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when p_date <= make_date(
      extract(year from p_date)::int,
      extract(month from p_date)::int,
      least(p_closing_day, extract(day from (date_trunc('month', p_date) + interval '1 month - 1 day'))::int)
    )
    then date_trunc('month', p_date)::date
    else (date_trunc('month', p_date) + interval '1 month')::date
  end;
$$;

create table public.card_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  card_id uuid not null,
  purchase_date date not null,
  description text not null check (char_length(btrim(description)) between 1 and 140),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  installments_count smallint not null default 1 check (installments_count between 1 and 60),
  is_private boolean not null default false,
  notes text check (char_length(notes) <= 500),
  -- Categorización (ver lib/ai)
  category_id uuid,
  category_source text check (category_source in ('ai', 'rule', 'user')),
  ai_confidence numeric(3, 2) check (ai_confidence between 0 and 1),
  ai_reason text check (char_length(ai_reason) <= 300),
  needs_review boolean not null default false,
  categorization_status text not null default 'done'
    check (categorization_status in ('categorizing', 'done', 'failed')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, id),
  foreign key (household_id, card_id) references public.cards (household_id, id) on delete cascade,
  foreign key (household_id, category_id)
    references public.categories (household_id, id) on delete set null (category_id)
);

create index card_expenses_household_idx on public.card_expenses (household_id, purchase_date desc);
create index card_expenses_review_idx on public.card_expenses (household_id) where needs_review;
create index card_expenses_categorizing_idx on public.card_expenses (household_id, updated_at)
  where categorization_status = 'categorizing';

create table public.card_installments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  card_expense_id uuid not null,
  card_id uuid not null,
  installment_number smallint not null check (installment_number >= 1),
  installments_count smallint not null check (installments_count >= 1),
  period date not null check (extract(day from period) = 1),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null check (currency in ('ARS', 'USD')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (card_expense_id, installment_number),
  foreign key (household_id, card_expense_id) references public.card_expenses (household_id, id) on delete cascade,
  foreign key (household_id, card_id) references public.cards (household_id, id) on delete cascade
);

create index card_installments_period_idx on public.card_installments (household_id, period);
create index card_installments_card_period_idx on public.card_installments (card_id, period);

-- Regenera las cuotas de un gasto: una por período, centavos exactos y la
-- última absorbe la diferencia (Σ cuotas = total).
create or replace function private.regenerate_installments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  closing integer;
  first_period date;
  total_cents bigint;
  base_cents bigint;
  n integer;
begin
  delete from public.card_installments where card_expense_id = new.id;

  select c.closing_day into closing from public.cards c where c.id = new.card_id;
  first_period := public.statement_period(new.purchase_date, closing);
  n := new.installments_count;
  total_cents := round(new.amount * 100)::bigint;
  base_cents := total_cents / n;

  insert into public.card_installments (
    household_id, card_expense_id, card_id, installment_number, installments_count, period, amount, currency, created_by
  )
  select new.household_id, new.id, new.card_id, i, n,
         (first_period + make_interval(months => i - 1))::date,
         (case when i = n then total_cents - base_cents * (n - 1) else base_cents end) / 100.0,
         new.currency, new.created_by
  from generate_series(1, n) as i;

  return null;
end;
$$;

create trigger regenerate_installments
  after insert or update of amount, installments_count, purchase_date, card_id, currency
  on public.card_expenses
  for each row execute function private.regenerate_installments();

-- ── Vínculos que no podían existir antes de esta migración ──────────
alter table public.pending_purchases add column card_expense_id uuid;
alter table public.pending_purchases
  add constraint pending_purchases_card_expense_fk
  foreign key (household_id, card_expense_id)
  references public.card_expenses (household_id, id) on delete set null (card_expense_id);

alter table public.fixed_expenses add column card_id uuid;
alter table public.fixed_expenses
  add constraint fixed_expenses_card_fk
  foreign key (household_id, card_id)
  references public.cards (household_id, id) on delete set null (card_id);

-- ── Triggers estándar ───────────────────────────────────────────────
select private.attach_standard_triggers('public.cards');
select private.attach_standard_triggers('public.card_expenses');
create trigger set_updated_at before update on public.card_installments
  for each row execute function private.set_updated_at();
create trigger keep_household_id before update on public.cards
  for each row execute function private.keep_household_id();
create trigger keep_household_id before update on public.card_expenses
  for each row execute function private.keep_household_id();
-- Las cuotas no mandan señal propia: el cambio del gasto ya la manda.

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.cards enable row level security;
alter table public.card_expenses enable row level security;
alter table public.card_installments enable row level security;

create policy "miembros ven tarjetas" on public.cards
  for select to authenticated using (private.is_member(household_id));
create policy "miembros crean tarjetas" on public.cards
  for insert to authenticated with check (private.is_member(household_id) and created_by = (select auth.uid()));
create policy "miembros editan tarjetas" on public.cards
  for update to authenticated using (private.is_member(household_id)) with check (private.is_member(household_id));
create policy "miembros borran tarjetas" on public.cards
  for delete to authenticated using (private.is_member(household_id));

create policy "ver gastos de tarjeta compartidos o propios" on public.card_expenses
  for select to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));
create policy "crear gastos de tarjeta" on public.card_expenses
  for insert to authenticated
  with check (private.is_member(household_id) and created_by = (select auth.uid()));
create policy "editar gastos de tarjeta compartidos o propios" on public.card_expenses
  for update to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())))
  with check (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));
create policy "borrar gastos de tarjeta compartidos o propios" on public.card_expenses
  for delete to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));

-- Las cuotas heredan la visibilidad del gasto y solo las escribe el trigger.
create policy "ver cuotas de gastos visibles" on public.card_installments
  for select to authenticated
  using (exists (select 1 from public.card_expenses e where e.id = card_expense_id));
