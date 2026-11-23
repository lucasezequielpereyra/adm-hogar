-- ════════════════════════════════════════════════════════════════════
-- 10 · Nombres de usuario e invitaciones a un usuario
-- Las cuentas se crean con usuario + contraseña. Supabase Auth guarda un
-- email interno derivado del usuario (ver lib/auth/username.ts).
-- Un admin puede invitar a un usuario existente: esa invitación solo la
-- puede usar esa persona, y la ve al entrar a la app.
-- ════════════════════════════════════════════════════════════════════

-- ── Usuario en el perfil ────────────────────────────────────────────
alter table public.profiles add column username text;

-- Perfiles existentes: el usuario sale de la parte local del email.
update public.profiles p
set username = lower(split_part(u.email, '@', 1))
from auth.users u
where u.id = p.id and p.username is null;

alter table public.profiles
  alter column username set not null,
  add constraint profiles_username_format check (username ~ '^[a-z0-9][a-z0-9._-]{2,19}$'),
  add constraint profiles_username_unique unique (username);

-- El usuario no se cambia (está atado al email interno de Auth).
create or replace function private.keep_username()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'El nombre de usuario no se puede cambiar' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger keep_username before update on public.profiles
  for each row execute function private.keep_username();

-- Perfil automático: ahora también guarda el usuario.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uname text := lower(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(coalesce(new.email, ''), '@', 1)));
begin
  insert into public.profiles (id, display_name, avatar_url, username)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      uname
    ), 60),
    new.raw_user_meta_data ->> 'avatar_url',
    uname
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── Invitaciones a un usuario ───────────────────────────────────────
alter table public.invitations
  add column invited_user_id uuid references public.profiles (id) on delete cascade,
  -- Copia del usuario (el admin no puede leer perfiles de quien todavía no es del hogar).
  add column invited_username text;

create index invitations_invited_user_idx on public.invitations (invited_user_id)
  where invited_user_id is not null and revoked_at is null;

-- Crear una invitación para un usuario existente (solo admins).
create or replace function public.invite_user(
  p_household_id uuid,
  p_username text,
  p_role text default 'member',
  p_days integer default 7
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  new_code text;
  uname text := lower(regexp_replace(btrim(coalesce(p_username, '')), '^@', ''));
begin
  if not private.is_admin(p_household_id) then
    raise exception 'Solo un admin puede invitar' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'member') or p_days not between 1 and 30 then
    raise exception 'Datos de invitación inválidos' using errcode = '22023';
  end if;

  select p.id into target from public.profiles p where p.username = uname;
  if target is null then
    raise exception 'No hay nadie con el usuario "%". Pasale el link para que se registre.', uname
      using errcode = 'P0002';
  end if;
  if exists (select 1 from public.household_members m where m.household_id = p_household_id and m.user_id = target) then
    raise exception 'Esa persona ya es parte del hogar' using errcode = '23505';
  end if;

  -- Si ya tenía una invitación pendiente, se reemplaza.
  update public.invitations
  set revoked_at = now()
  where household_id = p_household_id and invited_user_id = target and revoked_at is null;

  insert into public.invitations (household_id, role, expires_at, max_uses, invited_user_id, invited_username, created_by)
  values (p_household_id, p_role, now() + make_interval(days => p_days), 1, target, uname, auth.uid())
  returning code into new_code;

  return new_code;
end;
$$;

-- Vista previa: también dice si la invitación es para otra persona.
drop function public.get_invitation_preview(text);
create or replace function public.get_invitation_preview(p_code text)
returns table (household_name text, valid boolean, for_other_user boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select h.name,
         (i.revoked_at is null
          and i.expires_at > now()
          and (i.max_uses is null or i.uses_count < i.max_uses)),
         (i.invited_user_id is not null and i.invited_user_id is distinct from (select auth.uid()))
  from public.invitations i
  join public.households h on h.id = i.household_id
  where i.code = upper(btrim(p_code));
$$;

-- Aceptar: igual que antes, pero respetando a quién va dirigida.
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

  if inv.invited_user_id is not null and inv.invited_user_id <> uid then
    raise exception 'Esta invitación es para otra persona' using errcode = '42501';
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

-- Invitaciones pendientes para mí.
create or replace function public.get_my_invitations()
returns table (code text, household_name text, role text, invited_by text, invited_by_username text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.code, h.name, i.role,
         coalesce(nullif(p.display_name, ''), 'Alguien'), p.username, i.expires_at
  from public.invitations i
  join public.households h on h.id = i.household_id
  left join public.profiles p on p.id = i.created_by
  where i.invited_user_id = (select auth.uid())
    and i.revoked_at is null
    and i.expires_at > now()
    and (i.max_uses is null or i.uses_count < i.max_uses)
    and not exists (
      select 1 from public.household_members m
      where m.household_id = i.household_id and m.user_id = (select auth.uid())
    )
  order by i.created_at desc;
$$;

-- Rechazar una invitación dirigida a mí.
create or replace function public.decline_invitation(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invitations
  set revoked_at = now()
  where code = upper(btrim(p_code))
    and invited_user_id = (select auth.uid())
    and revoked_at is null;
  if not found then
    raise exception 'No encontramos esa invitación' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function
  public.invite_user(uuid, text, text, integer),
  public.get_invitation_preview(text),
  public.get_my_invitations(),
  public.decline_invitation(text)
from anon;
grant execute on function
  public.invite_user(uuid, text, text, integer),
  public.get_invitation_preview(text),
  public.get_my_invitations(),
  public.decline_invitation(text)
to authenticated;
