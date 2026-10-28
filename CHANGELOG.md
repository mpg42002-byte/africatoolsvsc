# Africa Tools — Changelog

Fuente única de historial del proyecto. Reemplaza los changelogs sueltos de
paquetes de trabajo ya cerrados (Paquete A, Paquete B, Merge V9, análisis de
CSS, propuesta de mejoras, checklists de deploy previos), consolidados aquí.
Para el estado actual del modelo de datos, ver `ESTRUCTURA-DATOS.md` — ese
es el documento de referencia vigente, no este changelog.

## 2026-10-27 — Responsive, parte 3: textos de 12 px, celular horizontal e impresión intacta (Fase 3c de QA)

- **Ningún texto visible de la interfaz mide menos de 12 px** (antes había entre 9 y 11,5 px en etiquetas, chips, insignias, encabezados de tablas y tarjetas del libro de Agenda). Se subieron 72 declaraciones de CSS y 4 etiquetas escritas en línea en Líder; en pantallas muy angostas esto puede hacer que una etiqueta salte de línea, no que se corte.
- **Los formatos de impresión y PDF NO cambian**: no se tocó ningún bloque `@media print` ni ningún tamaño de letra dentro de las plantillas de los PDF (tarjetas de Limpieza, hojas de Habladores/Folders/Wow). Lo vigila `tests/responsive/print-intacto.test.js`, que compara con el original.
- **Celular en horizontal (844×390 y 667×375)**: se comprobó que los 10 módulos dentro del shell no desbordan y dejan al menos el 55 % de la altura para el contenido; no hizo falta cambiar nada.
- Pruebas: `targets-text.test.js` (textos), `print-intacto.test.js` (11), `horizontal.test.js` (22).

## 2026-10-27 — Responsive, parte 2: botones y campos de 44 px (Fase 3b de QA)

- **Un solo valor para toda la suite**: `--tap-min: 44px` en `assets/design-tokens.css`. Todo control visible (botones, pestañas, selectores, campos de texto/fecha/mes/hora, deslizadores, `summary`) mide al menos 44 px de alto, y los botones también de ancho, así un ✏️ o una letra suelta ya no es más angosto que un dedo. El tamaño del texto o del icono NO cambia: solo crece la zona que se puede tocar.
- Aplica en **todos los tamaños de pantalla** (decisión del equipo: que escritorio, tablet y celular se vean iguales). Si más adelante se quiere un escritorio más compacto, basta con redefinir `--tap-min` dentro de `@media (pointer: fine)`.
- Casillas y radios: cuenta la etiqueta completa (44 px). En la tabla de máquinas de Limpieza la casilla "Doble" ahora va dentro de una etiqueta con nombre accesible.
- Botones con `all:unset` (Líder, Bitácora) perdían la regla global (queda `display:inline`, donde `min-height` no aplica): se corrigieron uno por uno. `shell.css` tenía `min-height: 38px` en `.btn-secondary/.btn-danger`: ahora usa el token.
- Efecto en pantalla: las filas del horario de Limpieza y las tablas de Administración son más altas; la barra de periodo de Día a Día se ajusta para no desbordar a 320 px.
- Pruebas: `tests/responsive/targets-text.test.js` (por módulo, todas las pestañas, 390 px; shell en 390 y 1024 px; menú abierto). **Pendiente** (F3c): textos de 12 px, horizontal en teléfono, impresión.

## 2026-10-27 — Responsive, parte 1: zoom, desbordes y barras de pestañas (Fase 3a de QA)

- **Zoom permitido** (WCAG 1.4.4): se quitó `maximum-scale=1.0, user-scalable=no` de `index.html` y de los 10 módulos, y el bloqueo de pellizco (`gesturestart`/`touchmove` con `preventDefault`) del shell. Se conservan `touch-action: manipulation` (sin zoom por doble toque) y `font-size: 16px` en los campos (iOS no amplía al enfocar).
- **Menú lateral**: cerrado ya no deja una franja de sombra en el borde izquierdo del celular (la sombra solo existe mientras está abierto).
- **Administración a 320 px**: el botón "+ Nuevo usuario" ya no se corta; baja debajo del título cuando no cabe.
- **Líder de Seguridad**: las rejillas ya no exigen 320 px mínimos (`minmax(min(320px, 100%), 1fr)`); el `<main>` puede encogerse (`min-width: 0`) y la tabla del registro semanal se desplaza dentro de su contenedor hasta 1020 px (antes, en tablet a 768 px la pestaña Semáforo EPP ensanchaba toda la pantalla).
- **Limpieza**: la primera columna (empleado) del horario queda fija al desplazar en todos los anchos; la pestaña activa se centra al cambiar (antes "Máquinas"/"Tareas" podían quedar fuera de vista) y el desvanecido de la barra es solo a la derecha.
- Pruebas: `tests/responsive/overflow-zoom.test.js` (16) y `tests/responsive/no-overflow-matrix.test.js` (90: cada módulo y pestaña en 320/360/390/768/1024 px, sueltos y dentro del shell). **Pendiente** (F3b/F3c): objetivos táctiles de 44 px, textos de 12 px, horizontal en teléfono e impresión.

## 2026-10-26 — Seguridad: contraseña de administración expuesta (Fase 2 de QA, hallazgo urgente)

- `INSTRUCCIONES-SERVIDOR.md` traía la contraseña por defecto del administrador en texto plano y Netlify publicaba ese archivo (y el resto de la documentación, `sql/`, `tests/` y `netlify/`) porque no hay carpeta de publicación definida. Se quitó la contraseña del documento y `netlify.toml` ahora responde 404 a esos archivos internos. **La contraseña ya expuesta debe cambiarse en Supabase**: seguirá en el historial de git aunque se borre del archivo.
- Pendiente (F5/F6): definir una carpeta de publicación (`publish`) para que Netlify solo sirva la app, y exigir contraseñas más largas (hoy el mínimo es 6 caracteres).

## 2026-10-25 — Choques de edición en datos compartidos (Fase 2b de QA · opción A)

- **Problema**: si dos personas editaban a la vez el mismo dato compartido (empleados de Limpieza, roster del Tablero Wow, etc.), la última en guardar reemplazaba lo de la otra sin avisar.
- **Ahora**: cada guardado dice sobre qué versión del servidor se editó (`save_shared`, nuevo SQL). Si alguien más guardó antes, no se pisa nada y aparece una ventana: **Combinar** (junta ambos cambios; lo que alguno borró no reaparece) · **Conservar lo mío** · **Usar lo del servidor**. Si no se decide, la pregunta vuelve al reabrir el módulo.
- Cubre Limpieza, Wow Tablero, Wow Calificación, Folders y Habladores (los 5 módulos con datos compartidos vía `offline-storage.js`). Líder de Seguridad, Agenda y Bitácora usan tablas propias y NO cambian.
- `offline-storage.js`: la hora de versión viene del servidor (ya no del reloj del celular); la sincronización corre de a una (antes `online`, el reloj de 30 s y `get()` podían subir lo mismo a la vez); si la función SQL no existe todavía, guarda como antes.
- **Antes de subir la app** correr `sql/2026-10-25-F2b-save-shared.sql` en Supabase (solo crea una función, no toca datos). Pendientes viejos de versiones anteriores sin versión conocida pueden mostrar la ventana una vez.
- Pruebas: `tests/data/conflicto.test.js` (+ `tests/sql/save-shared.test.js`, la función SQL en un Postgres de prueba).

## 2026-10-25 — Sesión, sin conexión y Bitácora (Fase 2 de QA)

- **F-01 Cierre por inactividad**: el shell solo veía clics/teclas de SU documento, no los del módulo abierto (iframe), así que quien trabajaba 30 min dentro de un módulo era expulsado. Ahora `ui-helpers.js` avisa al shell cada 10 s de actividad (solo mensajes del mismo origen y del iframe del módulo abierto). Aviso 2 min antes del cierre con botón "Seguir conectado"; si el módulo avisa que hay cambios sin guardar (`AfricaActivity.setDirty(true)`), no se cierra la sesión sin avisar (ningún módulo lo usa todavía).
- **F-02 Cola sin conexión** (`offline-storage.js`): al abrir un módulo con red, `get()` primero sube lo pendiente propio y devuelve ese valor (antes mostraba el valor viejo del servidor y, a los 30 s, la cola reenviaba el cambio viejo encima de uno nuevo). La cola se coalesce por dato (solo el último valor) y un guardado directo exitoso borra lo pendiente anterior. **Pendiente (decisión D-2):** control de concurrencia entre personas distintas.
- **F-04 Inventario**: si pdf.js/ExcelJS no cargan del CDN, el módulo ya no queda en blanco; avisa con un mensaje claro al usar el PDF o generar el Excel. (Vendorizar las librerías queda para la Fase 5.)
- **F-06 Bitácora**: "hoy" es siempre hora de Bogotá y la fecha de la nota la pone el servidor (la app ya no envía `fecha`). **Requiere correr antes `sql/2026-10-25-bitacora-fecha-bogota.sql` en Supabase** (sin aplicar ni probar contra la base real: el paso de las políticas de editar/eliminar necesita los nombres reales).
- Pruebas: `tests/data/idle.test.js`, `session-and-queue.test.js`, `bitacora-fecha.test.js`.

## 2026-10-25 — Seguridad: XSS y fuga de datos entre cuentas (Fase 1 de QA)

- **S-01 Limpieza**: el botón "Quitar" de un empleado ponía su nombre dentro de un `onclick` inline mal escapado; un nombre con `\');...` ejecutaba código. Ahora usa un listener con el índice del empleado, sin nombres dentro de código.
- **S-02 Limpieza**: los `id` de la tabla de horarios se armaban con el nombre del empleado (un nombre con comillas podía inyectar atributos al cargar el módulo). Ahora usan el índice del empleado. Los datos guardados no cambian.
- **S-03 Wow Tablero**: `emp.photo` iba sin escapar en `src="..."`. Ahora solo se acepta un data-URL de imagen (png/jpeg/webp/gif en base64); cualquier otro valor se reemplaza por un píxel transparente. Las fotos legítimas (siempre `data:image/jpeg;base64,...`) no cambian.
- **S-04 Shell**: `showToast()` insertaba el mensaje con `innerHTML` (incluido el error que devuelve el servidor al crear un usuario) y el avatar insertaba las iniciales sin escapar. Ahora ambos usan texto plano / escape.
- **S-05 Sin conexión** (`assets/offline-storage.js`): la caché local y la cola de pendientes no tenían dueño, así que en un dispositivo compartido B veía los datos de A y, al volver la señal, lo pendiente de A se subía con la identidad de B. Ahora la caché y la cola son por persona (`uid`), solo se sube lo propio y el contador solo cuenta lo propio. La BD IndexedDB pasa a la versión 2: los pendientes viejos sin dueño NO se suben, se guardan en un respaldo (`OfflineStorage.exportLegacyBackup()`) y la caché vieja se descarta.
- Pruebas automáticas en `tests/` (Playwright + Supabase simulado): `security/xss.test.js` y `security/offline-leak.test.js`.

## 2026-09-10 — Limpieza: rediseño del formato de impresión (letra muy pequeña)

- La tabla de "Asignación de máquinas" se imprimía en 2 columnas fijas con
  letra de 7.5-8px — con equipos grandes quedaba casi ilegible en papel.
  Además el código que ajusta la imagen a la hoja tenía dos bugs reales:
  1) si el contenido quedaba más alto que una página, en vez de achicarlo lo
  recortaba (`Math.min(imgH, pageH)` sin escalar el ancho a la par); 2) el
  `@page{margin:8mm}` del CSS no tenía ningún efecto real — ese CSS solo
  aplica si el navegador imprime de verdad (`window.print()`), pero este
  flujo convierte todo a una IMAGEN (`html2canvas`) y la pega en el PDF
  (`pdf.addImage`) sin pasar por el motor de impresión en ningún momento, así
  que el contenido quedaba pegado al borde físico de la hoja.
- Rediseño visual completo de `printResult()` (segunda versión — la primera,
  una tabla de hoja de cálculo simplemente más grande, no convenció): ahora
  son tarjetas redondeadas por empleado (nombre, y sus máquinas/tareas con un
  punto de color por dificultad y una casilla para marcar), agrupadas en
  columnas dinámicas — con pocas personas, tarjetas anchas; con muchas, más
  columnas, repartidas por CANTIDAD DE FILAS real de cada quien (no solo
  cantidad de personas) para que ninguna columna quede mucho más larga que
  las demás. Arriba, un "ribbon" compacto de un cuadro por día con las
  parejas (en vez de una tabla larga de 5 días), que deja mucho más espacio
  libre para las tarjetas.
- Se corrigió el ajuste a la hoja en `generatePdfFromHtml()`: ahora se
  reserva un margen físico real de 10mm restándolo del área disponible
  ANTES de calcular el escalado (no dependiendo del CSS `@page`, que no
  aplica a este flujo), y luego se ajusta todo el contenido dentro de esa
  área (ancho y alto a la vez, tipo "object-fit:contain", centrado) — nunca
  se corta ni se deforma. Probado con un equipo de ejemplo de 12 personas:
  usa ~57% del alto disponible dentro del margen.
- Todas las tablas internas llevan `table-layout:fixed` + anchos explícitos
  por columna — sin esto, con letra más grande el contenido de una columna
  se monta visualmente sobre la columna vecina en vez de ajustarse a su
  ancho asignado (bug real que apareció durante las pruebas de este cambio).
- Solo cambia `modules/limpieza/africaLimpieza.html`. **Pendiente de probar
  con el equipo real completo** (ver `CHECKLIST-REGRESION.md`, sección
  Limpieza) — la vista previa se armó con datos de ejemplo generados en el
  sandbox, no con datos reales de Supabase.

## 2026-09-10 — Wow Tablero: fotos HEIC seguían fallando (bug distinto al del 6 de sept)

- El arreglo de `worker-src 'self' blob:'` del 6 de septiembre resolvió que el
  Web Worker de `heic2any` pudiera crearse, pero quedó otro bloqueo: dentro de
  ese worker, `heic2any` llama a `new Function(...)` para instanciar su WASM —
  eso es un `eval` en la práctica, y el CSP no tiene `'unsafe-eval'` en
  `script-src`. El navegador lo bloqueaba en silencio y la conversión caía
  siempre en el timeout de 20s ("No se pudo convertir esta foto").
- En vez de aflojar el CSP (`'unsafe-eval'` habría aplicado a todo el sitio,
  no solo a este módulo), se reemplazó `heic2any` por `heic-to` en su build
  `csp` (`dist/csp/heic-to.js`, sin `eval`/`new Function` — confirmado
  revisando el bundle), cargado como módulo ES con `import()` dinámico en vez
  de `<script src="...">` clásico. No requirió cambios en `netlify.toml`: el
  dominio `cdn.jsdelivr.net` ya estaba permitido en `script-src`, y ese mismo
  directive cubre módulos cargados con `import()`.
- Solo afecta `modules/wow-tablero/tablero-wow-points.html` — es el único
  módulo que usaba `heic2any`.
- **Pendiente de probar con una foto HEIC real de iPhone** antes de dar esto
  por cerrado (ver `CHECKLIST-REGRESION.md`, sección Tablero Wow Points).

## 2026-09-06 — Correcciones de pruebas: fotos HEIC, nombres largos en A-Z/Lockers, paginación

- **Wow Tablero — fotos HEIC**: el primer intento de arreglo se quedaba
  pegado en "Convirtiendo foto…" para siempre. Causa real: `heic2any`
  convierte usando un *Web Worker* interno creado desde una URL `blob:`,
  y el `Content-Security-Policy` del sitio no declaraba `worker-src` — el
  navegador caía a `default-src 'self'`, que no permite `blob:`, y
  bloqueaba el worker en silencio (sin ningún error capturable). Se
  agregó `worker-src 'self' blob:` al CSP en `netlify.toml` — **esto
  requiere un nuevo deploy para tomar efecto**, no basta con subir el
  módulo solo. De paso se corrigió también el nombre del archivo de la
  librería (`heic2any.js`, no `heic2any.min.js`, que no existe) y se
  agregó un límite de tiempo de seguridad (15-20s) para que nunca vuelva
  a quedar pegado en silencio pase lo que pase.
- **Folders — A-Z y Lockers, nombres largos**: el primer intento seguía
  cortando palabras. Causa real: la función medía el ancho de la palabra
  en su capitalización original (ej. "Contabilidad"), pero el CSS la
  muestra en mayúsculas (`text-transform:uppercase` → "CONTABILIDAD"),
  que es más ancha — medía una palabra más angosta de la que en realidad
  se imprime. Corregido con `.toUpperCase()` antes de medir, reutilizando
  el helper `measureTextWidthPx` que ya existía (en vez de un canvas
  propio). **Lockers tenía el mismo hueco sin que nadie lo hubiera
  reportado** — se corrigió ahí también de una vez, con la fuente real
  del formato (Raspberry Sherbet) para que la medición sea exacta.
- **Líder de Seguridad**: la bitácora de abordajes cargaba y mostraba
  *todo* el historial de una sola vez, creciendo indefinidamente. Ahora
  pagina de a 20 registros, con controles de anterior/siguiente; el
  filtro por trabajador también respeta la paginación. Esta sí quedó
  bien desde el primer intento.

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
