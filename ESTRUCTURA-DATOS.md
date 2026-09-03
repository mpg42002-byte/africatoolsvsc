# Africa Tools — Estructura de datos

**Última actualización:** agosto 2026 — refleja la arquitectura real después de migrar a Supabase (Fases 1-4).

---

## Dónde vive cada cosa

Africa Tools ya **no** guarda usuarios ni sesión en `localStorage` — eso vive en Supabase (autenticación real, base de datos Postgres). Lo que queda en el navegador es: preferencias de tema, y una copia local + cola de sincronización para trabajar sin conexión.

## 1. Supabase — `auth.users` (autenticación)

Manejado enteramente por Supabase Auth, no por nuestro código. El login sigue siendo por **nombre de usuario** (no correo) de cara al equipo — internamente se traduce a un correo falso `usuario@africatools.internal` antes de hablar con Supabase, transparente para quien usa la app. Ver `assets/shell.js` (`usuarioToEmail`).

## 2. Supabase — tabla `profiles`

Datos adicionales de cada cuenta que Supabase Auth no guarda por sí solo:

```sql
id uuid primary key references auth.users(id)
usuario text unique not null
nombre text not null default ''
roles text[] not null default '{}'
activo boolean not null default true
must_change_password boolean not null default false
created_at timestamptz not null default now()
```

Roles válidos hoy (ver `assets/permissions.js`, objeto `ROLES` — usan guion bajo, no guion): `administrador`, `supervisor`, `lider_parque`, `lider_seguridad`, `cajero`, `anfitrion_fiesta`. Seguridad por fila (RLS): cada quien lee su propio perfil; solo administradores leen/editan/eliminan cualquier perfil (verificado con la función `is_admin()` + un trigger `prevent_self_privilege_escalation` que bloquea que alguien se autoasigne un rol).

## 3. Supabase — tabla `activity_log`

Registro de qué se hizo desde el panel de Administración (crear/editar/activar/desactivar/eliminar usuarios):

```sql
id bigint generated always as identity primary key
actor text not null
actor_id uuid references auth.users(id)
action text not null
created_at timestamptz not null default now()
```

Solo administradores pueden leerlo completo; cualquier persona autenticada puede insertar una entrada sobre su propia acción.

## 4. Supabase — tabla `module_data` (datos privados por persona)

Una sola tabla genérica reutilizada por los módulos que necesitan guardar algo — cada fila es "esta persona, en este módulo, guardó este dato bajo esta clave":

```sql
user_id uuid not null references auth.users(id)
module text not null
key text not null
value jsonb not null
updated_at timestamptz not null default now()
primary key (user_id, module, key)
```

Es **100% privado por persona** — nadie más, ni siquiera un administrador, puede leer los datos de otra persona en esta tabla (RLS: `auth.uid() = user_id`, sin excepción). Módulos que la usan y sus claves:

| Módulo (`module`) | Claves (`key`) |
|---|---|
| `limpieza` | `emp`, `hist`, `maq`, `sched`, `taskSel`, `tasks`, `lastResult` |
| `wow-tablero` | `africa_wow_employees`, `africa_wow_selected` |
| `folders` | `africa_labels_folders`/`az`/`lockers`, `africa_labels_last_format`, `africa_combo_folders`/`az`/`lockers` |
| `habladores` | `africa_habladores` |
| `wow-calificacion` | `africa_wow_scores` |
| `diaadia` | `tasks` |

Inventario es el único módulo sin datos persistentes — su flujo es solo subir un PDF y descargar el Excel resultante, no hay nada que guardar entre sesiones. **Líder de Seguridad y Agenda de Fiestas no usan esta tabla** — Líder ver sección 5; Agenda ver sección 6, cada uno tiene sus propias tablas dedicadas.

## 5. Supabase — `lider_shared_data` y `lider_abordajes` (datos compartidos de Líder de Seguridad)

A diferencia de todos los demás módulos, Líder de Seguridad **no** guarda en `module_data` — sus datos son compartidos entre todo el equipo con acceso al módulo (administrador, supervisor, líder de parque, líder de seguridad), no privados por persona.

**`lider_shared_data`** (clave/valor, igual de genérica que `module_data` pero sin `user_id`):

```sql
key text primary key
value jsonb not null
updated_by uuid references auth.users(id)
updated_at timestamptz not null default now()
```

Claves usadas: `checklist-YYYY-MM` (una por mes), `archivos-formatos`, `recursos-formularios`, `recursos-sst`, `escalera-preguntas`, `temas-sst`. Si un líder edita cualquiera de estos, todos los demás lo ven al recargar — es la fuente de verdad para el resumen del Dashboard también (`assets/app.js`, `renderDashboardSummary`, que lee la clave `checklist-YYYY-MM` de esta tabla, no de `module_data`).

**`lider_abordajes`** (una fila por abordaje de EPP registrado, no clave/valor):

```sql
id bigint generated always as identity primary key
fecha date not null
trabajador_nombre text not null
color text not null           -- 'verde' | 'amarillo' | 'rojo'
nota text
registrado_por_id uuid references auth.users(id)
registrado_por_nombre text
created_at timestamptz not null default now()
```

También compartida y sin filtro por usuario — cualquier líder ve la bitácora completa, el resumen por trabajador y el reporte semanal con los abordajes de todo el equipo.

## 6. Supabase — tablas de Agenda de Fiestas (`park_*`)

Agenda de Fiestas tampoco usa `module_data` — tiene su propio esquema relacional, con relaciones reales entre tablas (a diferencia del resto de módulos, que solo guardan blobs jsonb sueltos):

```sql
create table park_rooms (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text not null default '',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table party_types (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text not null default '',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table park_events (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  party_type_id uuid references party_types(id),
  party_type_nombre text,
  cliente_nombre text not null,
  invitados integer not null default 0,
  telefono text not null default '',
  estado text not null default 'reservado' check (estado in ('reservado','finalizado','cancelado')),
  observaciones text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table park_event_rooms (        -- un evento puede usar varias salas
  event_id uuid references park_events(id),
  room_id uuid references park_rooms(id),
  room_nombre text,
  primary key (event_id, room_id)
);

create table park_event_history (      -- bitácora de cambios por evento
  id bigint generated always as identity primary key,
  event_id uuid not null references park_events(id),
  actor text not null,
  actor_id uuid references auth.users(id),
  action text not null,
  detalle jsonb,
  created_at timestamptz not null default now()
);
```

`park_rooms` y `party_types` son catálogos administrables (salas del parque y tipos de fiesta); `park_events` es la reserva en sí; `park_event_rooms` resuelve la relación muchos-a-muchos evento↔sala; `park_event_history` guarda quién hizo qué cambio a cada evento. Todo compartido entre todo el equipo con acceso al módulo, no privado por persona.

## 7. Navegador — `localStorage` (lo poco que queda ahí)

Solo preferencias de interfaz, nunca datos de negocio:

- `africa_tools_theme` — tema del shell (claro/oscuro)
- `africa_labels_theme`, `africa_habladores_theme`, `africa_wow_theme`, `africa_wow_scores_theme`, `af_theme`, `africa-theme` — cada módulo guarda su propio tema por separado (así puede recordarlo incluso si se abre suelto, fuera del shell)
- `africa_tools_login_attempts` (en `sessionStorage`, no `localStorage`) — límite de intentos de login, se borra solo al cerrar la pestaña

## 8. Navegador — IndexedDB (`africa-tools-offline`), modo sin conexión

Usada por `assets/offline-storage.js`, la capa compartida que permite seguir trabajando sin señal en Limpieza, Wow Tablero, Folders, Habladores, Wow Calificación y Día a Día. **Ni Líder de Seguridad ni Agenda de Fiestas la usan** — ninguno de los dos carga `offline-storage.js`, ambos hablan directo con sus tablas de Supabase; sin conexión, cada guardado o carga simplemente falla con un aviso en pantalla, sin cola de reintento.

- **Store `cache`**: última copia conocida de cada dato (`{id: "modulo::clave", module, key, value, updatedAt}`) — lo que se muestra en pantalla cuando no hay conexión.
- **Store `queue`**: cambios guardados localmente que todavía no se subieron a Supabase (`{id, module, key, value, updatedAt}`) — se reintenta solo al reconectar y cada 30 segundos.

El indicador de conexión del shell muestra cuántos cambios quedan pendientes de subir cuando esta cola no está vacía.

## Respaldo y restauración

Ya **no existe** el botón de "Respaldo de datos" (exportar/restaurar un `.json`) que tenía el panel de Administración — tenía sentido cuando todo vivía en `localStorage` de un solo dispositivo, pero ahora los datos ya están en Supabase, con toda la durabilidad y las copias de seguridad que da esa plataforma. Sacarlo del panel es parte de la limpieza de esta ronda.

## Netlify Function: `manage-user.js`

La única pieza que corre en un servidor, no en el navegador. Usa la llave `service_role` de Supabase (variable de entorno en Netlify, nunca en el código) para crear y eliminar cuentas — acciones que requieren privilegios que el navegador nunca debe tener. Verifica primero, contra el propio servidor, que quien está llamando sea un administrador activo.
