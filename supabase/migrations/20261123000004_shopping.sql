-- ════════════════════════════════════════════════════════════════════
-- 04 · Compra del mes: listas mensuales, plantillas e ítems
-- ════════════════════════════════════════════════════════════════════

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  month date check (month is null or extract(day from month) = 1),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  is_template boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, id),
  check (is_template or month is not null)
);

-- Una sola lista por mes (las plantillas no tienen mes).
create unique index shopping_lists_month_uniq on public.shopping_lists (household_id, month) where not is_template;

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  list_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit text not null default 'u' check (unit in ('u', 'kg', 'g', 'l', 'ml', 'paq')),
  category text not null default 'otros'
    check (category in ('almacen', 'limpieza', 'higiene', 'frescos', 'bebidas', 'mascotas', 'otros')),
  -- Precio estimado y real: total de la línea.
  estimated_price numeric(14, 2) check (estimated_price >= 0),
  actual_price numeric(14, 2) check (actual_price >= 0),
  is_purchased boolean not null default false,
  purchased_by uuid references public.profiles (id) on delete set null,
  purchased_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (household_id, list_id) references public.shopping_lists (household_id, id) on delete cascade
);

create index shopping_items_list_idx on public.shopping_items (list_id, category, sort_order);

-- Crea una lista (de un mes o plantilla), opcionalmente copiando los ítems
-- de otra. Corre con los permisos del usuario (RLS aplica).
create or replace function public.create_shopping_list(
  p_household_id uuid,
  p_name text,
  p_month date default null,
  p_is_template boolean default false,
  p_source_list_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not p_is_template and exists (
    select 1 from public.shopping_lists l
    where l.household_id = p_household_id and l.month = p_month and not l.is_template
  ) then
    raise exception 'Ya existe la lista de ese mes' using errcode = '23505';
  end if;

  insert into public.shopping_lists (household_id, month, name, is_template, created_by)
  values (p_household_id, case when p_is_template then null else p_month end, btrim(p_name), p_is_template, auth.uid())
  returning id into new_id;

  if p_source_list_id is not null then
    insert into public.shopping_items (household_id, list_id, name, quantity, unit, category, estimated_price, sort_order, created_by)
    select p_household_id, new_id, i.name, i.quantity, i.unit, i.category,
           coalesce(i.actual_price, i.estimated_price), i.sort_order, auth.uid()
    from public.shopping_items i
    where i.list_id = p_source_list_id and i.household_id = p_household_id;
  end if;

  return new_id;
end;
$$;

revoke execute on function public.create_shopping_list(uuid, text, date, boolean, uuid) from anon;
grant execute on function public.create_shopping_list(uuid, text, date, boolean, uuid) to authenticated;

-- ── Triggers estándar ───────────────────────────────────────────────
select private.attach_standard_triggers('public.shopping_lists');
select private.attach_standard_triggers('public.shopping_items');
create trigger keep_household_id before update on public.shopping_lists
  for each row execute function private.keep_household_id();
create trigger keep_household_id before update on public.shopping_items
  for each row execute function private.keep_household_id();

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;

create policy "miembros ven listas" on public.shopping_lists
  for select to authenticated using (private.is_member(household_id));
create policy "miembros crean listas" on public.shopping_lists
  for insert to authenticated with check (private.is_member(household_id) and created_by = (select auth.uid()));
create policy "miembros editan listas" on public.shopping_lists
  for update to authenticated using (private.is_member(household_id)) with check (private.is_member(household_id));
create policy "miembros borran listas" on public.shopping_lists
  for delete to authenticated using (private.is_member(household_id));

create policy "miembros ven ítems" on public.shopping_items
  for select to authenticated using (private.is_member(household_id));
create policy "miembros crean ítems" on public.shopping_items
  for insert to authenticated with check (private.is_member(household_id) and created_by = (select auth.uid()));
create policy "miembros editan ítems" on public.shopping_items
  for update to authenticated using (private.is_member(household_id)) with check (private.is_member(household_id));
create policy "miembros borran ítems" on public.shopping_items
  for delete to authenticated using (private.is_member(household_id));
