-- Tareas: privacidad, completar (atómico e idempotente) y deshacer.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- Tarea recurrente de Ana, asignada a Bruno
insert into public.tasks (id, household_id, title, due_date, frequency, assigned_to, created_by)
values ('11111111-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 'Test diaria',
        '2026-11-23', 'daily', 'bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001');

-- Para probar la reasignación al completar: una de Ana, una sin asignar y una
-- de Carla (que se suma al hogar y después se va).
insert into public.household_members (household_id, user_id, role, color, created_by)
values ('cccccccc-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000003', 'member', 'menta',
        'dddddddd-0000-4000-8000-000000000003');
insert into public.tasks (id, household_id, title, due_date, frequency, assigned_to, created_by)
values
  ('11111111-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000001', 'Test de Ana',
   '2026-11-23', 'daily', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('11111111-0000-4000-8000-000000000003', 'cccccccc-0000-4000-8000-000000000001', 'Test sin asignar',
   '2026-11-23', 'once', null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('11111111-0000-4000-8000-000000000004', 'cccccccc-0000-4000-8000-000000000001', 'Test de Carla',
   '2026-11-23', 'once', 'dddddddd-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001');

set local role authenticated;

-- ── Bruno no ve la tarea personal de Ana ────────────────────────────
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.tasks where title = 'Comprar regalo de cumpleaños de Bruno')::int, 0,
  'Bruno no ve la tarea personal de Ana');
select throws_ok(
  $$ select public.complete_task((select id from public.tasks where title = 'Comprar regalo de cumpleaños de Bruno' limit 1)) $$,
  null, null, 'Bruno no puede completar una tarea personal ajena');

-- ── Bruno completa la diaria de Ana ─────────────────────────────────
select isnt(public.complete_task('11111111-0000-4000-8000-000000000001', '2026-11-24'), null, 'Completar devuelve el id del registro');
select is(public.complete_task('11111111-0000-4000-8000-000000000001', '2026-11-24'), null, 'Doble tap: la segunda vez no hace nada');
select is((select count(*) from public.tasks where title = 'Test diaria' and status = 'pending')::int, 1,
  'Se generó una sola próxima ocurrencia');
select is((select due_date from public.tasks where title = 'Test diaria' and status = 'pending'), '2026-11-24'::date,
  'La próxima ocurrencia tiene la fecha calculada');
reset role;
select is((select created_by from public.tasks where title = 'Test diaria' and status = 'pending'),
  'aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'La próxima ocurrencia sigue siendo de Ana');
set local role authenticated;

-- ── Deshacer ───────────────────────────────────────────────────────
select lives_ok(
  $$ select public.undo_complete_task((select id from public.task_completions where task_id = '11111111-0000-4000-8000-000000000001')) $$,
  'Bruno puede deshacer lo que completó');
select is((select count(*) from public.tasks where title = 'Test diaria')::int, 1,
  'Deshacer borra la ocurrencia generada y reabre la original');

-- ── Quien completa queda asignado ───────────────────────────────────
select ok(public.complete_task('11111111-0000-4000-8000-000000000002', '2026-11-24') is not null,
  'Bruno completa una tarea asignada a Ana');
select is((select assigned_to from public.tasks where id = '11111111-0000-4000-8000-000000000002'),
  'bbbbbbbb-0000-4000-8000-000000000002'::uuid, 'La completada queda asignada a Bruno');
select is((select assigned_to from public.tasks where title = 'Test de Ana' and status = 'pending'),
  'aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'La próxima ocurrencia sigue asignada a Ana');
select public.undo_complete_task((select id from public.task_completions where task_id = '11111111-0000-4000-8000-000000000002'));
select is((select assigned_to from public.tasks where id = '11111111-0000-4000-8000-000000000002'),
  'aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'Deshacer la devuelve a Ana');

select ok(public.complete_task('11111111-0000-4000-8000-000000000003') is not null, 'Bruno completa una sin asignar');
select is((select assigned_to from public.tasks where id = '11111111-0000-4000-8000-000000000003'),
  'bbbbbbbb-0000-4000-8000-000000000002'::uuid, 'La sin asignar queda asignada a Bruno');
select public.undo_complete_task((select id from public.task_completions where task_id = '11111111-0000-4000-8000-000000000003'));
select is((select assigned_to from public.tasks where id = '11111111-0000-4000-8000-000000000003'), null::uuid,
  'Deshacer la deja otra vez sin asignar');

-- Si la persona que la tenía ya no es del hogar, deshacer la deja sin asignar.
select public.complete_task('11111111-0000-4000-8000-000000000004');
reset role;
delete from public.household_members where user_id = 'dddddddd-0000-4000-8000-000000000003';
set local role authenticated;
select public.undo_complete_task((select id from public.task_completions where task_id = '11111111-0000-4000-8000-000000000004'));
select is((select assigned_to from public.tasks where id = '11111111-0000-4000-8000-000000000004'), null::uuid,
  'Deshacer no devuelve la tarea a alguien que ya no es del hogar');

select * from finish();
rollback;
