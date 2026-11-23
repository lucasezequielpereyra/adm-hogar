-- ════════════════════════════════════════════════════════════════════
-- 06 · Compras pendientes (no recurrentes)
-- ════════════════════════════════════════════════════════════════════

create table public.pending_purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  kind text not null default 'hogar' check (kind in ('hogar', 'personal', 'otro')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  estimated_price numeric(14, 2) check (estimated_price >= 0),
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  url text check (char_length(url) <= 500),
  notes text check (char_length(notes) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'purchased')),
  requested_by uuid,
  purchased_at timestamptz,
  is_private boolean not null default false,
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
  foreign key (household_id, requested_by)
    references public.household_members (household_id, user_id) on delete set null (requested_by),
  check ((status = 'purchased') = (purchased_at is not null))
);

create index pending_purchases_household_idx on public.pending_purchases (household_id, status, created_at desc);
create index pending_purchases_review_idx on public.pending_purchases (household_id) where needs_review;

select private.attach_standard_triggers('public.pending_purchases');
create trigger keep_household_id before update on public.pending_purchases
  for each row execute function private.keep_household_id();

alter table public.pending_purchases enable row level security;

create policy "ver pendientes compartidas o propias" on public.pending_purchases
  for select to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));
create policy "crear pendientes" on public.pending_purchases
  for insert to authenticated
  with check (private.is_member(household_id) and created_by = (select auth.uid()));
create policy "editar pendientes compartidas o propias" on public.pending_purchases
  for update to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())))
  with check (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));
create policy "borrar pendientes compartidas o propias" on public.pending_purchases
  for delete to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));
