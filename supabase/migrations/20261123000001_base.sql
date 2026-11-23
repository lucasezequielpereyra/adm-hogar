-- ════════════════════════════════════════════════════════════════════
-- 01 · Base: schema privado, helpers genéricos y señal de Realtime
-- ════════════════════════════════════════════════════════════════════

create schema if not exists private;

-- Las policies RLS se evalúan con los privilegios de quien consulta:
-- sin este grant, cualquier policy que use private.* falla con
-- "permission denied for schema private".
grant usage on schema private to authenticated, service_role;

-- ── updated_at automático ───────────────────────────────────────────
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── created_by inmutable ────────────────────────────────────────────
-- Evita que alguien se apropie de una fila compartida (y la vuelva
-- privada) cambiando su dueño.
create or replace function private.keep_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by no se puede modificar' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ── household_id inmutable ──────────────────────────────────────────
create or replace function private.keep_household_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'household_id no se puede modificar' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ── Señal de Realtime ───────────────────────────────────────────────
-- Cada cambio en una tabla del hogar manda una señal sin datos de la fila
-- ({table, op}) al canal privado household:<id>. El cliente vuelve a leer
-- con RLS, así los ítems privados nunca viajan a otros miembros.
create or replace function private.broadcast_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  hid uuid;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  hid := coalesce(
    (row_data ->> 'household_id')::uuid,
    case when tg_table_name = 'households' then (row_data ->> 'id')::uuid end
  );
  if hid is not null then
    begin
      perform realtime.send(
        jsonb_build_object('table', tg_table_name, 'op', tg_op),
        'change',
        'household:' || hid::text,
        true
      );
    exception when others then
      -- Una falla de Realtime nunca debe romper una escritura.
      raise warning 'broadcast_change: %', sqlerrm;
    end;
  end if;
  return null;
end;
$$;

-- ── Helper para enganchar los triggers estándar a una tabla ─────────
create or replace function private.attach_standard_triggers(tbl regclass, with_created_by boolean default true)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format(
    'create trigger set_updated_at before update on %s for each row execute function private.set_updated_at()',
    tbl
  );
  if with_created_by then
    execute format(
      'create trigger keep_created_by before update on %s for each row execute function private.keep_created_by()',
      tbl
    );
  end if;
  execute format(
    'create trigger broadcast_change after insert or update or delete on %s for each row execute function private.broadcast_change()',
    tbl
  );
end;
$$;
