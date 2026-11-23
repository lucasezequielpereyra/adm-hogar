-- Borrar una cuenta: sus datos compartidos quedan sin dueño y el hogar sigue.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Bruno creó tareas, compras y gastos en el seed. Se borra su cuenta.
select lives_ok(
  $$ delete from auth.users where id = 'bbbbbbbb-0000-4000-8000-000000000002' $$,
  'Se puede borrar una cuenta que creó datos');
select is((select count(*) from public.household_members where user_id = 'bbbbbbbb-0000-4000-8000-000000000002')::int, 0,
  'Sus membresías se borran');
select ok((select count(*) from public.tasks where created_by is null and title = 'Lavar los platos de la cena') = 1,
  'Sus tareas compartidas quedan sin dueño');
select is((select count(*) from public.households where id = 'cccccccc-0000-4000-8000-000000000001')::int, 1,
  'El hogar sigue existiendo');

-- Pero nadie puede "liberar" a mano una fila de otro.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$ update public.tasks set created_by = null where title = 'Darle de comer a los michis' $$,
  '42501', null, 'No se puede poner created_by en NULL si el dueño existe');

select * from finish();
rollback;
