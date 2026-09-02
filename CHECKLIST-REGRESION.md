# Africa Tools — Checklist de regresión por módulo

Derivado del análisis real de cada archivo (no inventado). Marca cada punto la primera vez que pruebes Africa Tools a fondo en tu propio entorno (idealmente ya en Netlify, no solo en Live Server).

## 1. Limpieza
- [ ] Ingresar horario (entrada/salida/"D") para varios empleados y varios días
- [ ] Botón "⚡ Generar asignación" produce parejas de limpieza por día
- [ ] Pestaña Resultado muestra el rango de semana y las parejas generadas
- [ ] Agregar/quitar empleados desde la pestaña Empleados
- [ ] Agregar/quitar máquinas, marcar dificultad (Alta/Media/Baja) y "doble" desde Máquinas
- [ ] Tareas periódicas: asignación automática y asignación fija a una persona
- [ ] "🖨️ Imprimir / Guardar PDF" abre ventana de impresión con el formato correcto (usa la función que acabamos de corregir — probar especialmente esta)
- [ ] "🧹 Limpiar tabla" reinicia el horario sin borrar empleados/máquinas
- [ ] Cambiar tema claro/oscuro se ve bien en las 5 pestañas

## 2. Inventario
- [ ] Subir un PDF de inventario con tabla
- [ ] Revisar/editar celdas detectadas manualmente
- [ ] Reordenar columnas con las flechas ◄►
- [ ] Agregar/eliminar columnas y filas
- [ ] Exportar a Excel y confirmar que abre correctamente en Excel/Sheets
- [ ] Alternar entre tema África y City Park

## 3. Líder de Seguridad
- [ ] Semáforo EPP: registrar estado semanal
- [ ] Checklist mensual: marcar ítems y que persistan
- [ ] Banco de preguntas (Juegos ARL SURA): navegar y usar
- [ ] Recursos y formularios: subir un archivo (imagen o PDF) y confirmar que se guarda (va directo a Supabase — `lider_shared_data`, compartido con todo el equipo, sin cola offline — probar que sobrevive a un refresh y que otro líder lo ve al recargar)
- [ ] Resumen del rol carga sin errores

## 4. Marcación Folders/Lockers/A-Z
- [ ] Elegir cada uno de los 4 formatos (Folders/A-Z/Lockers/Combinado)
- [ ] Pegar una lista de nombres y generar vista previa
- [ ] Guardar/cargar un combo guardado (Caja menor, Checklist mantenimiento, etc.)
- [ ] Imprimir y confirmar que las medidas físicas salen correctas (esto es sensible — revisar con una hoja impresa real, no solo en pantalla)

## 5. Tablero Wow Points
- [ ] Agregar empleado con foto (tomar/subir + recortar en el modal)
- [ ] Seleccionar/deseleccionar empleados para el tablero
- [ ] Generar tablero y confirmar que muestra 6 tarjetas por hoja
- [ ] Imprimir

## 6. Calificación Wow Points
- [ ] Agregar nombre + puntaje
- [ ] Confirmar que el puntaje más alto se marca en verde como ganador
- [ ] Generar vista previa (12 por hoja, 2×6) e imprimir
- [ ] "Vaciar todo" funciona y pide confirmación

## 7. Habladores Winner
- [ ] Subir PDF de reporte y confirmar que detecta productos/tickets
- [ ] Agregar producto manualmente y "agregar varios pegando una lista"
- [ ] Buscar/ordenar productos
- [ ] Generar habladores e imprimir — **revisar en este momento si la fuente se ve como esperas** (con el arreglo del `@import`, ya no debería depender de si tu PC tiene Century Gothic instalada)

## Shell de Africa Tools (todo lo demás)
- [ ] Login con credenciales de administrador, luego cambiar la contraseña
- [ ] Crear un usuario Supervisor y uno Líder de Seguridad desde Administración, verificar que cada uno solo ve sus módulos permitidos
- [ ] Verificar en el celular: el menú abre con el botón ☰ flotante y no tapa el contenido
- [ ] Verificar en escritorio: el menú queda anclado en Dashboard/Administración, sin tapar nada
- [ ] Cambiar tema claro/oscuro desde el menú y confirmar que el módulo abierto también cambia
- [ ] Cerrar sesión y volver a entrar
- [ ] Instalar como PWA (ícono "Instalar app" en la barra de direcciones de Chrome/Edge, o "Compartir → Añadir a inicio" en iPhone) y confirmar que abre en modo standalone sin la barra del navegador

## Rediseño UI/UX (Fase 3) — pendiente de probar en dispositivo real
Todo esto se validó con análisis estático (sintaxis, HTML, diffs) pero no con un navegador real — es la parte que más vale la pena revisar primero:
- [ ] **Splash screen iOS**: instalar la PWA en un iPhone (Safari → Compartir → Añadir a inicio) y confirmar que se ve el splash con el logo al abrirla, no una pantalla blanca — solo en orientación vertical, ver limitación arriba
- [ ] **Banner de instalación**: en Chrome/Edge de escritorio o Android, confirmar que aparece el banner inferior "Instala Africa Tools..." y que el botón "Instalar" funciona; confirmar que "✕" lo oculta y no vuelve a aparecer en esa sesión
- [ ] **Indicador de sin conexión**: apagar el wifi/datos con la app abierta y confirmar que aparece la franja "📶 Sin conexión..." arriba, y que desaparece al reconectar
- [ ] **Modo riel de sidebar**: en una pantalla ≥1024px (laptop/monitor), abrir un módulo y confirmar que la sidebar queda como una franja angosta con solo íconos (no desaparece del todo) — y que al pasar a una ventana angosta vuelve a comportarse como antes (oculta + botón ☰)
- [ ] **Spinner al abrir un módulo**: confirmar que se ve un spinner con fondo café (no una pantalla en blanco) mientras carga, y que si simulas conexión muy lenta (throttling en DevTools) aparece el botón "Reintentar" después de unos segundos
- [ ] **Admin — "Desactivar" tu propio usuario**: confirmar que en tu propia fila de la tabla de Administración ya NO aparece el botón "Desactivar" (debe decir "Tu usuario" en su lugar)
- [ ] **Admin — desactivar a otra persona**: confirmar que pide un modal de confirmación (no el diálogo gris del navegador) con el nombre de la persona
- [ ] **Modal de confirmación por módulo**: probar "eliminar" en cada uno de los 4 módulos que lo tenían (`inventario`: eliminar fila; `habladores`: eliminar seleccionados; `limpieza`: quitar empleado / eliminar máquina / eliminar tarea) y confirmar que aparece el modal propio de cada módulo, no el diálogo gris del navegador
- [ ] **Tabla de administración en celular**: confirmar que se puede hacer scroll horizontal y que aparece el texto "← Desliza para ver todas las columnas →"
- [ ] **Accesibilidad con teclado**: en `folders`, navegar el selector de formato solo con Tab + Enter/Espacio; en `wow-tablero`, hacer lo mismo con las tarjetas de empleado; en `limpieza`, confirmar que las 5 pestañas se leen bien con un lector de pantalla (o al menos que el atributo `aria-selected` cambia correctamente al inspeccionar con las herramientas de desarrollador)

