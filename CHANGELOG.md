# Africa Tools — Changelog

Fuente única de historial del proyecto. Reemplaza los changelogs sueltos de
paquetes de trabajo ya cerrados (Paquete A, Paquete B, Merge V9, análisis de
CSS, propuesta de mejoras, checklists de deploy previos), consolidados aquí.
Para el estado actual del modelo de datos, ver `ESTRUCTURA-DATOS.md` — ese
es el documento de referencia vigente, no este changelog.

## 2026-09-06 — Limpieza, Folders, Habladores, Wow Tablero y Wow Calificación pasan a compartidos

- Se descubrió que estos 5 módulos guardaban en `module_data` (privado por
  persona, sin que nadie lo hubiera notado) — cada quien tenía su propia
  copia aislada del horario/roster/etiquetas, en vez de una compartida
  por el equipo, a diferencia de Agenda, Líder y Bitácora.
- Migrados a la tabla nueva `module_data_shared` (mismo patrón, sin
  `user_id`) — ahora todo el que tenga acceso al módulo lee y escribe lo
  mismo. Requiere correr la migración SQL aparte.
- `assets/offline-storage.js`: `get()`/`set()` ahora aceptan un cuarto
  parámetro `shared` (por defecto `false`, sin cambios de comportamiento
  para quien no lo use) — la cola de sincronización sin conexión sigue
  funcionando igual para los 5, solo cambió a qué tabla apunta.
- **Día a Día no se tocó** — su lista de tareas sigue privada por persona,
  como debe ser.
- **Importante**: la migración no traslada los datos que ya existan en
  `module_data` de estos 5 módulos — cada uno arranca "vacío" compartido
  la primera vez que alguien lo abra después de correr la migración.

## 2026-09-06 — Segunda capa de protección por módulo, y arreglo de offline

- Cada módulo ahora revisa el rol real del usuario contra `permissions.js`
  al abrirse (`gateModuleAccess()` en `assets/ui-helpers.js`), y bloquea
  todo el contenido con una pantalla de "🔒 No tienes acceso" si no
  corresponde. Antes, cualquier módulo confiaba en que el shell no lo
  mostrara en el menú — quien llegara directo a la URL igual veía y usaba
  el contenido completo. Aplicado a los 9 módulos con acceso restringido
  (todos menos Día a Día, que ya es de acceso libre para todos los roles).
- Efecto secundario que este mismo cambio introdujo y ya quedó resuelto:
  esa revisión de rol necesita internet, así que sin conexión bloqueaba
  módulos que antes sí funcionaban offline (Limpieza, Folders, Habladores,
  Wow Tablero, Wow Calificación, vía su cola de sincronización). Ahora,
  si hay sesión pero no se puede confirmar el rol por falta de red, se usa
  el último permiso confirmado con éxito (guardado en `localStorage`,
  `africa_tools_last_profile`) — solo para la misma persona, y se borra
  al cerrar sesión. Si nunca hubo sesión, sigue bloqueando sin excepción.
- Service worker: agregados `assets/ui-helpers.js` y
  `modules/bitacora/Bitacora.html` a la lista de precaché (se habían
  quedado fuera al crearlos) — versión de caché subida a v19.

## 2026-09-06 — Nuevo módulo: Bitácora

- Módulo nuevo para reemplazar el cuaderno físico de novedades entre
  líderes de parque: vista tipo cuaderno, navegable día por día (flechas +
  selector de fecha), con buscador por texto o autor en todas las fechas.
- Cada nota queda con quién la escribió y a qué hora — varias notas sueltas
  por día, no un solo bloque de texto.
- **Acceso exclusivo**: solo Líder de Parque y Administrador — a diferencia
  del resto de módulos compartidos de la app, ni Supervisor lo ve. Marcado
  como `restricted` en `assets/permissions.js` (así `'ALL'` ya no lo incluye
  automáticamente) y reforzado con una pantalla de "sin acceso" dentro del
  propio módulo, además de la restricción de lectura en la base de datos.
- Una nota se puede editar o borrar **solo el mismo día** que se escribió;
  en cuanto cambia el día queda fija como registro histórico — ni siquiera
  quien la escribió puede tocarla después. Regla aplicada tanto en la app
  como en la política de la base de datos (RLS), no solo de cara al usuario.
- Nueva tabla `bitacora_entries` (migración SQL aparte) — no usa
  `module_data` ni `OfflineStorage`, sigue el mismo patrón de tabla propia
  que ya usan Líder de Seguridad y Agenda de Fiestas.

## 2026-09-05 — Líder de Seguridad, Agenda de Fiestas, Día a Día, y limpieza general

**Líder de Seguridad**
- Corregido el bug por el que un abordaje de EPP registrado de noche (desde
  las 7pm hora Colombia) quedaba guardado con la fecha del día siguiente
  (`valueAsDate` interpretaba en UTC, no en hora local).
- Corregido el resumen del Dashboard: leía el checklist mensual de la tabla
  equivocada (`module_data` en vez de `lider_shared_data`), por lo que
  siempre mostraba "sin iniciar" sin importar el avance real.
- "Nombre del trabajador" en el registro de abordajes pasó de texto libre a
  una lista de equipo administrable (agregar/renombrar/eliminar, con
  orden alfabético) — no afecta los abordajes ya registrados, que guardan
  el nombre tal cual estaba en el momento.
- Reporte Semanal: corregido que no se pudiera desplazar en celular (el
  modal reutilizado no tenía scroll propio ni límite de alto).
- El indicador "Compartido con todo el equipo / Sin conexión" ahora se
  actualiza en vivo con cada guardado o lectura, no solo una vez 600ms
  después de cargar la página.
- Aviso agregado cuando falla una lectura (antes solo quedaba en consola,
  sin que el usuario supiera que lo que ve puede estar desactualizado).

**Agenda de Fiestas**
- Buscador por cliente, teléfono o tipo de fiesta, en todas las fechas.
- Orden manual (flechas ↑/↓) para Salones y Tipos de fiesta, en vez de
  alfabético fijo — requiere la columna `orden` (migración SQL aparte).
- Corregido: tocar un día en la vista Mes no actualizaba el input de fecha.
- Formulario de evento reordenado: "Tipo de fiesta" ahora va arriba de
  Hora inicio/fin.
- Nueva vista **Agenda** (estilo libreta física, dos páginas por
  salón × mañana/tarde), con vista compacta y sin scroll horizontal en
  celular. Eventos que comparten 2+ salones contiguos se combinan en un
  solo contenedor en vez de duplicarse por columna.
- Nuevo modal "Ver detalle" del evento (lo que ve cualquiera con acceso al
  módulo) antes de poder editar — antes, en la vista Semana y en Agenda,
  el clic saltaba directo a edición (o a historial, según el rol).

**Día a Día**
- Nueva periodicidad "Una vez" para tareas puntuales de una sola fecha,
  además de las periódicas (diaria, semanal, mensual, etc.).

**General / deuda técnica**
- `escapeHtml`, `escapeAttr` y `afConfirm` (el modal de confirmación
  propio) centralizados en `assets/ui-helpers.js`, compartido por los 9
  módulos — antes cada uno tenía su propia copia pegada.
- `confirm()` nativo del navegador reemplazado por el modal propio en los
  4 módulos que aún lo usaban: Limpieza, Inventario, Habladores Winner y
  Calificación Wow Points.
- Corregido un hueco de XSS en Limpieza (único módulo sin `escapeHtml`):
  nombres de empleados/tareas/máquinas se insertaban sin escapar.
- Últimos `alert()` nativos reemplazados: en Habladores Winner (mensaje
  junto al botón de subir PDF) y en Líder (mensaje junto al semáforo de
  colores del registro de abordajes).
- Corregido desborde de `<input type="date"/"month">` en iOS (Líder,
  Agenda, Día a Día) por falta de reset de `-webkit-appearance`.
- Corregida la vista previa de impresión en Folders, Habladores Winner y
  Calificación Wow Points: contenido fuera de pantalla quedaba invisible
  (`overflow-x:hidden`) en vez de con scroll, y el zoom inicial fijo no se
  ajustaba a pantallas angostas.
- Wow Tablero: el recuadro de recorte de foto (ancho fijo) se salía del
  modal en pantallas muy angostas (~320px) — ahora es responsive.
- `ESTRUCTURA-DATOS.md` y `CHECKLIST-REGRESION.md` actualizados para
  reflejar todo lo anterior (tablas `lider_shared_data`, `lider_abordajes`,
  `park_*` de Agenda, soporte offline real por módulo, roles vigentes).

## 2026-08-21 — Deuda técnica y limpieza (Sección 0/2 de la orden en curso)
- Persistencia unificada en `OfflineStorage` para Folders, Habladores y
  Calificación Wow (con cola offline).
- Eliminado código duplicado de `getTheme`/`setTheme` en `shell.js`.
- Checkbox "Mantener sesión" eliminado de la UI y del código.
- `ESTRUCTURA-DATOS.md` actualizado para reflejar la implementación real en
  Supabase.
- Reglas de caché de `netlify.toml` corregidas: eliminada la regla genérica
  `/assets/*` (competía con las reglas específicas de `*.js`/`*.css`/`*.png`/
  `*.svg`, que ya cubrían todo lo que hay en esa carpeta).
- Documentación obsoleta consolidada en este changelog; ver más abajo.

## 2026-08-21 — Dashboard, usuarios y rol de Líder de Parque
- Tarjetas de Limpieza y WOW Points eliminadas del Dashboard.
- Centrado y paginación básica en la tabla de usuarios de Administración.
- Rol "Líder de Parque" agregado, con acceso a todos los módulos operativos
  excepto Administración.
- Corrección de overflow de texto en el resumen del rol Líder de Seguridad.
- Semáforo EPP agrupado y presentado por mes, con total de abordajes por
  persona.
- Banco de preguntas nativo de la Escalera de seguridad (agregar, ver,
  sortear, eliminar), con persistencia.
- Sección "Respaldo de datos" eliminada del módulo Usuarios — dejó de tener
  sentido al migrar la persistencia a Supabase.

## Fase 4 — Modo offline
Cola de sincronización offline (`OfflineStorage`) para trabajar sin
conexión y sincronizar al reconectar.

## Fases 1–3 — Migración a Supabase
Migración de la autenticación y los datos por-usuario de los módulos
(Limpieza, Etiquetas/Folders, Líder) desde `localStorage` a Supabase
(Postgres + Auth real), con datos privados por usuario. Se empaquetó la
fuente Century Gothic Bold para impresión en Habladores.

## Rediseño UI/UX (previo a la migración a Supabase)
Auditoría completa del shell y los 7 módulos, implementada en rondas:
- Shell: splash screens iOS, indicador de sin conexión, banner de
  instalación propio, modo "riel" de sidebar en pantallas anchas, spinner
  de marca al cargar un módulo, íconos reales en el dashboard.
- `confirm()` nativo del navegador reemplazado por modales con identidad
  visual propia en los módulos que lo usaban.
- Accesibilidad: labels, `aria-label`/`aria-live` y roles de teclado
  agregados en los módulos que tenían huecos.
- Corrección del bug de impresión en Limpieza que se rompía bajo Live
  Server (VS Code) por un falso positivo de `</body></html>` dentro de un
  string de JS — se escapó a `<\/body><\/html>`.
- Corrección de un `@import` de fuente mal ubicado en Habladores Winner.

**Limitaciones conocidas heredadas de esta etapa:** los splash de iOS solo
existen en orientación portrait; África Inventario y Habladores Winner
dependen de `pdf.js` cargado desde CDN público (sin funcionar si ese CDN
está bloqueado en la red del usuario).
