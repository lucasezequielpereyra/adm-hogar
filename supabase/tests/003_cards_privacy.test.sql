-- Tarjetas: período del resumen, cuotas exactas y privacidad heredada.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- ── statement_period ────────────────────────────────────────────────
select is(public.statement_period('2026-11-25', 25), '2026-11-01'::date, 'El día del cierre entra en el resumen del mes');
select is(public.statement_period('2026-11-26', 25), '2026-12-01'::date, 'Después del cierre va al mes siguiente');
select is(public.statement_period('2027-02-28', 31), '2027-02-01'::date, 'Cierre 31 en febrero se recorta al 28');
select is(public.statement_period('2026-12-31', 25), '2027-01-01'::date, 'Cambio de año');

-- ── Cuotas ──────────────────────────────────────────────────────────
insert into public.card_expenses (id, household_id, card_id, purchase_date, description, amount, installments_count, created_by)
values ('22222222-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 'ca4d0000-0000-4000-8000-000000000001',
        '2026-11-26', 'Test 3 cuotas', 100, 3, 'aaaaaaaa-0000-4000-8000-000000000001');

select is((select count(*) from public.card_installments where card_expense_id = '22222222-0000-4000-8000-000000000001')::int, 3,
  'Se generan 3 cuotas');
select is((select sum(amount) from public.card_installments where card_expense_id = '22222222-0000-4000-8000-000000000001'), 100.00,
  'Las cuotas suman exactamente el total');
select is((select amount from public.card_installments where card_expense_id = '22222222-0000-4000-8000-000000000001' and installment_number = 3),
  33.34, 'La última cuota absorbe los centavos');
select is((select period from public.card_installments where card_expense_id = '22222222-0000-4000-8000-000000000001' and installment_number = 1),
  '2026-12-01'::date, 'La primera cuota cae en el resumen de la compra');

update public.card_expenses set installments_count = 6 where id = '22222222-0000-4000-8000-000000000001';
select is((select count(*) from public.card_installments where card_expense_id = '22222222-0000-4000-8000-000000000001')::int, 6,
  'Al cambiar las cuotas se regeneran');

-- ── Privacidad ──────────────────────────────────────────────────────
create temp table steam as select id from public.card_expenses where description = 'STEAM PURCHASE';
grant select on steam to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.card_expenses where description = 'STEAM PURCHASE')::int, 0,
  'Ana no ve el gasto personal de Bruno');
select is((select count(*) from public.card_installments i where i.card_expense_id in (select id from steam))::int, 0,
  'Ni sus cuotas (buscando por id)');
reset role;
select is((select count(*) from public.card_installments i join public.card_expenses e on e.id = i.card_expense_id
  where e.description = 'STEAM PURCHASE')::int, 1, '(como postgres la cuota existe)');

select * from finish();
rollback;
