# Africa Tools — Changelog

Fuente única de historial del proyecto. Reemplaza los changelogs sueltos de
paquetes de trabajo ya cerrados (Paquete A, Paquete B, Merge V9, análisis de
CSS, propuesta de mejoras, checklists de deploy previos), consolidados aquí.
Para el estado actual del modelo de datos, ver `ESTRUCTURA-DATOS.md` — ese
es el documento de referencia vigente, no este changelog.

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
