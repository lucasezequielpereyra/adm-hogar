-- ════════════════════════════════════════════════════════════════════
-- Seed de desarrollo: un hogar, 2 miembros y datos de ejemplo.
-- Usuarios (contraseña: hogar1234):
--   ana   (admin)
--   bruno (miembro)
--   carla (sin hogar todavía; tiene una invitación de Ana esperándola)
-- El email de Auth es interno: <usuario>@usuarios.hogar.invalid
-- ════════════════════════════════════════════════════════════════════

-- ── Usuarios ────────────────────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'ana@usuarios.hogar.invalid', extensions.crypt('hogar1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Ana","username":"ana"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'bruno@usuarios.hogar.invalid', extensions.crypt('hogar1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Bruno","username":"bruno"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'carla@usuarios.hogar.invalid', extensions.crypt('hogar1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Carla","username":"carla"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","email":"ana@usuarios.hogar.invalid","email_verified":true}', 'email', now(), now(), now()),
  (gen_random_uuid(), 'bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002',
   '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","email":"bruno@usuarios.hogar.invalid","email_verified":true}', 'email', now(), now(), now()),
  (gen_random_uuid(), 'dddddddd-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000003',
   '{"sub":"dddddddd-0000-4000-8000-000000000003","email":"carla@usuarios.hogar.invalid","email_verified":true}', 'email', now(), now(), now());

-- (los perfiles los crea el trigger on_auth_user_created)

-- ── Hogar y miembros ────────────────────────────────────────────────
insert into public.households (id, name, created_by)
values ('cccccccc-0000-4000-8000-000000000001', 'Casa de prueba', 'aaaaaaaa-0000-4000-8000-000000000001');

insert into public.household_members (household_id, user_id, role, color, created_by)
values
  ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'admin', 'azul', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', 'member', 'naranja', 'bbbbbbbb-0000-4000-8000-000000000002');

update public.profiles
set current_household_id = 'cccccccc-0000-4000-8000-000000000001'
where id in ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002');

-- Datos por defecto de cada módulo (categorías, etc.)
select private.seed_household_defaults('cccccccc-0000-4000-8000-000000000001');

-- Invitaciones de ejemplo: un link abierto y una para el usuario "carla"
-- (la ve apenas ingresa).
insert into public.invitations (household_id, code, role, created_by, invited_user_id, invited_username, max_uses)
values
  ('cccccccc-0000-4000-8000-000000000001', 'HOGAR123', 'member', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null),
  ('cccccccc-0000-4000-8000-000000000001', 'CARLA234', 'member', 'aaaaaaaa-0000-4000-8000-000000000001',
   'dddddddd-0000-4000-8000-000000000003', 'carla', 1);

-- ── Tareas ──────────────────────────────────────────────────────────
-- Fechas relativas a hoy, para que el seed siempre tenga vencidas/hoy/próximas.
with
  hh as (select 'cccccccc-0000-4000-8000-000000000001'::uuid as id),
  cat as (
    select c.id, coalesce(p.name || ' › ', '') || c.name as path
    from public.task_categories c
    left join public.task_categories p on p.id = c.parent_id
    where c.household_id = (select id from hh)
  )
insert into public.tasks (household_id, title, task_category_id, assigned_to, due_date, priority,
  frequency, weekdays, month_day, recurrence_anchor, is_private, description, created_by)
values
  ((select id from hh), 'Limpiar la arena', (select id from cat where path = 'Michis › Arena'),
   'bbbbbbbb-0000-4000-8000-000000000002', current_date - 2, 'high', 'daily', null, null, current_date - 2, false, null,
   'aaaaaaaa-0000-4000-8000-000000000001'),
  ((select id from hh), 'Darle de comer a los michis', (select id from cat where path = 'Michis › Comida'),
   'aaaaaaaa-0000-4000-8000-000000000001', current_date, 'medium', 'daily', null, null, current_date, false,
   'Media taza de balanceado a cada uno.', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ((select id from hh), 'Lavar los platos de la cena', (select id from cat where path = 'Cocinar › Lavar platos'),
   'bbbbbbbb-0000-4000-8000-000000000002', current_date, 'medium', 'once', null, null, null, false, null,
   'bbbbbbbb-0000-4000-8000-000000000002'),
  ((select id from hh), 'Aspirar el living', (select id from cat where path = 'Living › Aspirar'),
   'aaaaaaaa-0000-4000-8000-000000000001', current_date + 2, 'low', 'weekly', array[1, 4]::smallint[], null, current_date + 2, false, null,
   'aaaaaaaa-0000-4000-8000-000000000001'),
  ((select id from hh), 'Cambiar las sábanas', (select id from cat where path = 'Lavadero › Lavar ropa'),
   'bbbbbbbb-0000-4000-8000-000000000002', current_date + 5, 'medium', 'biweekly',
   array[extract(dow from current_date + 5)::smallint], null, current_date + 5, false, null,
   'bbbbbbbb-0000-4000-8000-000000000002'),
  ((select id from hh), 'Turno del veterinario (vacunas)', (select id from cat where path = 'Michis › Veterinario'),
   'aaaaaaaa-0000-4000-8000-000000000001', current_date + 10, 'high', 'once', null, null, null, false, null,
   'aaaaaaaa-0000-4000-8000-000000000001'),
  ((select id from hh), 'Limpiar el baño a fondo', (select id from cat where path = 'Baño › Limpiar baño'),
   null, current_date - 1, 'medium', 'monthly', null, extract(day from current_date - 1)::smallint, current_date - 1, false, null,
   'aaaaaaaa-0000-4000-8000-000000000001'),
  ((select id from hh), 'Comprar regalo de cumpleaños de Bruno', null,
   'aaaaaaaa-0000-4000-8000-000000000001', current_date + 6, 'medium', 'once', null, null, null, true, null,
   'aaaaaaaa-0000-4000-8000-000000000001'),
  ((select id from hh), 'Ordenar la alacena', (select id from cat where path = 'Living › Ordenar'),
   null, null, 'low', 'once', null, null, null, false, null,
   'bbbbbbbb-0000-4000-8000-000000000002');

-- Historial: algunas tareas ya hechas en la semana
with done as (
  insert into public.tasks (household_id, title, task_category_id, assigned_to, due_date, status, completed_at, completed_by, created_by)
  select 'cccccccc-0000-4000-8000-000000000001', t.title,
         (select c.id from public.task_categories c where c.household_id = 'cccccccc-0000-4000-8000-000000000001' and c.name = t.cat),
         t.who, current_date - t.days_ago, 'done', now() - (t.days_ago || ' days')::interval, t.who, t.who
  from (values
    ('Cena del martes', 'Cena', 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, 1),
    ('Lavar ropa blanca', 'Lavar ropa', 'bbbbbbbb-0000-4000-8000-000000000002'::uuid, 2),
    ('Reponer papel higiénico', 'Reponer papel', 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, 3),
    ('Limpiar vidrios del living', 'Limpiar vidrios', 'bbbbbbbb-0000-4000-8000-000000000002'::uuid, 4)
  ) as t(title, cat, who, days_ago)
  returning id, completed_at, completed_by
)
insert into public.task_completions (household_id, task_id, completed_by, completed_at, created_by)
select 'cccccccc-0000-4000-8000-000000000001', id, completed_by, completed_at, completed_by from done;

-- ── Compra del mes ──────────────────────────────────────────────────
insert into public.shopping_lists (id, household_id, month, name, is_template, created_by)
values
  ('5a5a5a5a-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001',
   (date_trunc('month', current_date) - interval '1 month')::date, 'Mes anterior', false, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('5a5a5a5a-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000001',
   date_trunc('month', current_date)::date, 'Mes actual', false, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('5a5a5a5a-0000-4000-8000-000000000003', 'cccccccc-0000-4000-8000-000000000001',
   null, 'Básicos', true, 'aaaaaaaa-0000-4000-8000-000000000001');

-- Nombres en español (ej. "Noviembre 2026")
update public.shopping_lists l
set name = initcap((array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'])[extract(month from l.month)::int])
           || ' ' || extract(year from l.month)::int
where l.month is not null and l.household_id = 'cccccccc-0000-4000-8000-000000000001';

insert into public.shopping_items (household_id, list_id, name, quantity, unit, category, estimated_price, actual_price, is_purchased, purchased_by, purchased_at, created_by)
select 'cccccccc-0000-4000-8000-000000000001', l.list_id, i.name, i.qty, i.unit, i.cat, i.est,
       case when l.done or i.bought then i.real end,
       l.done or i.bought,
       case when l.done or i.bought then 'aaaaaaaa-0000-4000-8000-000000000001'::uuid end,
       case when l.done or i.bought then now() end,
       'aaaaaaaa-0000-4000-8000-000000000001'
from (values
  ('5a5a5a5a-0000-4000-8000-000000000001'::uuid, true),
  ('5a5a5a5a-0000-4000-8000-000000000002'::uuid, false)
) as l(list_id, done)
cross join (values
  ('Yerba 1 kg', 2, 'u', 'almacen', 9800, 10400, true),
  ('Fideos', 4, 'paq', 'almacen', 5600, 5200, true),
  ('Arroz', 2, 'kg', 'almacen', 3400, 3600, false),
  ('Aceite de girasol', 1, 'l', 'almacen', 3900, null, false),
  ('Lavandina', 2, 'l', 'limpieza', 2600, 2400, true),
  ('Detergente', 1, 'u', 'limpieza', 3100, null, false),
  ('Papel higiénico x12', 1, 'paq', 'higiene', 8900, 9200, true),
  ('Pasta dental', 2, 'u', 'higiene', 4200, null, false),
  ('Bananas', 1, 'kg', 'frescos', 2500, 2300, true),
  ('Leche', 6, 'l', 'frescos', 9000, null, false),
  ('Agua con gas', 6, 'u', 'bebidas', 7200, null, false),
  ('Balanceado para gatos 3 kg', 1, 'u', 'mascotas', 21000, 22500, true),
  ('Piedras sanitarias', 2, 'u', 'mascotas', 9000, null, false)
) as i(name, qty, unit, cat, est, real, bought);

insert into public.shopping_items (household_id, list_id, name, quantity, unit, category, estimated_price, created_by)
values
  ('cccccccc-0000-4000-8000-000000000001', '5a5a5a5a-0000-4000-8000-000000000003', 'Yerba 1 kg', 2, 'u', 'almacen', 10400, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('cccccccc-0000-4000-8000-000000000001', '5a5a5a5a-0000-4000-8000-000000000003', 'Papel higiénico x12', 1, 'paq', 'higiene', 9200, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('cccccccc-0000-4000-8000-000000000001', '5a5a5a5a-0000-4000-8000-000000000003', 'Balanceado para gatos 3 kg', 1, 'u', 'mascotas', 22500, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('cccccccc-0000-4000-8000-000000000001', '5a5a5a5a-0000-4000-8000-000000000003', 'Lavandina', 2, 'l', 'limpieza', 2400, 'aaaaaaaa-0000-4000-8000-000000000001');

-- ── Compras pendientes ──────────────────────────────────────────────
insert into public.pending_purchases (household_id, name, kind, priority, estimated_price, currency, url, notes,
  requested_by, is_private, category_id, category_source, created_by)
select 'cccccccc-0000-4000-8000-000000000001', p.name, p.kind, p.priority, p.price, p.currency, p.url, p.notes, p.who, p.priv,
       (select c.id from public.categories c where c.household_id = 'cccccccc-0000-4000-8000-000000000001' and c.name = p.cat),
       'user', p.who
from (values
  ('Rascador para los michis', 'hogar', 'high', 35000, 'ARS', null, 'Que sea alto, el viejo ya está destruido.', 'bbbbbbbb-0000-4000-8000-000000000002'::uuid, false, 'Mascotas'),
  ('Lámpara para el living', 'hogar', 'medium', 48000, 'ARS', null, null, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, false, 'Hogar'),
  ('Zapatillas para correr', 'personal', 'low', 120, 'USD', null, null, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, true, 'Ropa y cuidado personal'),
  ('Funda para el sillón', 'hogar', 'low', 27000, 'ARS', null, null, 'bbbbbbbb-0000-4000-8000-000000000002'::uuid, false, 'Hogar')
) as p(name, kind, priority, price, currency, url, notes, who, priv, cat);

-- ── Gastos fijos ────────────────────────────────────────────────────
insert into public.fixed_expenses (id, household_id, name, amount, currency, due_day, payment_method, responsible_ids,
  is_private, category_id, category_source, created_by)
select f.id, 'cccccccc-0000-4000-8000-000000000001', f.name, f.amount, f.currency, f.due_day, f.method,
       -- El alquiler lo pagan entre los dos.
       case when f.name = 'Alquiler' then array['aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002']::uuid[]
            else array[f.who] end,
       f.priv,
       (select c.id from public.categories c where c.household_id = 'cccccccc-0000-4000-8000-000000000001' and c.name = f.cat),
       'user', coalesce(f.who, 'aaaaaaaa-0000-4000-8000-000000000001')
from (values
  ('f1f1f1f1-0000-4000-8000-000000000001'::uuid, 'Alquiler', 650000, 'ARS', 10, 'transferencia', 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, false, 'Hogar'),
  ('f1f1f1f1-0000-4000-8000-000000000002'::uuid, 'Expensas', 98000, 'ARS', 10, 'transferencia', 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, false, 'Servicios'),
  ('f1f1f1f1-0000-4000-8000-000000000003'::uuid, 'Luz (Edenor)', 38500, 'ARS', 26, 'debito', 'bbbbbbbb-0000-4000-8000-000000000002'::uuid, false, 'Servicios'),
  ('f1f1f1f1-0000-4000-8000-000000000004'::uuid, 'Gas (Metrogas)', 21000, 'ARS', 28, 'debito', 'bbbbbbbb-0000-4000-8000-000000000002'::uuid, false, 'Servicios'),
  ('f1f1f1f1-0000-4000-8000-000000000005'::uuid, 'Internet', 29900, 'ARS', 15, 'tarjeta', 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, false, 'Servicios'),
  ('f1f1f1f1-0000-4000-8000-000000000006'::uuid, 'Prepaga', 145000, 'ARS', 5, 'debito', 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, false, 'Salud'),
  ('f1f1f1f1-0000-4000-8000-000000000007'::uuid, 'Gimnasio', 32000, 'ARS', 1, 'debito', 'bbbbbbbb-0000-4000-8000-000000000002'::uuid, true, 'Salud'),
  ('f1f1f1f1-0000-4000-8000-000000000008'::uuid, 'iCloud 200 GB', 3, 'USD', 18, 'tarjeta', 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, false, 'Suscripciones y ocio')
) as f(id, name, amount, currency, due_day, method, who, priv, cat);

-- Pagos del mes actual (algunos) y del anterior (todos)
insert into public.fixed_expense_payments (household_id, fixed_expense_id, period, amount, currency, paid_at, paid_by, created_by)
select 'cccccccc-0000-4000-8000-000000000001', f.id, p.period,
       round(f.amount * p.factor, 2), f.currency,
       (p.period + (least(f.due_day, 28) - 1))::date, f.created_by, f.created_by
from public.fixed_expenses f
cross join (values
  ((date_trunc('month', current_date) - interval '1 month')::date, 0.97),
  (date_trunc('month', current_date)::date, 1.0)
) as p(period, factor)
where f.household_id = 'cccccccc-0000-4000-8000-000000000001'
  and (p.period < date_trunc('month', current_date)::date or f.due_day <= 15);

-- ── Tarjetas y gastos ───────────────────────────────────────────────
insert into public.cards (id, household_id, name, bank, holder_id, closing_day, due_day, color, last4, created_by)
values
  ('ca4d0000-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 'Visa', 'Galicia',
   'aaaaaaaa-0000-4000-8000-000000000001', 25, 5, 'azul', '4821', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000001', 'Mastercard', 'BBVA',
   'bbbbbbbb-0000-4000-8000-000000000002', 8, 18, 'naranja', '1077', 'bbbbbbbb-0000-4000-8000-000000000002');

-- Gastos de los últimos ~75 días (las cuotas las genera el trigger).
insert into public.card_expenses (household_id, card_id, purchase_date, description, amount, currency, installments_count,
  is_private, category_id, category_source, ai_confidence, ai_reason, needs_review, created_by)
select 'cccccccc-0000-4000-8000-000000000001', e.card, current_date - e.days_ago, e.description, e.amount, e.currency, e.cuotas,
       e.priv,
       (select c.id from public.categories c where c.household_id = 'cccccccc-0000-4000-8000-000000000001' and c.name = e.cat),
       e.src, e.conf, e.reason, coalesce(e.conf < 0.6, false) or e.cat = 'Sin categorizar', e.who
from (values
  ('ca4d0000-0000-4000-8000-000000000001'::uuid, 1,  'MERPAGO*RAPPI 02/03',      18450.00, 'ARS', 1, false, 'Delivery y comida', 'rule', null::numeric, null, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid),
  ('ca4d0000-0000-4000-8000-000000000001', 2,  'COTO SUC 123',               84200.00, 'ARS', 1, false, 'Supermercado', 'ai', 0.95, 'Coto es una cadena de supermercados.', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000001', 3,  'NETFLIX.COM',                 9.99, 'USD', 1, false, 'Suscripciones y ocio', 'ai', 0.97, 'Servicio de streaming.', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000001', 5,  'UBER *TRIP',                  6300.00, 'ARS', 1, false, 'Transporte', 'ai', 0.92, 'Viaje en Uber.', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000001', 6,  'DLO*SPOTIFY',                 4.99, 'USD', 1, false, 'Suscripciones y ocio', 'rule', null, null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000001', 9,  'FARMACITY 0045',             23800.00, 'ARS', 1, false, 'Salud', 'ai', 0.88, 'Cadena de farmacias.', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000001', 12, 'TIENDA MIA SRL',             41000.00, 'ARS', 1, false, 'Otros', 'ai', 0.41, 'Comercio genérico; no está claro qué se compró.', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000001', 20, 'FRAVEGA HELADERA',          1290000.00, 'ARS', 12, false, 'Hogar', 'user', null, null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000001', 35, 'SHELL BOX',                  52000.00, 'ARS', 1, false, 'Transporte', 'ai', 0.9, 'Estación de servicio.', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000001', 40, 'COTO SUC 123',               77300.00, 'ARS', 1, false, 'Supermercado', 'rule', null, null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000001', 62, 'DESPEGAR VUELO BARILOCHE',  480000.00, 'ARS', 6, false, 'Viajes', 'ai', 0.93, 'Pasajes de avión.', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ca4d0000-0000-4000-8000-000000000002', 1,  'PEDIDOSYA*LA PARRILLA',      27600.00, 'ARS', 1, false, 'Delivery y comida', 'ai', 0.94, 'App de delivery.', 'bbbbbbbb-0000-4000-8000-000000000002'),
  ('ca4d0000-0000-4000-8000-000000000002', 4,  'VETERINARIA PATITAS',        35000.00, 'ARS', 1, false, 'Mascotas', 'ai', 0.91, 'Veterinaria.', 'bbbbbbbb-0000-4000-8000-000000000002'),
  ('ca4d0000-0000-4000-8000-000000000002', 7,  'STEAM PURCHASE',              19.99, 'USD', 1, true, 'Suscripciones y ocio', 'ai', 0.86, 'Tienda de videojuegos.', 'bbbbbbbb-0000-4000-8000-000000000002'),
  ('ca4d0000-0000-4000-8000-000000000002', 10, 'DIA TIENDA 512',             31200.00, 'ARS', 1, false, 'Supermercado', 'ai', 0.9, 'Supermercado Día.', 'bbbbbbbb-0000-4000-8000-000000000002'),
  ('ca4d0000-0000-4000-8000-000000000002', 15, 'MERPAGO*KIOSCO',              4500.00, 'ARS', 1, false, 'Sin categorizar', null, null, null, 'bbbbbbbb-0000-4000-8000-000000000002'),
  ('ca4d0000-0000-4000-8000-000000000002', 25, 'ZARA ONLINE',                96000.00, 'ARS', 3, false, 'Ropa y cuidado personal', 'ai', 0.95, 'Tienda de ropa.', 'bbbbbbbb-0000-4000-8000-000000000002'),
  ('ca4d0000-0000-4000-8000-000000000002', 45, 'MUSIMUNDO PARLANTE',         89990.00, 'ARS', 6, false, 'Hogar', 'ai', 0.55, 'Electrónica, podría ser hogar u ocio.', 'bbbbbbbb-0000-4000-8000-000000000002')
) as e(card, days_ago, description, amount, currency, cuotas, priv, cat, src, conf, reason, who);

-- Reglas aprendidas de correcciones anteriores
insert into public.category_rules (household_id, pattern, category_id, hits, created_by)
select 'cccccccc-0000-4000-8000-000000000001', r.pattern,
       (select c.id from public.categories c where c.household_id = 'cccccccc-0000-4000-8000-000000000001' and c.name = r.cat),
       r.hits, 'aaaaaaaa-0000-4000-8000-000000000001'
from (values ('rappi', 'Delivery y comida', 7), ('spotify', 'Suscripciones y ocio', 3), ('coto suc', 'Supermercado', 5)) as r(pattern, cat, hits);

insert into public.category_corrections (household_id, entity_type, entity_id, description, normalized, to_category_id, created_by)
select 'cccccccc-0000-4000-8000-000000000001', 'card_expense', gen_random_uuid(), r.description, r.normalized,
       (select c.id from public.categories c where c.household_id = 'cccccccc-0000-4000-8000-000000000001' and c.name = r.cat),
       'aaaaaaaa-0000-4000-8000-000000000001'
from (values
  ('MERPAGO*RAPPI 01/02', 'rappi', 'Delivery y comida'),
  ('DLO*SPOTIFY', 'spotify', 'Suscripciones y ocio'),
  ('COTO SUC 88', 'coto suc', 'Supermercado')
) as r(description, normalized, cat);
