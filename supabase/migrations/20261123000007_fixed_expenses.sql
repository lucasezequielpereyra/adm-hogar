-- ════════════════════════════════════════════════════════════════════
-- 07 · Gastos fijos y pagos mensuales
-- ════════════════════════════════════════════════════════════════════

create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  due_day smallint not null check (due_day between 1 and 31),
  payment_method text not null default 'debito'
    check (payment_method in ('debito', 'tarjeta', 'transferencia', 'efectivo', 'otro')),
  responsible_id uuid,
  is_active boolean not null default true,
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
  foreign key (household_id, category_id)
    references public.categories (household_id, id) on delete set null (category_id),
  foreign key (household_id, responsible_id)
    references public.household_members (household_id, user_id) on delete set null (responsible_id)
);

create index fixed_expenses_household_idx on public.fixed_expenses (household_id, is_active, due_day);
create index fixed_expenses_review_idx on public.fixed_expenses (household_id) where needs_review;

create table public.fixed_expense_payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  fixed_expense_id uuid not null,
  period date not null check (extract(day from period) = 1),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  paid_at date not null default current_date,
  paid_by uuid references public.profiles (id) on delete set null,
  notes text check (char_length(notes) <= 300),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fixed_expense_id, period),
  foreign key (household_id, fixed_expense_id)
    references public.fixed_expenses (household_id, id) on delete cascade
);

create index fixed_expense_payments_period_idx on public.fixed_expense_payments (household_id, period);

select private.attach_standard_triggers('public.fixed_expenses');
select private.attach_standard_triggers('public.fixed_expense_payments');
create trigger keep_household_id before update on public.fixed_expenses
  for each row execute function private.keep_household_id();
create trigger keep_household_id before update on public.fixed_expense_payments
  for each row execute function private.keep_household_id();

alter table public.fixed_expenses enable row level security;
alter table public.fixed_expense_payments enable row level security;

create policy "ver fijos compartidos o propios" on public.fixed_expenses
  for select to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));
create policy "crear fijos" on public.fixed_expenses
  for insert to authenticated
  with check (private.is_member(household_id) and created_by = (select auth.uid()));
create policy "editar fijos compartidos o propios" on public.fixed_expenses
  for update to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())))
  with check (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));
create policy "borrar fijos compartidos o propios" on public.fixed_expenses
  for delete to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));

-- Los pagos heredan la visibilidad del gasto fijo.
create policy "ver pagos de fijos visibles" on public.fixed_expense_payments
  for select to authenticated
  using (exists (select 1 from public.fixed_expenses f where f.id = fixed_expense_id));
create policy "registrar pagos de fijos visibles" on public.fixed_expense_payments
  for insert to authenticated
  with check (
    private.is_member(household_id)
    and created_by = (select auth.uid())
    and exists (select 1 from public.fixed_expenses f where f.id = fixed_expense_id)
  );
create policy "editar pagos de fijos visibles" on public.fixed_expense_payments
  for update to authenticated
  using (exists (select 1 from public.fixed_expenses f where f.id = fixed_expense_id))
  with check (exists (select 1 from public.fixed_expenses f where f.id = fixed_expense_id));
create policy "borrar pagos de fijos visibles" on public.fixed_expense_payments
  for delete to authenticated
  using (exists (select 1 from public.fixed_expenses f where f.id = fixed_expense_id));
