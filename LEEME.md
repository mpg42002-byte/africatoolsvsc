# Africa Tools — Guía rápida

## Cómo probarlo ahora mismo
1. Descomprime la carpeta `africa-tools`.
2. Como es una PWA con Service Worker, **no la abras con doble clic** (`file://`) — los navegadores bloquean Service Workers ahí. Sirve la carpeta con cualquier servidor local, por ejemplo:
   - VSCode: extensión "Live Server", clic derecho sobre `index.html` → "Open with Live Server".
   - O en terminal, dentro de la carpeta: `python3 -m http.server 8080` y abre `http://localhost:8080`.
3. Ingresa con las credenciales de administrador (usuario: `admin`, contraseña: la configurada inicialmente).
4. Ve a **Administración → Usuarios** y crea tus usuarios reales (supervisor, líder de seguridad, etc.), y cambia la contraseña del admin.

## Desplegar en Netlify
1. Sube la carpeta `africa-tools` completa a un repositorio de GitHub, o arrástrala directo a Netlify (Netlify Drop).
2. No requiere build ni configuración: es HTML/CSS/JS puro.
3. Una vez desplegado, Netlify sirve por HTTPS automáticamente — necesario para que el Service Worker (PWA) funcione.

## El logo
Ya tiene el ícono de león diseñado a medida (estilo 3D/glossy, colores de tu marca) — reemplazó el placeholder de Líder África en el favicon, la pantalla de login, el menú lateral y todos los tamaños de ícono PWA. Si más adelante quieres ajustarlo o tienes un logo oficial distinto, reemplaza estos 4 archivos manteniendo los mismos nombres y tamaños:
- `assets/icons/icon.svg`
- `assets/icons/icon-192.png`
- `assets/icons/icon-512.png`
- `assets/icons/icon-maskable-512.png` (con más espacio en blanco alrededor del logo — Android recorta los bordes de este)

Si quieres que te genere estos 4 archivos automáticamente a partir de otro logo, solo súbelo y lo hago.

## Roles actuales
- **Administrador**: acceso a todos los módulos + Administración de usuarios.
- **Supervisor**: acceso a todos los módulos.
- **Líder de Seguridad**: acceso solo a "Líder de Seguridad".

## Agregar un rol nuevo (ej. Entrenador, Anfitrión, Técnico)
Edita únicamente `assets/permissions.js`:
```js
entrenador: { label: 'Entrenador', modules: ['limpieza'], isAdmin: false },
```
No hay que tocar el shell ni ningún módulo.

## Agregar un módulo nuevo en el futuro
1. Copia el nuevo archivo `.html` a `/modules/nombre-modulo/archivo.html` (sin modificarlo).
2. Agrega su entrada en `MODULES` (`assets/permissions.js`) y en `MODULE_SOURCES` (`assets/shell.js`).
3. Asígnalo a los roles que corresponda en `ROLES`.
4. (Opcional) Si quieres que sincronice el tema claro/oscuro con el shell, agrégale el mismo tipo de listener `postMessage` que ya tienen los 7 módulos actuales (ver el final de cualquiera de los archivos en `/modules`).

## Migrar la autenticación a un backend real más adelante
Hecho: la autenticación y los datos por-usuario ya viven en Supabase
(Postgres + Auth real), no en `localStorage`. Ver `ESTRUCTURA-DATOS.md`
para el detalle completo del modelo de datos vigente.


## Historial de cambios
Ver `CHANGELOG.md` para el historial completo de rondas de trabajo, correcciones y el rediseño UI/UX. Para el modelo de datos vigente, ver `ESTRUCTURA-DATOS.md`.