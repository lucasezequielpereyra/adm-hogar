-- ════════════════════════════════════════════════════════════════════
-- 11 · Permitir borrar cuentas
-- Al borrar un perfil, los FK `created_by ... on delete set null` ponen
-- created_by en NULL, y keep_created_by lo rechazaba: borrar una cuenta
-- que hubiera creado algo fallaba. Ahora se permite pasar a NULL solo si
-- el perfil del dueño ya no existe; cualquier otro cambio sigue prohibido.
-- ════════════════════════════════════════════════════════════════════

create or replace function private.keep_created_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    if new.created_by is null
       and not exists (select 1 from public.profiles p where p.id = old.created_by) then
      return new; -- el dueño borró su cuenta
    end if;
    raise exception 'created_by no se puede modificar' using errcode = '42501';
  end if;
  return new;
end;
$$;
