-- Categorías por defecto de un hogar nuevo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-4000-8000-000000000003","role":"authenticated"}', true);
create temp table h on commit drop as select public.create_household('Casa de Carla') as id;
reset role;

select is((select count(*) from public.task_categories t join h on t.household_id = h.id
           where t.parent_id = (select id from public.task_categories where household_id = h.id and name = 'Habitación'))::int,
  4, 'Habitación viene con sus 4 subcategorías');
select ok(exists (select 1 from public.categories c join h on c.household_id = h.id where c.name = 'Vivienda' and c.icon = 'home'),
  'Hay categoría Vivienda');
select ok(exists (select 1 from public.categories c join h on c.household_id = h.id where c.name = 'Seguros' and c.icon = 'shield'),
  'Hay categoría Seguros');
select ok(exists (select 1 from public.categories c join h on c.household_id = h.id where c.name = 'Préstamos y créditos'),
  'Hay categoría Préstamos y créditos');
select is((select name from public.categories c join h on c.household_id = h.id where not c.is_system order by sort_order desc limit 1),
  'Otros', '"Otros" queda última');

select * from finish();
rollback;
