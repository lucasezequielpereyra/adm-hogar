-- Usuarios e invitaciones a un usuario.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', '99999999-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'invitada.pgtap@usuarios.hogar.invalid', '', now(), '{}', '{"full_name":"Invitada","username":"invitada.pgtap"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '99999999-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'otra.pgtap@usuarios.hogar.invalid', '', now(), '{}', '{"full_name":"Otra","username":"otra.pgtap"}',
   now(), now(), '', '', '', '');

select is((select username from public.profiles where id = '99999999-0000-4000-8000-000000000001'), 'invitada.pgtap',
  'El perfil guarda el usuario');

set local role authenticated;

-- Ana (admin) invita por usuario
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$ select public.invite_user('cccccccc-0000-4000-8000-000000000001', 'no.existe.nadie') $$,
  'P0002', null, 'No se puede invitar a un usuario que no existe');
select throws_ok($$ select public.invite_user('cccccccc-0000-4000-8000-000000000001', 'bruno') $$,
  '23505', 'Esa persona ya es parte del hogar', 'No se invita a alguien que ya es miembro');
create temp table inv_code (code text) on commit drop;
grant all on inv_code to authenticated;
insert into inv_code select public.invite_user('cccccccc-0000-4000-8000-000000000001', '@Invitada.PGTAP');
select isnt((select code from inv_code), null, 'Ana invita a @invitada.pgtap (normaliza @ y mayúsculas)');
select throws_ok($$ update public.profiles set username = 'ana2' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', null, 'El usuario no se puede cambiar');

-- Bruno (miembro) no puede invitar
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok($$ select public.invite_user('cccccccc-0000-4000-8000-000000000001', 'otra.pgtap') $$,
  '42501', null, 'Un miembro no puede invitar por usuario');

-- Otra persona: no la ve ni la puede usar
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.get_my_invitations())::int, 0, 'Otra persona no ve la invitación');
select is((select for_other_user from public.get_invitation_preview((select code from inv_code))), true,
  'La vista previa avisa que es para otra persona');
select throws_ok(format('select public.accept_invitation(%L)', (select code from inv_code)),
  '42501', 'Esta invitación es para otra persona', 'Otra persona no la puede usar');

-- La invitada: la ve y se une
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select invited_by_username from public.get_my_invitations()), 'ana', 'La invitada ve que la invitó @ana');
select lives_ok(format('select public.accept_invitation(%L)', (select code from inv_code)), 'La invitada se une');
select is((select count(*) from public.get_my_invitations())::int, 0, 'Ya no aparece como pendiente');

select * from finish();
rollback;
