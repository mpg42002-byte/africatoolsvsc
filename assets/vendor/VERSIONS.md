# Dependencias autoalojadas (`assets/vendor/`)

Antes se cargaban de CDN (sin versión fija ni SRI, y sin funcionar si no había internet). Ahora viven en el repositorio:
el sitio no depende de ningún CDN para arrancar, el Service Worker las precachea y cada archivo lleva la versión en el nombre.
Los **checksums SHA-256** están en `checksums.sha256` (los verifica `tests/pwa/vendor-sw.test.js`). Las licencias, en `licenses/`.

| Archivo | Librería | Versión | Origen (npm) | Licencia | Se usa en |
|---|---|---|---|---|---|
| `supabase-2.117.3.js` | @supabase/supabase-js | 2.117.3 (publicada 2026-10-07) | `dist/umd/supabase.js` | MIT | shell y los 10 módulos |
| `pdf-3.11.174.min.js` / `pdf.worker-3.11.174.min.js` | pdf.js (pdfjs-dist) | 3.11.174 | `build/pdf.min.js`, `build/pdf.worker.min.js` | Apache-2.0 | Inventario, Habladores |
| `exceljs-4.4.0.min.js` | ExcelJS | 4.4.0 | `dist/exceljs.min.js` | MIT | Inventario |
| `jspdf-2.5.1.umd.min.js` | jsPDF | 2.5.1 | `dist/jspdf.umd.min.js` | MIT | Limpieza, Wow Calificación |
| `html2canvas-1.4.1.min.js` | html2canvas | 1.4.1 | `dist/html2canvas.min.js` | MIT | Limpieza, Wow Calificación |
| `heic-to-1.5.2.csp.js` | heic-to | 1.5.2 | `dist/csp/heic-to.js` (build sin `eval`) | LGPL-3.0 | Wow Tablero (fotos HEIC) |
| `fonts/fredoka-latin-{500,600,700}-normal.woff2` | Fredoka (@fontsource/fredoka 5.3.0) | 5.3.0 | `files/` (subconjunto latino) | OFL-1.1 | todos |
| `fonts/nunito-latin-{400,600,700,800}-normal.woff2` | Nunito (@fontsource/nunito 5.3.0) | 5.3.0 | `files/` (subconjunto latino) | OFL-1.1 | todos |

## Cómo actualizar una librería
1. `npm i <paquete>@<versión exacta>` en una carpeta temporal y copiar el archivo a `assets/vendor/` con **la versión en el nombre**
   (elige una versión publicada hace más de 14 días: una versión recién salida puede traer código malicioso que nadie ha detectado).
2. Cambiar la referencia en los HTML que la usan y la fila de esta tabla.
3. `node scripts/stamp.js` (regenera los checksums y el nombre del caché del Service Worker) y borrar el archivo viejo.
4. `cd tests && npm test`.
