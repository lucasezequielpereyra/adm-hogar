-- ════════════════════════════════════════════════════════════════════
-- 14 · Más categorías por defecto + categorías creadas por la IA
-- - Tareas: "Habitación" (con subcategorías).
-- - Gastos: "Vivienda", "Seguros" y "Préstamos y créditos", pensadas para
--   los gastos fijos (antes el alquiler caía en Servicios).
-- - categories.created_by_ai: la IA puede crear una categoría cuando
--   ninguna encaja (ver lib/ai/new-category.ts).
-- Se agregan a los hogares existentes sin pisar lo que cada uno editó.
-- ════════════════════════════════════════════════════════════════════

alter table public.categories add column created_by_ai boolean not null default false;

-- ── Tareas: Habitación ──────────────────────────────────────────────
create or replace function private.add_task_category_tree(hid uuid, tree jsonb, root_order integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  root_id uuid;
  child text;
  j integer := 0;
begin
  -- Si ya hay una raíz con ese nombre (sin importar mayúsculas), no se toca.
  if exists (
    select 1 from public.task_categories
    where household_id = hid and parent_id is null and lower(name) = lower(tree ->> 'name')
  ) then
    return;
  end if;
  insert into public.task_categories (household_id, name, icon, color, sort_order, created_by)
  values (hid, tree ->> 'name', tree ->> 'icon', tree ->> 'color', root_order, null)
  returning id into root_id;
  for child in select * from jsonb_array_elements_text(tree -> 'children') loop
    insert into public.task_categories (household_id, parent_id, name, icon, color, sort_order, created_by)
    values (hid, root_id, child, tree ->> 'icon', tree ->> 'color', j, null);
    j := j + 1;
  end loop;
end;
$$;

create or replace function private.seed_task_categories(hid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  roots jsonb := '[
    {"name":"Cocinar","icon":"fire","color":"naranja","children":["Almuerzo","Cena","Lavar platos"]},
    {"name":"Living","icon":"sofa","color":"azul","children":["Aspirar","Ordenar","Limpiar vidrios"]},
    {"name":"Habitación","icon":"bed","color":"violeta","children":["Hacer la cama","Cambiar sábanas","Ordenar","Aspirar"]},
    {"name":"Michis","icon":"cat","color":"naranja","children":["Arena","Comida","Veterinario"]},
    {"name":"Baño","icon":"spray","color":"cian","children":["Limpiar baño","Reponer papel"]},
    {"name":"Lavadero","icon":"shirt","color":"celeste","children":["Lavar ropa","Doblar ropa"]},
    {"name":"Compras","icon":"shopping-cart","color":"verde","children":["Supermercado","Verdulería"]}
  ]';
  r jsonb;
  i integer := 0;
begin
  for r in select * from jsonb_array_elements(roots) loop
    perform private.add_task_category_tree(hid, r, i);
    i := i + 1;
  end loop;
end;
$$;

-- Hogares existentes: Habitación al final de sus categorías.
select private.add_task_category_tree(
  h.id,
  '{"name":"Habitación","icon":"bed","color":"violeta","children":["Hacer la cama","Cambiar sábanas","Ordenar","Aspirar"]}',
  coalesce((select max(t.sort_order) + 1 from public.task_categories t where t.household_id = h.id and t.parent_id is null), 0)
)
from public.households h;

-- ── Gastos: Vivienda, Seguros, Préstamos y créditos ─────────────────
create or replace function private.seed_expense_categories(hid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (household_id, name, icon, color, description, is_system, sort_order, created_by)
  values
    (hid, 'Supermercado', 'shopping-cart', 'verde',
     'Supermercados, almacenes, verdulerías, carnicerías, dietéticas y mayoristas (Coto, Carrefour, Día, Jumbo, chinos).', false, 0, null),
    (hid, 'Delivery y comida', 'coffee', 'naranja',
     'Restaurantes, bares, cafés, heladerías, delivery y apps de comida (Rappi, PedidosYa).', false, 1, null),
    (hid, 'Vivienda', 'home', 'lima',
     'Alquiler, expensas, cuota del crédito hipotecario, ABL e inmobiliaria: el costo de vivir en la casa.', false, 2, null),
    (hid, 'Servicios', 'zap', 'amarillo',
     'Luz, gas, agua, internet, telefonía, celular y cable (Edenor, Metrogas, AySA, Personal, Movistar).', false, 3, null),
    (hid, 'Transporte', 'car', 'azul',
     'Nafta, SUBE, colectivo, taxis, Uber, Cabify, DiDi, peajes, estacionamiento y service del auto.', false, 4, null),
    (hid, 'Salud', 'heart', 'rojo',
     'Farmacias, prepaga, obra social, médicos, odontología, análisis, óptica.', false, 5, null),
    (hid, 'Seguros', 'shield', 'celeste',
     'Seguros del auto, la moto, el hogar, de vida, del celular y de bicicleta.', false, 6, null),
    (hid, 'Préstamos y créditos', 'banknote', 'menta',
     'Cuotas de préstamos personales y prendarios, planes de ahorro, adelantos y deudas con personas.', false, 7, null),
    (hid, 'Mascotas', 'cat', 'magenta',
     'Veterinaria, alimento balanceado, piedras sanitarias, juguetes y accesorios para mascotas.', false, 8, null),
    (hid, 'Hogar', 'sofa', 'marron',
     'Muebles, electrodomésticos, ferretería, bazar, decoración, plantas, arreglos y mantenimiento de la casa.', false, 9, null),
    (hid, 'Ropa y cuidado personal', 'shirt', 'rosa',
     'Ropa, calzado, accesorios, peluquería, cosmética y perfumería.', false, 10, null),
    (hid, 'Suscripciones y ocio', 'tv', 'violeta',
     'Streaming y apps (Netflix, Spotify, Disney+, YouTube, iCloud, Google One), juegos, cine, teatro, recitales y salidas.', false, 11, null),
    (hid, 'Educación', 'book-open', 'indigo',
     'Cursos, colegio, universidad, idiomas, libros y útiles.', false, 12, null),
    (hid, 'Viajes', 'suitcase', 'cian',
     'Pasajes, hoteles, alquileres temporarios (Airbnb, Booking), excursiones y gastos de viaje.', false, 13, null),
    (hid, 'Impuestos y comisiones', 'receipt', 'gris',
     'Impuestos (patente, ganancias, sellos, percepciones), comisiones bancarias, mantenimiento de cuenta e intereses.', false, 14, null),
    (hid, 'Otros', 'box', 'arena',
     'Gastos que no encajan en ninguna otra categoría (regalos, donaciones, varios).', false, 15, null),
    (hid, 'Sin categorizar', 'circle-question', 'gris',
     'Sin categoría asignada todavía. Hay que revisarlo.', true, 99, null);
end;
$$;

-- Hogares existentes: se agregan antes de "Otros" (si alguien ya tiene una
-- con ese nombre, se respeta la suya).
insert into public.categories (household_id, name, icon, color, description, is_system, sort_order, created_by)
select h.id, n.name, n.icon, n.color::public.palette_color, n.description, false,
       coalesce((select max(c.sort_order) from public.categories c
                 where c.household_id = h.id and not c.is_system and lower(c.name) <> 'otros'), 0) + n.ord,
       null
from public.households h
cross join (values
  ('Vivienda', 'home', 'lima',
   'Alquiler, expensas, cuota del crédito hipotecario, ABL e inmobiliaria: el costo de vivir en la casa.', 1),
  ('Seguros', 'shield', 'celeste',
   'Seguros del auto, la moto, el hogar, de vida, del celular y de bicicleta.', 2),
  ('Préstamos y créditos', 'banknote', 'menta',
   'Cuotas de préstamos personales y prendarios, planes de ahorro, adelantos y deudas con personas.', 3)
) as n (name, icon, color, description, ord)
where not exists (
  select 1 from public.categories c where c.household_id = h.id and lower(c.name) = lower(n.name)
);

-- "Otros" vuelve a quedar última (solo si tenía su orden de fábrica).
update public.categories c
set sort_order = (select max(o.sort_order) + 1 from public.categories o
                  where o.household_id = c.household_id and not o.is_system and o.id <> c.id)
where c.name = 'Otros' and not c.is_system and c.sort_order = 12;

-- Las descripciones que nombraban expensas, ABL y seguro del auto pasan a
-- las categorías nuevas (solo si nadie las editó).
update public.categories
set description = 'Luz, gas, agua, internet, telefonía, celular y cable (Edenor, Metrogas, AySA, Personal, Movistar).'
where name = 'Servicios'
  and description = 'Luz, gas, agua, internet, telefonía, celular, cable, expensas y servicios del hogar (Edenor, Metrogas, AySA, Personal, Movistar).';

update public.categories
set description = 'Nafta, SUBE, colectivo, taxis, Uber, Cabify, DiDi, peajes, estacionamiento y service del auto.'
where name = 'Transporte'
  and description = 'Nafta, SUBE, colectivo, taxis, Uber, Cabify, DiDi, peajes, estacionamiento, service y seguro del auto.';

update public.categories
set description = 'Impuestos (patente, ganancias, sellos, percepciones), comisiones bancarias, mantenimiento de cuenta e intereses.'
where name = 'Impuestos y comisiones'
  and description = 'Impuestos (ABL, patente, ganancias, sellos, percepciones), comisiones bancarias, mantenimiento de cuenta e intereses.';
