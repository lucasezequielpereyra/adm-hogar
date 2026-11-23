-- ════════════════════════════════════════════════════════════════════
-- 12 · Gastos fijos con varios responsables
-- responsible_id (uno) pasa a responsible_ids (lista, en el orden elegido).
-- - Un trigger valida que los que se agregan sean miembros del hogar, y que
--   un gasto personal solo tenga como responsable a quien lo creó.
-- - Cuando alguien deja el hogar (o borra su cuenta), sale de las listas.
-- ════════════════════════════════════════════════════════════════════

alter table public.fixed_expenses add column responsible_ids uuid[] not null default '{}';

update public.fixed_expenses
set responsible_ids = array[responsible_id]
where responsible_id is not null;

-- Se va también la FK compuesta a household_members.
alter table public.fixed_expenses drop column responsible_id;

alter table public.fixed_expenses
  add constraint fixed_expenses_responsibles_max check (cardinality(responsible_ids) <= 16);

-- ── Validación ──────────────────────────────────────────────────────
-- Solo se validan los que se AGREGAN: sacar a alguien nunca falla (eso
-- permite limpiar las listas mientras se borra un miembro o un hogar).
create or replace function private.check_fixed_responsibles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  added uuid[];
begin
  if array_position(new.responsible_ids, null) is not null then
    raise exception 'Responsable inválido' using errcode = '22004';
  end if;

  -- Sin repetidos, conservando el orden elegido.
  new.responsible_ids := coalesce(
    (select array_agg(s.u order by s.i)
     from (select t.u, min(t.i) as i
           from unnest(new.responsible_ids) with ordinality as t (u, i)
           group by t.u) s),
    '{}');

  added := case
    when tg_op = 'INSERT' then new.responsible_ids
    else coalesce((select array_agg(u) from unnest(new.responsible_ids) as u
                   where not (u = any (old.responsible_ids))), '{}')
  end;

  if exists (
    select 1 from unnest(added) as r (uid)
    where not exists (
      select 1 from public.household_members m
      where m.household_id = new.household_id and m.user_id = r.uid
    )
  ) then
    raise exception 'Los responsables tienen que ser miembros del hogar' using errcode = '23503';
  end if;

  if new.is_private
     and (tg_op = 'INSERT' or not old.is_private or cardinality(added) > 0)
     and exists (select 1 from unnest(new.responsible_ids) as r (uid) where r.uid is distinct from new.created_by) then
    raise exception 'Un gasto personal solo puede tener como responsable a quien lo creó' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger check_responsibles
  before insert or update of responsible_ids, is_private on public.fixed_expenses
  for each row execute function private.check_fixed_responsibles();

-- ── Limpieza al dejar el hogar ──────────────────────────────────────
-- SECURITY DEFINER: tiene que alcanzar también los gastos personales.
create or replace function private.remove_fixed_responsible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Si se está borrando el hogar entero, sus gastos se van igual.
  if not exists (select 1 from public.households h where h.id = old.household_id) then
    return old;
  end if;
  update public.fixed_expenses
  set responsible_ids = array_remove(responsible_ids, old.user_id)
  where household_id = old.household_id
    and old.user_id = any (responsible_ids);
  return old;
end;
$$;

create trigger remove_fixed_responsible
  after delete on public.household_members
  for each row execute function private.remove_fixed_responsible();
