-- IA: logs solo para admins; reglas, correcciones y cupo solo para el servidor.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.ai_logs (id, household_id, entity_type, entity_id, source, input, error)
values ('a1a1a1a1-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 'card_expense', gen_random_uuid(), 'fallback', '{"description":"X"}', 'timeout');

-- Log de un ítem personal de Bruno
insert into public.ai_logs (id, household_id, entity_type, entity_id, source, input, is_private, owner_id)
values ('a1a1a1a1-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000001', 'card_expense', gen_random_uuid(),
        'ai', '{"description":"REGALO SECRETO"}', true, 'bbbbbbbb-0000-4000-8000-000000000002');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.ai_logs)::int, 0, 'Un miembro no ve los logs de IA');
select is((select count(*) from public.category_rules)::int, 0, 'Las reglas no se leen desde el cliente');
select is((select count(*) from public.category_corrections)::int, 0, 'Las correcciones no se leen desde el cliente');
select throws_ok(
  $$ select public.consume_ai_quota('cccccccc-0000-4000-8000-000000000001', 1, 10, 10) $$,
  '42501', null, 'El cliente no puede consumir cupo de IA');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.ai_logs where id = 'a1a1a1a1-0000-4000-8000-000000000001')::int, 1, 'El admin ve los logs de su hogar');
select is((select count(*) from public.ai_logs where id = 'a1a1a1a1-0000-4000-8000-000000000002')::int, 0,
  'El admin no ve el log de un ítem personal de otro miembro');
select throws_ok(
  $$ insert into public.ai_logs (household_id, entity_type, entity_id) values ('cccccccc-0000-4000-8000-000000000001', 'card_expense', gen_random_uuid()) $$,
  '42501', null, 'Ni siquiera un admin escribe logs desde el cliente');

select * from finish();
rollback;
