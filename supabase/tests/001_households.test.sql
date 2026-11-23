-- Aislamiento entre hogares, roles e invitaciones.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- ── Escenario: Carla tiene su propio hogar ──────────────────────────
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'dddddddd-0000-4000-8000-0000000000a3', 'authenticated',
  'authenticated', 'carla.pgtap@example.test', '', now(), '{}', '{"full_name":"Carla"}', now(), now(), '', '', '', '');

insert into public.households (id, name, created_by)
values ('eeeeeeee-0000-4000-8000-000000000009', 'Depto de Carla', 'dddddddd-0000-4000-8000-0000000000a3');
insert into public.household_members (household_id, user_id, role, color, created_by)
values ('eeeeeeee-0000-4000-8000-000000000009', 'dddddddd-0000-4000-8000-0000000000a3', 'admin', 'verde',
  'dddddddd-0000-4000-8000-0000000000a3');

insert into public.invitations (household_id, code, role, expires_at, created_by)
values ('cccccccc-0000-4000-8000-000000000001', 'VENCIDA1', 'member', now() - interval '1 day',
  'aaaaaaaa-0000-4000-8000-000000000001');

-- ── Como Carla ──────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-4000-8000-0000000000a3","role":"authenticated"}', true);

select is((select count(*) from public.households)::int, 1, 'Carla solo ve su hogar');
select is((select count(*) from public.household_members where household_id = 'cccccccc-0000-4000-8000-000000000001')::int, 0,
  'Carla no ve miembros de otro hogar');
select is((select count(*) from public.invitations)::int, 0, 'Carla no ve invitaciones ajenas');
select is((select count(*) from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001')::int, 0,
  'Carla no ve el perfil de Ana');

update public.households set name = 'Hackeado' where id = 'cccccccc-0000-4000-8000-000000000001';
reset role;
select is((select name from public.households where id = 'cccccccc-0000-4000-8000-000000000001'), 'Casa de prueba',
  'Carla no puede renombrar un hogar ajeno');
set local role authenticated;

select throws_ok($$ select public.accept_invitation('VENCIDA1') $$, 'P0002', null, 'Una invitación vencida falla');

select lives_ok($$ select public.accept_invitation('HOGAR123') $$, 'Carla se une con una invitación válida');
select is((select count(*) from public.households)::int, 2, 'Ahora Carla ve los dos hogares');

-- ── Como Bruno (miembro) ────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}', true);

select is((select count(*) from public.invitations)::int, 0, 'Un miembro no ve las invitaciones');
select throws_ok(
  $$ update public.household_members set role = 'admin' where user_id = 'bbbbbbbb-0000-4000-8000-000000000002' $$,
  '42501', null, 'Un miembro no puede hacerse admin');
select throws_ok(
  $$ update public.household_members set created_by = 'aaaaaaaa-0000-4000-8000-000000000001'
     where user_id = 'bbbbbbbb-0000-4000-8000-000000000002' and household_id = 'cccccccc-0000-4000-8000-000000000001' $$,
  '42501', null, 'Nadie puede cambiar created_by (ni en su propia fila)');
select is((select count(*) from public.households where id = 'eeeeeeee-0000-4000-8000-000000000009')::int, 0,
  'Bruno no ve el hogar de Carla');

-- ── Como Ana (admin): si se va, Bruno o Carla pasan a admin ────────
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
delete from public.household_members
where user_id = 'aaaaaaaa-0000-4000-8000-000000000001' and household_id = 'cccccccc-0000-4000-8000-000000000001';
reset role;
select is(
  (select count(*) from public.household_members where household_id = 'cccccccc-0000-4000-8000-000000000001' and role = 'admin')::int,
  1, 'Al irse el último admin se promueve a otro miembro');
select is(
  (select current_household_id from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001'), null,
  'Al irse, el hogar actual de Ana queda vacío');

select * from finish();
rollback;
