-- ════════════════════════════════════════════════════════════════════
-- 03 · Tareas: categorías (2 niveles), tareas recurrentes e historial
-- ════════════════════════════════════════════════════════════════════

-- ── Categorías de tareas (raíz → subcategoría) ─────────────────────
create table public.task_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  parent_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  icon text not null default 'box',
  color public.palette_color not null default 'gris',
  sort_order integer not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, id),
  foreign key (household_id, parent_id)
    references public.task_categories (household_id, id) on delete cascade,
  unique nulls not distinct (household_id, parent_id, name)
);

create index task_categories_parent_idx on public.task_categories (parent_id);

-- Máximo dos niveles.
create or replace function private.guard_task_category_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'Una categoría no puede ser su propia subcategoría' using errcode = '22023';
    end if;
    if exists (select 1 from public.task_categories c where c.id = new.parent_id and c.parent_id is not null) then
      raise exception 'Solo se permiten dos niveles: categoría y subcategoría' using errcode = '22023';
    end if;
    if exists (select 1 from public.task_categories c where c.parent_id = new.id) then
      raise exception 'Una categoría con subcategorías no puede pasar a ser subcategoría' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_task_category_depth
  before insert or update of parent_id on public.task_categories
  for each row execute function private.guard_task_category_depth();

-- ── Tareas ──────────────────────────────────────────────────────────
-- Cada fila es una ocurrencia. Las recurrentes comparten series_id y, al
-- completarse, generan la próxima ocurrencia (ver complete_task).
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (char_length(description) <= 1000),
  task_category_id uuid,
  assigned_to uuid,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'done')),
  is_private boolean not null default false,
  frequency text not null default 'once'
    check (frequency in ('once', 'daily', 'weekly', 'biweekly', 'monthly')),
  weekdays smallint[] check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  month_day smallint check (month_day between 1 and 31),
  recurrence_anchor date,
  series_id uuid,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, id),
  foreign key (household_id, task_category_id)
    references public.task_categories (household_id, id) on delete set null (task_category_id),
  foreign key (household_id, assigned_to)
    references public.household_members (household_id, user_id) on delete set null (assigned_to),
  check (frequency = 'once' or due_date is not null),
  check (frequency not in ('weekly', 'biweekly') or coalesce(cardinality(weekdays), 0) > 0),
  check (frequency <> 'biweekly' or recurrence_anchor is not null),
  check (frequency <> 'monthly' or month_day is not null),
  check ((status = 'done') = (completed_at is not null)),
  -- Una tarea privada solo puede estar asignada a su dueño.
  check (not is_private or assigned_to is null or assigned_to = created_by)
);

create index tasks_household_status_due_idx on public.tasks (household_id, status, due_date);
create index tasks_assigned_idx on public.tasks (assigned_to);
create index tasks_series_idx on public.tasks (series_id);

create or replace function private.default_series_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.series_id := coalesce(new.series_id, new.id);
  return new;
end;
$$;

create trigger default_series_id before insert on public.tasks
  for each row execute function private.default_series_id();

-- ── Historial de completadas ────────────────────────────────────────
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  task_id uuid not null,
  completed_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz not null default now(),
  -- Ocurrencia generada al completar (para poder deshacer).
  next_task_id uuid references public.tasks (id) on delete set null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (household_id, task_id) references public.tasks (household_id, id) on delete cascade
);

create index task_completions_household_idx on public.task_completions (household_id, completed_at desc);
create index task_completions_user_idx on public.task_completions (completed_by, completed_at desc);
create index task_completions_task_idx on public.task_completions (task_id);

-- ── Completar / deshacer (atómicos) ─────────────────────────────────
-- SECURITY DEFINER para poder crear la próxima ocurrencia conservando el
-- created_by original (si Bruno completa una tarea de Ana, la próxima
-- sigue siendo de Ana). La visibilidad se verifica explícitamente.
create or replace function public.complete_task(p_task_id uuid, p_next_due date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.tasks;
  next_id uuid;
  completion_id uuid;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found
     or not private.is_member(t.household_id)
     or (t.is_private and t.created_by is distinct from uid) then
    raise exception 'La tarea no existe o no tenés acceso' using errcode = 'P0002';
  end if;

  -- Doble tap: ya estaba hecha → no hace nada.
  if t.status = 'done' then
    return null;
  end if;

  if t.frequency <> 'once' then
    if p_next_due is null or p_next_due <= t.due_date then
      raise exception 'Falta la fecha de la próxima ocurrencia' using errcode = '22023';
    end if;
    insert into public.tasks (
      household_id, title, description, task_category_id, assigned_to, due_date, priority,
      is_private, frequency, weekdays, month_day, recurrence_anchor, series_id, created_by
    )
    values (
      t.household_id, t.title, t.description, t.task_category_id, t.assigned_to, p_next_due, t.priority,
      t.is_private, t.frequency, t.weekdays, t.month_day, t.recurrence_anchor, t.series_id, t.created_by
    )
    returning id into next_id;
  end if;

  update public.tasks
  set status = 'done', completed_at = now(), completed_by = uid
  where id = t.id;

  insert into public.task_completions (household_id, task_id, completed_by, next_task_id, created_by)
  values (t.household_id, t.id, uid, next_id, uid)
  returning id into completion_id;

  return completion_id;
end;
$$;

create or replace function public.undo_complete_task(p_completion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c public.task_completions;
begin
  select * into c from public.task_completions where id = p_completion_id for update;
  if not found or c.completed_by is distinct from uid then
    raise exception 'Solo quien completó la tarea puede deshacerlo' using errcode = '42501';
  end if;

  if c.next_task_id is not null then
    delete from public.tasks where id = c.next_task_id and status = 'pending';
  end if;

  update public.tasks
  set status = 'pending', completed_at = null, completed_by = null
  where id = c.task_id;

  delete from public.task_completions where id = c.id;
end;
$$;

revoke execute on function public.complete_task(uuid, date), public.undo_complete_task(uuid) from anon;
grant execute on function public.complete_task(uuid, date), public.undo_complete_task(uuid) to authenticated;

-- ── Categorías por defecto ──────────────────────────────────────────
create or replace function private.seed_task_categories(hid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  roots jsonb := '[
    {"name":"Cocinar","icon":"fire","color":"naranja","children":["Almuerzo","Cena","Lavar platos"]},
    {"name":"Living","icon":"sofa","color":"azul","children":["Aspirar","Ordenar","Limpiar vidrios"]},
    {"name":"Michis","icon":"cat","color":"naranja","children":["Arena","Comida","Veterinario"]},
    {"name":"Baño","icon":"spray","color":"cian","children":["Limpiar baño","Reponer papel"]},
    {"name":"Lavadero","icon":"shirt","color":"celeste","children":["Lavar ropa","Doblar ropa"]},
    {"name":"Compras","icon":"shopping-cart","color":"verde","children":["Supermercado","Verdulería"]}
  ]';
  r jsonb;
  child text;
  root_id uuid;
  i integer := 0;
  j integer;
begin
  for r in select * from jsonb_array_elements(roots) loop
    insert into public.task_categories (household_id, name, icon, color, sort_order, created_by)
    values (hid, r ->> 'name', r ->> 'icon', r ->> 'color', i, null)
    returning id into root_id;
    j := 0;
    for child in select * from jsonb_array_elements_text(r -> 'children') loop
      insert into public.task_categories (household_id, parent_id, name, icon, color, sort_order, created_by)
      values (hid, root_id, child, r ->> 'icon', r ->> 'color', j, null);
      j := j + 1;
    end loop;
    i := i + 1;
  end loop;
end;
$$;

-- ── Triggers estándar ───────────────────────────────────────────────
select private.attach_standard_triggers('public.task_categories');
select private.attach_standard_triggers('public.tasks');
select private.attach_standard_triggers('public.task_completions');
create trigger keep_household_id before update on public.task_categories
  for each row execute function private.keep_household_id();
create trigger keep_household_id before update on public.tasks
  for each row execute function private.keep_household_id();

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.task_categories enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

create policy "miembros ven categorías de tareas" on public.task_categories
  for select to authenticated using (private.is_member(household_id));
create policy "miembros crean categorías de tareas" on public.task_categories
  for insert to authenticated
  with check (private.is_member(household_id) and created_by = (select auth.uid()));
create policy "miembros editan categorías de tareas" on public.task_categories
  for update to authenticated
  using (private.is_member(household_id)) with check (private.is_member(household_id));
create policy "miembros borran categorías de tareas" on public.task_categories
  for delete to authenticated using (private.is_member(household_id));

create policy "ver tareas compartidas o propias" on public.tasks
  for select to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));
create policy "crear tareas" on public.tasks
  for insert to authenticated
  with check (private.is_member(household_id) and created_by = (select auth.uid()));
create policy "editar tareas compartidas o propias" on public.tasks
  for update to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())))
  with check (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));
create policy "borrar tareas compartidas o propias" on public.tasks
  for delete to authenticated
  using (private.is_member(household_id) and (not is_private or created_by = (select auth.uid())));

-- El historial hereda la visibilidad de la tarea. Se escribe solo por RPC.
create policy "ver historial de tareas visibles" on public.task_completions
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));
