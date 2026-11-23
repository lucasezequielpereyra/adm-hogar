-- Resúmenes por mes: a qué resumen va cada compra y regeneración de cuotas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into public.cards (id, household_id, name, closing_day, due_day, created_by)
values
  ('ca4d0000-0000-4000-8000-0000000000a5', 'cccccccc-0000-4000-8000-000000000001', 'Test 5', 5, 15, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-0000000000a6', 'cccccccc-0000-4000-8000-000000000001', 'Test 25', 25, 5, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-0000000000a7', 'cccccccc-0000-4000-8000-000000000001', 'Test 30', 30, 10, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-0000000000a8', 'cccccccc-0000-4000-8000-000000000001', 'Test 31', 31, 10, 'aaaaaaaa-0000-4000-8000-000000000001');

-- Sin resúmenes cargados, da lo mismo que statement_period (comportamiento anterior).
select is((
  select count(*)::int from public.cards c
  cross join generate_series('2026-01-01'::date, '2026-04-30'::date, interval '1 day') as d
  where c.id::text like 'ca4d0000-0000-4000-8000-0000000000a%'
    and private.card_statement_period(c.id, d::date) <> public.statement_period(d::date, c.closing_day)
), 0, 'Sin resúmenes, el período es el de siempre (incluye cierres 30 y 31 en febrero)');

-- Cierre real más tarde: una compra del 27/11 entra en noviembre.
insert into public.card_statements (household_id, card_id, period, closing_date, due_date, created_by)
values ('cccccccc-0000-4000-8000-000000000001', 'ca4d0000-0000-4000-8000-0000000000a6', '2026-11-01', '2026-11-28', '2026-12-07',
        'aaaaaaaa-0000-4000-8000-000000000001');
select is(private.card_statement_period('ca4d0000-0000-4000-8000-0000000000a6', '2026-11-27'), '2026-11-01'::date,
  'Un cierre real más tarde trae la compra al resumen del mes');
select is(private.card_statement_period('ca4d0000-0000-4000-8000-0000000000a6', '2026-11-29'), '2026-12-01'::date,
  'Después del cierre real, va al mes siguiente');

-- Cierre real más temprano: una compra del 23/11 pasa a diciembre.
update public.card_statements set closing_date = '2026-11-22' where card_id = 'ca4d0000-0000-4000-8000-0000000000a6';
select is(private.card_statement_period('ca4d0000-0000-4000-8000-0000000000a6', '2026-11-23'), '2026-12-01'::date,
  'Un cierre real más temprano manda la compra al mes siguiente');

-- Cambiar el cierre regenera las cuotas ya cargadas.
insert into public.card_expenses (id, household_id, card_id, purchase_date, description, amount, installments_count, created_by)
values ('e0e0e0e0-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 'ca4d0000-0000-4000-8000-0000000000a6',
        '2026-11-24', 'Test compra', 3000, 3, 'aaaaaaaa-0000-4000-8000-000000000001');
select is((select period from public.card_installments where card_expense_id = 'e0e0e0e0-0000-4000-8000-000000000001' and installment_number = 1),
  '2026-12-01'::date, 'Con cierre el 22, la compra del 24 cae en diciembre');
update public.card_statements set closing_date = '2026-11-26' where card_id = 'ca4d0000-0000-4000-8000-0000000000a6';
select is((select period from public.card_installments where card_expense_id = 'e0e0e0e0-0000-4000-8000-000000000001' and installment_number = 1),
  '2026-11-01'::date, 'Al mover el cierre al 26, la compra pasa a noviembre');
select is((select array_agg(period order by installment_number) from public.card_installments where card_expense_id = 'e0e0e0e0-0000-4000-8000-000000000001'),
  array['2026-11-01', '2026-12-01', '2027-01-01']::date[], 'Las cuotas siguen en meses consecutivos');
delete from public.card_statements where card_id = 'ca4d0000-0000-4000-8000-0000000000a6';
select is((select period from public.card_installments where card_expense_id = 'e0e0e0e0-0000-4000-8000-000000000001' and installment_number = 1),
  '2026-11-01'::date, 'Sin el resumen vuelve al día de la tarjeta (25): la compra del 24 es de noviembre');

-- Fechas absurdas se rechazan.
select throws_ok(
  $$ insert into public.card_statements (household_id, card_id, period, closing_date, due_date)
     values ('cccccccc-0000-4000-8000-000000000001', 'ca4d0000-0000-4000-8000-0000000000a6', '2026-11-01', '2027-02-25', '2027-03-05') $$,
  '23514', null, 'El cierre tiene que caer cerca de su mes');
select throws_ok(
  $$ insert into public.card_statements (household_id, card_id, period, closing_date, due_date)
     values ('cccccccc-0000-4000-8000-000000000001', 'ca4d0000-0000-4000-8000-0000000000a6', '2026-11-01', '2026-11-25', '2026-11-20') $$,
  '23514', null, 'El vencimiento tiene que ser después del cierre');

-- RLS: los del hogar lo ven; alguien de afuera, no.
insert into public.card_statements (household_id, card_id, period, closing_date, due_date, created_by)
values ('cccccccc-0000-4000-8000-000000000001', 'ca4d0000-0000-4000-8000-0000000000a6', '2026-10-01', '2026-10-25', '2026-11-05',
        'aaaaaaaa-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.card_statements), 0, 'Alguien de otro hogar no ve los resúmenes');
reset role;

-- Borrar una tarjeta con resúmenes y gastos funciona.
select lives_ok($$ delete from public.cards where id = 'ca4d0000-0000-4000-8000-0000000000a6' $$,
  'Se puede borrar una tarjeta con resúmenes y gastos');

select * from finish();
rollback;
