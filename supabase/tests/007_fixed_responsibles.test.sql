-- Gastos fijos con varios responsables: validación y limpieza.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.fixed_expenses (id, household_id, name, amount, due_day, responsible_ids)
     values ('f2f2f2f2-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 'Test compartido', 1000, 5,
             array['aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002',
                   'aaaaaaaa-0000-4000-8000-000000000001']::uuid[]) $$,
  'Ana crea un gasto fijo con dos responsables');
select is((select responsible_ids from public.fixed_expenses where id = 'f2f2f2f2-0000-4000-8000-000000000001'),
  array['aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002']::uuid[],
  'Los repetidos se descartan y se conserva el orden');

-- Carla no es del hogar.
select throws_ok(
  $$ update public.fixed_expenses set responsible_ids = responsible_ids || 'dddddddd-0000-4000-8000-000000000003'::uuid
     where id = 'f2f2f2f2-0000-4000-8000-000000000001' $$,
  '23503', null, 'No se puede sumar a alguien que no es del hogar');

-- Personal: solo su dueña.
select throws_ok(
  $$ insert into public.fixed_expenses (household_id, name, amount, due_day, is_private, responsible_ids)
     values ('cccccccc-0000-4000-8000-000000000001', 'Test personal', 1000, 5, true,
             array['bbbbbbbb-0000-4000-8000-000000000002']::uuid[]) $$,
  '23514', null, 'Un gasto personal no puede tener a otro como responsable');
select lives_ok(
  $$ insert into public.fixed_expenses (household_id, name, amount, due_day, is_private, responsible_ids)
     values ('cccccccc-0000-4000-8000-000000000001', 'Test personal', 1000, 5, true,
             array['aaaaaaaa-0000-4000-8000-000000000001']::uuid[]) $$,
  'Un gasto personal puede tener a su dueña como responsable');
select throws_ok(
  $$ update public.fixed_expenses set is_private = true where id = 'f2f2f2f2-0000-4000-8000-000000000001' $$,
  '23514', null, 'No se puede volver personal un gasto con otros responsables');

-- Bruno deja el hogar: sale de todas las listas.
reset role;
delete from public.household_members where user_id = 'bbbbbbbb-0000-4000-8000-000000000002';
select is((select count(*) from public.fixed_expenses where 'bbbbbbbb-0000-4000-8000-000000000002' = any (responsible_ids))::int, 0,
  'Quien deja el hogar sale de los responsables');

-- Borrar el hogar entero no choca con la limpieza.
select lives_ok($$ delete from public.households where id = 'cccccccc-0000-4000-8000-000000000001' $$,
  'Se puede borrar un hogar con gastos fijos con responsables');

select * from finish();
rollback;
