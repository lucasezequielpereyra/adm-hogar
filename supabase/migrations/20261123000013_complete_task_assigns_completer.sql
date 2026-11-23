-- ════════════════════════════════════════════════════════════════════
-- 13 · Quien completa una tarea queda como su responsable
-- Al completar, la tarea pasa a estar asignada a quien la marcó (aunque
-- estuviera asignada a otra persona o a nadie). La próxima ocurrencia de
-- una recurrente conserva la asignación original. Deshacer la restaura.
-- ════════════════════════════════════════════════════════════════════

alter table public.task_completions
  -- true si al completar se cambió la asignación (las completadas antes de
  -- esta migración no la cambiaron, y deshacerlas no debe tocarla).
  add column reassigned boolean not null default false,
  add column previous_assigned_to uuid references public.profiles (id) on delete set null;

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
    -- La próxima conserva la asignación original (t es la fila antes de completar).
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
  set status = 'done', completed_at = now(), completed_by = uid, assigned_to = uid
  where id = t.id;

  insert into public.task_completions (
    household_id, task_id, completed_by, next_task_id, reassigned, previous_assigned_to, created_by
  )
  values (t.household_id, t.id, uid, next_id, true, t.assigned_to, uid)
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

  update public.tasks t
  set status = 'pending', completed_at = null, completed_by = null,
      -- Vuelve a quien la tenía; si esa persona ya no es del hogar, queda sin asignar.
      assigned_to = case
        when not c.reassigned then t.assigned_to
        when exists (
          select 1 from public.household_members m
          where m.household_id = c.household_id and m.user_id = c.previous_assigned_to
        ) then c.previous_assigned_to
        else null
      end
  where t.id = c.task_id;

  delete from public.task_completions where id = c.id;
end;
$$;
