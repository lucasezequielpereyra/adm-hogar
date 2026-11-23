-- ════════════════════════════════════════════════════════════════════
-- 05 · Categorías de gastos, reglas aprendidas y correcciones
-- ════════════════════════════════════════════════════════════════════

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  color public.palette_color not null default 'gris',
  icon text not null default 'box',
  -- Texto que ayuda al LLM a decidir qué entra en la categoría.
  description text not null default '' check (char_length(description) <= 300),
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, id)
);

create unique index categories_name_uniq on public.categories (household_id, lower(name));
-- Una sola categoría de sistema ("Sin categorizar") por hogar.
create unique index categories_system_uniq on public.categories (household_id) where is_system;

-- La categoría de sistema no se borra ni deja de ser de sistema.
create or replace function private.guard_system_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system and exists (select 1 from public.households h where h.id = old.household_id) then
      raise exception '"Sin categorizar" no se puede borrar' using errcode = '42501';
    end if;
    return old;
  end if;
  if new.is_system is distinct from old.is_system then
    raise exception 'No se puede cambiar si una categoría es de sistema' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_system_category
  before update or delete on public.categories
  for each row execute function private.guard_system_category();

-- Al borrar una categoría, sus gastos pasan a "Sin categorizar" y quedan
-- marcados para revisar. Las tablas de gastos se crean en migraciones
-- posteriores: se resuelven en tiempo de ejecución.
create or replace function private.reassign_deleted_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sys_id uuid;
  tbl text;
begin
  if not exists (select 1 from public.households h where h.id = old.household_id) then
    return old; -- borrado en cascada del hogar
  end if;
  select c.id into sys_id from public.categories c where c.household_id = old.household_id and c.is_system;
  foreach tbl in array array['card_expenses', 'fixed_expenses', 'pending_purchases'] loop
    if to_regclass('public.' || tbl) is not null then
      execute format(
        'update public.%I set category_id = $1, category_source = null, needs_review = true where household_id = $2 and category_id = $3',
        tbl
      ) using sys_id, old.household_id, old.id;
    end if;
  end loop;
  return old;
end;
$$;

create trigger reassign_deleted_category
  before delete on public.categories
  for each row execute function private.reassign_deleted_category();

-- ── Reglas aprendidas (descripción normalizada → categoría) ─────────
create table public.category_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  pattern text not null check (char_length(pattern) between 3 and 80),
  category_id uuid not null,
  hits integer not null default 0,
  last_matched_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, pattern),
  foreign key (household_id, category_id) references public.categories (household_id, id) on delete cascade
);

-- ── Correcciones manuales (fuente de los ejemplos few-shot) ─────────
create table public.category_corrections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  entity_type text not null check (entity_type in ('card_expense', 'fixed_expense', 'pending_purchase')),
  entity_id uuid not null,
  description text not null check (char_length(description) <= 300),
  normalized text not null default '',
  -- Si viene de un ítem personal: no se usa como ejemplo para otros miembros.
  is_private boolean not null default false,
  from_category_id uuid,
  to_category_id uuid not null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (household_id, from_category_id)
    references public.categories (household_id, id) on delete set null (from_category_id),
  foreign key (household_id, to_category_id) references public.categories (household_id, id) on delete cascade
);

create index category_corrections_recent_idx on public.category_corrections (household_id, created_at desc);

-- ── Categorías por defecto (con descripción para el LLM) ────────────
create or replace function private.seed_expense_categories(hid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (household_id, name, icon, color, description, is_system, sort_order, created_by)
  values
    (hid, 'Supermercado', 'shopping-cart', 'verde',
     'Supermercados, almacenes, verdulerías, carnicerías, dietéticas y mayoristas (Coto, Carrefour, Día, Jumbo, chinos).', false, 0, null),
    (hid, 'Delivery y comida', 'coffee', 'naranja',
     'Restaurantes, bares, cafés, heladerías, delivery y apps de comida (Rappi, PedidosYa).', false, 1, null),
    (hid, 'Transporte', 'car', 'azul',
     'Nafta, SUBE, colectivo, taxis, Uber, Cabify, DiDi, peajes, estacionamiento, service y seguro del auto.', false, 2, null),
    (hid, 'Servicios', 'zap', 'amarillo',
     'Luz, gas, agua, internet, telefonía, celular, cable, expensas y servicios del hogar (Edenor, Metrogas, AySA, Personal, Movistar).', false, 3, null),
    (hid, 'Salud', 'heart', 'rojo',
     'Farmacias, prepaga, obra social, médicos, odontología, análisis, óptica.', false, 4, null),
    (hid, 'Mascotas', 'cat', 'magenta',
     'Veterinaria, alimento balanceado, piedras sanitarias, juguetes y accesorios para mascotas.', false, 5, null),
    (hid, 'Hogar', 'sofa', 'marron',
     'Muebles, electrodomésticos, ferretería, bazar, decoración, plantas, arreglos y mantenimiento de la casa.', false, 6, null),
    (hid, 'Ropa y cuidado personal', 'shirt', 'rosa',
     'Ropa, calzado, accesorios, peluquería, cosmética y perfumería.', false, 7, null),
    (hid, 'Suscripciones y ocio', 'tv', 'violeta',
     'Streaming y apps (Netflix, Spotify, Disney+, YouTube, iCloud, Google One), juegos, cine, teatro, recitales y salidas.', false, 8, null),
    (hid, 'Educación', 'book-open', 'indigo',
     'Cursos, colegio, universidad, idiomas, libros y útiles.', false, 9, null),
    (hid, 'Viajes', 'suitcase', 'cian',
     'Pasajes, hoteles, alquileres temporarios (Airbnb, Booking), excursiones y gastos de viaje.', false, 10, null),
    (hid, 'Impuestos y comisiones', 'receipt', 'gris',
     'Impuestos (ABL, patente, ganancias, sellos, percepciones), comisiones bancarias, mantenimiento de cuenta e intereses.', false, 11, null),
    (hid, 'Otros', 'box', 'arena',
     'Gastos que no encajan en ninguna otra categoría (regalos, donaciones, varios).', false, 12, null),
    (hid, 'Sin categorizar', 'circle-question', 'gris',
     'Sin categoría asignada todavía. Hay que revisarlo.', true, 99, null);
end;
$$;

-- ── Triggers estándar ───────────────────────────────────────────────
select private.attach_standard_triggers('public.categories');
select private.attach_standard_triggers('public.category_rules');
select private.attach_standard_triggers('public.category_corrections');
create trigger keep_household_id before update on public.categories
  for each row execute function private.keep_household_id();

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.categories enable row level security;
alter table public.category_rules enable row level security;
alter table public.category_corrections enable row level security;

create policy "miembros ven categorías" on public.categories
  for select to authenticated using (private.is_member(household_id));
create policy "miembros crean categorías" on public.categories
  for insert to authenticated
  with check (private.is_member(household_id) and created_by = (select auth.uid()) and not is_system);
create policy "miembros editan categorías" on public.categories
  for update to authenticated using (private.is_member(household_id)) with check (private.is_member(household_id));
create policy "miembros borran categorías" on public.categories
  for delete to authenticated using (private.is_member(household_id) and not is_system);

-- Reglas y correcciones guardan descripciones (que pueden venir de ítems
-- personales). Solo el servidor las lee y escribe, con la secret key, después
-- de verificar con RLS que el usuario puede ver el gasto. Sin policies para
-- authenticated = sin acceso directo desde el cliente.
