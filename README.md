# Hogar

PWA mobile-first para organizar un hogar compartido: **tareas**, **compra del mes**, **compras pendientes**, **gastos fijos** y **gastos de tarjeta**. Las categorías de los gastos las asigna un LLM (DeepSeek), aprenden de las correcciones y todo se sincroniza en tiempo real entre los miembros. Estética pixel art 16 bits propia.

- Next.js 15.5 (App Router) + TypeScript, Tailwind v4 + shadcn/ui (retematizado), Recharts
- Supabase: Auth (usuario + contraseña), Postgres con RLS, Realtime (Broadcast privado)
- Zod + React Hook Form, SDK `openai` apuntando a DeepSeek
- Vitest (unitarios) + pgTAP (RLS y funciones SQL)

---

## Correr en local

Requisitos: Node 22+, pnpm 10+, Docker (o Colima).

```bash
pnpm install
pnpm db:start                 # levanta Supabase local (Docker). Imprime las claves.
cp .env.example .env.local    # completá con las claves que imprimió el paso anterior
pnpm db:reset                 # aplica migraciones + seed
pnpm dev                      # http://localhost:3000
```

Usuarios del seed (contraseña `hogar1234`):

| Usuario | Rol |
|---|---|
| `ana` | admin |
| `bruno` | miembro |
| `carla` | sin hogar: al entrar ve la invitación de Ana |

El hogar "Casa de prueba" trae tareas (incluida una quincenal y una personal), lista del mes, compras pendientes, gastos fijos con pagos, 2 tarjetas con gastos en cuotas, reglas aprendidas y dos invitaciones:
- `HOGAR123`: link abierto, para cualquiera.
- `CARLA234`: dirigida al usuario `carla`, que la ve apenas entra.

Otras herramientas locales:

- Supabase Studio: http://127.0.0.1:54323
- Guía de estilos (solo dev): http://localhost:3000/dev/estilos

### Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test` | Tests unitarios (Vitest) |
| `pnpm test:db` | Tests de base (pgTAP): RLS, privacidad, cuotas, tareas |
| `pnpm db:start` / `db:reset` | Supabase local / reaplicar migraciones + seed |
| `pnpm db:types` | Regenera `lib/supabase/database.types.ts` |
| `pnpm sprites` | Regenera los sprites pixel e íconos (`scripts/generate-sprites.mjs`) |

---

## Variables de entorno

Ver `.env.example`.

| Variable | Dónde | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + servidor | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente + servidor | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | **solo servidor** | `sb_secret_…`. Categorización en background, rate limit, logs. Nunca con prefijo `NEXT_PUBLIC_`. |
| `AUTH_USERNAME_DOMAIN` | servidor | Opcional. Dominio del email interno de las cuentas (default `usuarios.hogar.invalid`). **No lo cambies con cuentas creadas.** |
| `DEEPSEEK_API_KEY` | **solo servidor** | Sin key, los gastos sin categoría caen en "Sin categorizar" para revisar. |
| `DEEPSEEK_BASE_URL` | servidor | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | servidor | Default `deepseek-flash` (V4.1 Flash). Verificalo (ver abajo). |
| `AI_TIMEOUT_MS` | servidor | Default 5000 |
| `AI_REVIEW_THRESHOLD` | servidor | Default 0.6 (debajo, el gasto queda "a revisar") |
| `AI_RATE_LIMIT_PER_MINUTE` / `_PER_DAY` | servidor | Cupo de llamadas al LLM por hogar (20 / 300) |

### DeepSeek

1. Creá una API key en https://platform.deepseek.com.
2. Verificá el nombre del modelo disponible (DeepSeek cambia los nombres seguido; en noviembre de 2026 son `deepseek-flash` y `deepseek-v4-pro`):
   ```bash
   curl https://api.deepseek.com/models -H "Authorization: Bearer $DEEPSEEK_API_KEY"
   ```
3. Poné el id en `DEEPSEEK_MODEL`.

El servicio desactiva el modo *thinking* (`thinking: {type: "disabled"}`), usa JSON mode, temperatura 0, `max_tokens: 200`, sin reintentos y con timeout de 5 s.

---

## Deploy (Supabase + Vercel)

### 1. Supabase

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <ref>
pnpm exec supabase db push          # aplica supabase/migrations
```

En el dashboard del proyecto:

- **Authentication → URL Configuration**
  - *Site URL*: `https://<tu-dominio>`
  - *Redirect URLs*: `https://<tu-dominio>/**` y, si usás previews, `https://*-<tu-equipo>.vercel.app/**`
- **Authentication → Providers → Email**: desactivá *Confirm email*. La app crea la cuenta e inicia sesión en el momento, sin mails.
- **Authentication → Sessions**: dejá sin tope *Time-box user sessions* e *Inactivity timeout* (es el default), así la sesión dura hasta que la persona la cierre.
- **Authentication → Rate Limits / Refresh tokens**: un *reuse interval* de 60 s evita cierres de sesión cuando dos pestañas refrescan a la vez.
- **Realtime → Settings**: desactivá *Allow public access*, para que solo funcionen los canales privados autorizados por RLS (`household:<id>`).
- **Project Settings → API Keys**: copiá la *publishable* y la *secret* key.

El seed (`supabase/seed.sql`) es solo para desarrollo: no lo corras en producción.

### 2. Vercel

1. Importá el repo y elegí el framework *Next.js*.
2. Cargá las variables de entorno de la tabla (las `SECRET`/`API_KEY` solo en el servidor; Vercel no las expone si no tienen `NEXT_PUBLIC_`).
3. Deploy.

La categorización corre con `after()` (en Vercel usa `waitUntil`), así que la carga de un gasto responde sin esperar al LLM. Si una invocación se corta, los gastos que quedan en "categorizing" más de 2 minutos se reencolan al abrir Inicio o Gastos.

---

## Cuentas, hogares e invitaciones

- **Cuenta:** registro con nombre, **usuario** y contraseña. Se ingresa con usuario y contraseña.
  - El usuario no se puede cambiar.
  - No hay confirmación por mail ni recuperación de contraseña: se resuelven a mano desde la base (ver abajo).
  - Supabase Auth exige un email: cada usuario se guarda con uno interno, `usuario@usuarios.hogar.invalid` (`.invalid` es un dominio reservado). Nunca se muestra ni recibe correo.
- **Sesión:** dura todo lo posible.
  - La cookie vence a los 400 días (el máximo del navegador) y se renueva con el uso.
  - El refresh token de Supabase no vence por sí solo.
- **Hogar (grupo familiar):** quien crea el hogar es su admin.
- **Invitar:** el admin invita desde Más → Invitaciones de dos formas:
  - **Por usuario** (si ya tiene cuenta): solo esa persona puede usar la invitación. La ve en Inicio o en la bienvenida apenas entra, y puede unirse o rechazarla.
  - **Con un link o código abierto:** sirve para cualquiera mientras no venza.

### Administrar cuentas desde la base

Desde el SQL Editor de Supabase (o `psql`):

```sql
-- Cambiar la contraseña de alguien (por usuario)
update auth.users u
set encrypted_password = extensions.crypt('contraseña-nueva', extensions.gen_salt('bf')),
    updated_at = now()
from public.profiles p
where p.id = u.id and p.username = 'ana';

-- Ver las cuentas y a qué hogares pertenecen
select p.username, p.display_name, h.name as hogar, m.role, u.last_sign_in_at
from auth.users u
join public.profiles p on p.id = u.id
left join public.household_members m on m.user_id = u.id
left join public.households h on h.id = m.household_id
order by u.created_at;

-- Cerrar todas las sesiones de alguien (por ejemplo, si perdió el celular)
delete from auth.sessions s using public.profiles p
where p.id = s.user_id and p.username = 'ana';

-- Borrar una cuenta (sus membresías se borran en cascada; si era el último
-- admin de un hogar, se promueve al miembro más antiguo)
delete from auth.users u using public.profiles p
where p.id = u.id and p.username = 'ana';
```

## Arquitectura

```
app/                    rutas (App Router). (app)/ = con sesión y hogar; (auth)/ = pantalla de título
features/<módulo>/      actions.ts (Server Actions), queries.ts, schemas.ts (Zod), components/
lib/ai/                 servicio de categorización (agnóstico del proveedor)
lib/domain/             lógica pura: fechas, recurrencia, períodos de tarjeta, montos
lib/supabase/           clientes (browser, server, admin) y tipos generados
supabase/migrations/    migraciones versionadas con RLS
supabase/tests/         tests pgTAP
```

**Datos:**
- Los Server Components leen con el cliente del usuario, así que RLS siempre aplica.
- Las mutaciones son Server Actions validadas con el mismo schema Zod que el formulario.
- Realtime: un trigger manda una señal sin datos (`{table, op}`) al canal privado del hogar, y el cliente hace `router.refresh()`. Los ítems privados nunca viajan a otros miembros.

**Privacidad:**
- Las tareas, compras pendientes, gastos fijos y gastos de tarjeta pueden ser *personales*: solo los ve quien los creó.
- Las tablas hijas (cuotas, pagos, historial) heredan la visibilidad del padre.
- `created_by` es inmutable.
- Las reglas, las correcciones y los logs de IA solo los lee el servidor (los logs, también los admins).

**Tarjetas:**
- `statement_period(fecha, cierre)` define el resumen de cada compra; el cierre 31 se recorta al último día del mes.
- Un trigger genera las cuotas con centavos exactos: la última absorbe la diferencia.
- Cada tarjeta tiene su propio "período actual" (el resumen abierto).
- Los totales se muestran separados por moneda (ARS / USD, sin conversión).

**Tareas:**
- Frecuencias: única, diaria, semanal (días elegidos), **quincenal** (cada 2 semanas en los días elegidos, con una fecha ancla) y mensual (el día 31 se recorta).
- Completar es una RPC atómica que crea la próxima ocurrencia. Es idempotente frente al doble tap y se puede deshacer.
- Quien completa una tarea queda como su responsable (aunque estuviera asignada a otro o a nadie). La próxima ocurrencia conserva la asignación original, y deshacer la restaura.
- Las tareas sin asignar son de todos: aparecen en "Mis tareas" y en Inicio de cada miembro.

**Gastos fijos:**
- Pueden tener varios responsables (`responsible_ids`). Un trigger valida que sean miembros del hogar y que un gasto personal solo tenga a su dueño; quien deja el hogar sale de las listas.

### Categorización con IA (`lib/ai`)

1. Al crear un gasto sin categoría se guarda con `categorizing` y la respuesta vuelve enseguida.
2. En background, con `after()`:
   - **Regla aprendida**: la descripción normalizada (`"MERPAGO*RAPPI 02/03"` → `"rappi"`) coincide con una regla y se asigna sin llamar al LLM.
   - **Si no hay regla, se llama al LLM**, previa verificación del rate limit del hogar.
     - El prompt lleva las categorías con su descripción y las últimas 20 correcciones como ejemplos.
     - La respuesta se valida con Zod contra las categorías del hogar.
     - Si la confianza es menor a 0.6, la categoría se asigna igual pero el gasto queda **a revisar**.
   - **Si algo falla** (error, timeout de 5 s, JSON inválido o categoría inexistente), el gasto va a "Sin categorizar" y queda a revisar.
3. Al corregir una categoría a mano se crea o actualiza la regla y se registra la corrección.
4. Cada llamada al LLM se guarda en `ai_logs` (modelo, latencia, tokens, error). Lo pueden ver los admins en Más → IA.
5. "Recategorizar con IA" funciona por gasto (desde el chip) o para todo el período. El cliente lo hace en lotes de 10 contra `/api/ai/recategorize`, que responde 429 si el hogar se queda sin cupo.

`categorizeExpense(input, ctx, deps)` es pura (sin DB ni env): el proveedor se inyecta (`CategorizationProvider`). Para cambiar de modelo basta con otra implementación de la interfaz.

---

## Diseño

Pixel art 16 bits **original**: no usa personajes, sprites, tipografías ni sonidos de juegos existentes.

- **Paleta:** día y noche, contraste AA verificado. Hay una paleta cerrada de 16 colores para categorías, miembros y tarjetas; la base guarda la clave del color, no el hex.
- **Tipografía:** *Jersey 10* (títulos, HUD y montos, el toque pixel) y *Atkinson Hyperlegible Next* (todo el texto: diseñada para máxima legibilidad).
- **Íconos y sprites:** íconos *pixelarticons* (MIT). Los sprites propios se generan con `pnpm sprites`:
  - los dos michis (el naranja y el negrito)
  - sus caritas
  - la moneda, el suelo, las nubes
  - el ícono de la app
- **Los michis** aparecen en las pantallas de ingreso, sobre el pasto de la barra inferior, en los estados vacíos, mientras carga, sin conexión, en la página no encontrada, en los toasts y en el ícono.
- **Movimiento y sonido:** animaciones cuadro a cuadro (`steps()`) que se apagan con `prefers-reduced-motion`. Los sonidos chiptune se generan con WebAudio y vienen apagados por defecto.

## Limitaciones conocidas

- Cambiar el día de cierre de una tarjeta no mueve los gastos ya cargados.
- Invitar por usuario requiere que la persona ya tenga cuenta; si no, se usa el link o el código.
- El dominio interno `.invalid` lo probé con Supabase local. Si el proyecto en la nube rechazara esos emails al registrarse, definí `AUTH_USERNAME_DOMAIN` (por ejemplo, un subdominio tuyo que no reciba correo) **antes** de crear cuentas.
- La PWA funciona online. Sin conexión muestra una página offline: los datos son compartidos y en tiempo real, así que no se cachean.
