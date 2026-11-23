-- ════════════════════════════════════════════════════════════════════
-- 02 · Perfiles, hogares, miembros e invitaciones
-- ════════════════════════════════════════════════════════════════════

-- Paleta cerrada de 16 colores (ver lib/palette.ts)
create domain public.palette_color as text
  check (value in (
    'rojo','naranja','amarillo','lima','verde','menta','cian','celeste',
    'azul','indigo','violeta','magenta','rosa','marron','arena','gris'
  ));

-- ── Perfiles (uno por usuario; excepción: sin household_id) ─────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  avatar_url text,
  current_household_id uuid,
  sound_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Hogares (excepción: el hogar es su propio household_id) ─────────
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  default_currency text not null default 'ARS' check (default_currency in ('ARS', 'USD')),
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_current_household_fk
  foreign key (current_household_id) references public.households (id) on delete set null;

-- ── Miembros ────────────────────────────────────────────────────────
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  color public.palette_color not null default 'azul',
  nickname text check (char_length(nickname) <= 30),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id),
  unique (household_id, color)
);

create index household_members_user_idx on public.household_members (user_id);

-- ── Invitaciones ────────────────────────────────────────────────────
create or replace function private.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return code;
end;
$$;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  code text not null unique default private.generate_invite_code(),
  role text not null default 'member' check (role in ('admin', 'member')),
  expires_at timestamptz not null default now() + interval '7 days',
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0,
  revoked_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invitations_household_idx on public.invitations (household_id);

-- ── Helpers de membresía (SECURITY DEFINER para no recursar en RLS) ──
create or replace function private.is_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_admin(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = (select auth.uid()) and m.role = 'admin'
  );
$$;

create or replace function private.shares_household(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members a
    join public.household_members b on a.household_id = b.household_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;

grant execute on function
  private.is_member(uuid),
  private.is_admin(uuid),
  private.shares_household(uuid)
to authenticated, service_role;

-- ── Perfil automático al registrarse ────────────────────────────────
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ), 60),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── Reglas de miembros ──────────────────────────────────────────────
-- Solo un admin cambia roles; household_id y user_id son inmutables.
create or replace function private.guard_member_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.household_id <> old.household_id or new.user_id <> old.user_id then
    raise exception 'No se puede mover un miembro de hogar' using errcode = '42501';
  end if;
  -- pg_trigger_depth() > 1: cambio hecho por otro trigger (p. ej. la
  -- promoción automática cuando se va el último admin).
  if new.role <> old.role and pg_trigger_depth() = 1 then
    if not private.is_admin(old.household_id) then
      raise exception 'Solo un admin puede cambiar roles' using errcode = '42501';
    end if;
    if old.role = 'admin' and not exists (
      select 1 from public.household_members m
      where m.household_id = old.household_id and m.role = 'admin' and m.id <> old.id
    ) then
      raise exception 'El hogar necesita al menos un admin' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_member_update
  before update on public.household_members
  for each row execute function private.guard_member_update();

-- Si se va el último admin, se promueve al miembro más antiguo.
-- Si no queda nadie, se borra el hogar.
create or replace function private.after_member_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.households h where h.id = old.household_id) then
    return null; -- borrado en cascada del hogar
  end if;

  if not exists (select 1 from public.household_members m where m.household_id = old.household_id) then
    delete from public.households where id = old.household_id;
    return null;
  end if;

  if old.role = 'admin' and not exists (
    select 1 from public.household_members m
    where m.household_id = old.household_id and m.role = 'admin'
  ) then
    update public.household_members
    set role = 'admin'
    where id = (
      select m.id from public.household_members m
      where m.household_id = old.household_id
      order by m.created_at
      limit 1
    );
  end if;

  update public.profiles
  set current_household_id = null
  where id = old.user_id and current_household_id = old.household_id;

  return null;
end;
$$;

create trigger after_member_delete
  after delete on public.household_members
  for each row execute function private.after_member_delete();

-- ── Seeders por módulo ──────────────────────────────────────────────
-- Cada migración de módulo define private.seed_<modulo>(hid uuid).
-- Este despachador los llama a todos, en orden alfabético.
create or replace function private.seed_household_defaults(hid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fn text;
begin
  for fn in
    select p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname like 'seed\_%' escape '\'
      and p.proname <> 'seed_household_defaults'
    order by p.proname
  loop
    execute format('select private.%I($1)', fn) using hid;
  end loop;
end;
$$;

-- ── RPCs públicas ───────────────────────────────────────────────────
create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception 'Necesitás iniciar sesión' using errcode = '28000';
  end if;
  p_name := btrim(coalesce(p_name, ''));
  if char_length(p_name) = 0 or char_length(p_name) > 60 then
    raise exception 'El nombre debe tener entre 1 y 60 caracteres' using errcode = '22023';
  end if;

  insert into public.households (name, created_by) values (p_name, uid) returning id into hid;
  insert into public.household_members (household_id, user_id, role, color, created_by)
  values (hid, uid, 'admin', 'azul', uid);
  perform private.seed_household_defaults(hid);
  update public.profiles set current_household_id = hid where id = uid;
  return hid;
end;
$$;

-- Vista previa de una invitación (para /unirse/<code>), sin ser miembro.
create or replace function public.get_invitation_preview(p_code text)
returns table (household_name text, valid boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select h.name,
         (i.revoked_at is null
          and i.expires_at > now()
          and (i.max_uses is null or i.uses_count < i.max_uses))
  from public.invitations i
  join public.households h on h.id = i.household_id
  where i.code = upper(btrim(p_code));
$$;

create or replace function public.accept_invitation(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.invitations;
  free_color text;
begin
  if uid is null then
    raise exception 'Necesitás iniciar sesión' using errcode = '28000';
  end if;

  select * into inv from public.invitations
  where code = upper(btrim(p_code))
  for update;

  if not found
     or inv.revoked_at is not null
     or inv.expires_at <= now()
     or (inv.max_uses is not null and inv.uses_count >= inv.max_uses) then
    raise exception 'La invitación no es válida o ya venció' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.household_members m
    where m.household_id = inv.household_id and m.user_id = uid
  ) then
    update public.profiles set current_household_id = inv.household_id where id = uid;
    return inv.household_id;
  end if;

  select t.c into free_color
  from unnest(array[
    'naranja','verde','magenta','cian','amarillo','violeta','rojo','menta',
    'celeste','lima','rosa','indigo','marron','arena','gris','azul'
  ]) with ordinality as t (c, i)
  where not exists (
    select 1 from public.household_members m
    where m.household_id = inv.household_id and m.color = t.c
  )
  order by t.i
  limit 1;

  if free_color is null then
    raise exception 'El hogar llegó al máximo de 16 miembros' using errcode = '23514';
  end if;

  insert into public.household_members (household_id, user_id, role, color, created_by)
  values (inv.household_id, uid, inv.role, free_color, uid);

  update public.invitations set uses_count = uses_count + 1 where id = inv.id;
  update public.profiles set current_household_id = inv.household_id where id = uid;

  return inv.household_id;
end;
$$;

revoke execute on function public.create_household(text), public.accept_invitation(text), public.get_invitation_preview(text) from anon;
grant execute on function public.create_household(text), public.accept_invitation(text), public.get_invitation_preview(text) to authenticated;

-- ── Triggers estándar ───────────────────────────────────────────────
create trigger set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
select private.attach_standard_triggers('public.households');
select private.attach_standard_triggers('public.household_members');
select private.attach_standard_triggers('public.invitations');
create trigger keep_household_id before update on public.invitations
  for each row execute function private.keep_household_id();

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.invitations enable row level security;

-- profiles
create policy "perfil propio o de compañeros de hogar" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_household(id));

create policy "editar mi perfil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (current_household_id is null or private.is_member(current_household_id))
  );

-- households
create policy "ver mis hogares" on public.households
  for select to authenticated
  using (private.is_member(id));

create policy "admin edita el hogar" on public.households
  for update to authenticated
  using (private.is_admin(id))
  with check (private.is_admin(id));

create policy "admin borra el hogar" on public.households
  for delete to authenticated
  using (private.is_admin(id));

-- household_members
create policy "ver miembros de mis hogares" on public.household_members
  for select to authenticated
  using (private.is_member(household_id));

create policy "editar mi membresía o (admin) la de otros" on public.household_members
  for update to authenticated
  using (user_id = (select auth.uid()) or private.is_admin(household_id))
  with check (user_id = (select auth.uid()) or private.is_admin(household_id));

create policy "irme o (admin) quitar miembros" on public.household_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_admin(household_id));

-- invitations (solo admins)
create policy "admin ve invitaciones" on public.invitations
  for select to authenticated
  using (private.is_admin(household_id));

create policy "admin crea invitaciones" on public.invitations
  for insert to authenticated
  with check (private.is_admin(household_id) and created_by = (select auth.uid()));

create policy "admin edita invitaciones" on public.invitations
  for update to authenticated
  using (private.is_admin(household_id))
  with check (private.is_admin(household_id));

create policy "admin borra invitaciones" on public.invitations
  for delete to authenticated
  using (private.is_admin(household_id));

-- ── Realtime: solo los miembros escuchan el canal de su hogar ───────
create policy "miembros escuchan su hogar" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) ~ '^household:[0-9a-f-]{36}$'
    and private.is_member(split_part((select realtime.topic()), ':', 2)::uuid)
  );
