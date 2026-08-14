# Africa Tools — Guía rápida

## Cómo probarlo ahora mismo
1. Descomprime la carpeta `africa-tools`.
2. Como es una PWA con Service Worker, **no la abras con doble clic** (`file://`) — los navegadores bloquean Service Workers ahí. Sirve la carpeta con cualquier servidor local, por ejemplo:
   - VSCode: extensión "Live Server", clic derecho sobre `index.html` → "Open with Live Server".
   - O en terminal, dentro de la carpeta: `python3 -m http.server 8080` y abre `http://localhost:8080`.
3. Ingresa con: **usuario** `admin` / **contraseña** `africa2026`.
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
- **Líder de Seguridad**: acceso solo a "Líder África".

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
Toda la lógica de login pasa por una sola función: `authenticate()` en `assets/shell.js`. El día que decidas usar Netlify Functions + Supabase/Neon, solo reemplazas el contenido de esa función por una llamada a tu API — el resto del shell (roles, permisos, navegación, sesión) no necesita cambios.

## Limitación de seguridad conocida (documentada, no oculta)
La autenticación actual vive enteramente en el navegador (localStorage). Alguien con acceso a las herramientas de desarrollador del navegador podría en teoría ver o alterar esos datos. Es apropiado para uso interno de confianza, no para proteger información sensible. Ver sección de arquitectura en el documento de propuesta para más detalle.

## Qué se conservó intacto de cada módulo
Ningún archivo dentro de `/modules` tuvo cambios en su lógica, cálculos, formularios o flujos originales. El único agregado en los 7 archivos fue un listener de ~10 líneas al final de cada uno, para recibir el mensaje de cambio de tema desde el shell — aprobado explícitamente por ti. Todo lo demás es exactamente el archivo que subiste.

## Historial de pruebas y correcciones (ronda 2)
Se probó la app con un navegador automatizado (Playwright) simulando: login, permisos por rol, cambio de tema, creación/edición de usuarios, navegación en escritorio y en móvil. Se encontraron y corrigieron 3 fallas reales:

1. **Doble menú apilado**: cada módulo trae su propio menú interno (ej. "HORARIO / RESULTADO / EMPLEADOS..."), y al quedar dentro de una sidebar fija de 250px, el módulo perdía ancho y se veían dos barras de navegación una sobre otra — muy notorio en móvil. **Corregido:** ahora la sidebar de Africa Tools se repliega automáticamente al entrar a un módulo, devolviéndole el 100% del ancho de pantalla (igual que si lo abrieras solo). Queda un botón flotante ☰ para volver al menú de Africa Tools en cualquier momento.
2. **El fondo oscuro del menú bloqueaba clics**: al dejar el menú "abierto" por defecto en Dashboard/Administración, un fondo oscuro (backdrop) cubría toda la pantalla y volvía inoperables los botones (ej. "+ Nuevo usuario"). **Corregido:** en escritorio el menú queda anclado sin backdrop; en móvil inicia cerrado y solo se despliega con el botón ☰.
3. **El menú tapaba todo el Dashboard al entrar desde el celular**: quedaba abierto por defecto en pantallas pequeñas. **Corregido:** ahora inicia cerrado en todas las vistas y se abre solo cuando lo pides.

## Correcciones aprobadas por ti (ronda 3) — tocan contenido original, no solo agregados
A diferencia del listener de tema (que solo se agrega al final sin tocar nada existente), estas dos sí modifican una línea puntual de la lógica original — las hiciste explícitamente:

1. **África Limpieza — bug de "código roto" al usar Live Server**: la función de impresión arma internamente un HTML de página completa como texto, y ese texto contenía literalmente `</body></html>`. Herramientas como Live Server (VS Code) buscan esa palabra como texto plano para inyectar su script de auto-recarga, sin saber que estaba dentro de un string de JavaScript — encontraban esa aparición falsa antes que el cierre real de la página y partían el `<script>` principal en dos, dejando todo el código después de ese punto visible como texto en pantalla. Solución aplicada: se escapó a `<\/body><\/html>` — produce exactamente el mismo HTML de impresión al ejecutarse, solo cambia cómo se ve el texto fuente para que herramientas externas no lo confundan con una etiqueta real. **Esto no pasaba al abrir el archivo directo, y tampoco pasará en Netlify** (ningún servidor de producción inyecta scripts de recarga); era puramente un problema de tu flujo de desarrollo local con Live Server.
2. **Habladores Winner — fuente de impresión**: el `@import` que carga la fuente Poppins desde Google Fonts estaba ubicado después de otras reglas CSS, una posición inválida según la especificación — el navegador lo ignora silenciosamente ahí. Se movió a la primera línea del `<style>`, que es el único lugar donde un `@import` funciona. Ahora Poppins carga de verdad en vez de depender de si tu computador tiene "Century Gothic" instalada.

Ambos cambios fueron verificados: repliqué el bug de Live Server exacto (inyectando un script simulado en el mismo punto) contra el archivo corregido y ya no se rompe; y confirmé con diff que ninguna otra línea de lógica cambió.

## Limitación conocida (no corregida, informativa)
África Inventario y Habladores Winner dependen de una librería externa (`pdf.js`) cargada desde un CDN público. Si el navegador/red del usuario bloquea ese CDN (poco común, pero puede pasar con algunos firewalls corporativos o extensiones de bloqueo agresivas), esos dos módulos no podrán leer PDFs — el resto de Africa Tools seguiría funcionando con normalidad. No se tocó el código de esos módulos porque no es un problema de la integración, sino una dependencia que ya existía en los artefactos originales.

