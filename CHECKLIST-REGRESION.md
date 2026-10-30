# Africa Tools — Checklist de regresión por módulo

Derivado del análisis real de cada archivo (no inventado). Marca cada punto la primera vez que pruebes Africa Tools a fondo en tu propio entorno (idealmente ya en Netlify, no solo en Live Server).

## 1. Limpieza
- [ ] Ingresar horario (entrada/salida/"D") para varios empleados y varios días
- [ ] Botón "⚡ Generar asignación" produce parejas de limpieza por día
- [ ] Pestaña Resultado muestra el rango de semana y las parejas generadas
- [ ] Agregar/quitar empleados desde la pestaña Empleados
- [ ] Agregar/quitar máquinas, marcar dificultad (Alta/Media/Baja) y "doble" desde Máquinas
- [ ] Tareas periódicas: asignación automática y asignación fija a una persona
- [ ] "🖨️ Imprimir / Guardar PDF" — rediseñado el 2026-09-10 (columnas dinámicas de parejas/máquinas, letra más grande, ya no recorta). Probar con el equipo real completo (no solo con pocos empleados) y confirmar que cabe en una sola hoja A4 horizontal, sin texto cortado ni montado
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
- [ ] Bitácora de abordajes: con más de 20 registros, confirmar que aparece paginada (no toda la lista de golpe) y que el filtro por trabajador también pagina correctamente
- [ ] Resumen del rol carga sin errores

## 4. Marcación Folders/Lockers/A-Z
- [ ] Elegir cada uno de los 4 formatos (Folders/A-Z/Lockers/Combinado)
- [ ] Pegar una lista de nombres y generar vista previa
- [ ] Guardar/cargar un combo guardado (Caja menor, Checklist mantenimiento, etc.)
- [ ] Imprimir y confirmar que las medidas físicas salen correctas (esto es sensible — revisar con una hoja impresa real, no solo en pantalla)
- [ ] En A-Z y en Lockers, probar un nombre largo (dos o tres palabras) y confirmar que la fuente se reduce hasta caber, sin cortar ninguna palabra a la mitad

## 5. Tablero Wow Points
- [ ] Agregar empleado con foto (tomar/subir + recortar en el modal)
- [ ] Subir una foto HEIC (formato por defecto de la cámara de iPhone) y confirmar que se convierte y carga bien
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

## 8. Bitácora
- [ ] Como Líder de Parque o Administrador: escribir una nota hoy y confirmar que aparece con tu nombre y la hora
- [ ] Editar y luego eliminar una nota escrita hoy — confirmar que ambas acciones funcionan
- [ ] Cambiar la fecha a un día anterior (con notas de antes) y confirmar que NO aparecen los botones de editar/eliminar, ni el cuadro para agregar una nota nueva
- [ ] Como Supervisor (o cualquier otro rol que no sea Líder de Parque/Administrador): confirmar que **Bitácora ni siquiera aparece en el menú** — y si se entra directo a su URL, debe mostrar la pantalla de "sin acceso", no las notas
- [ ] Buscar una palabra que sepas que está en una nota de hace varios días y confirmar que el resultado te lleva a esa fecha al tocarlo
- [ ] Verificar en el celular que la página se ve completa sin scroll horizontal

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
- [ ] **Sesión larga dentro de un módulo (F-01)**: abrir Limpieza, trabajar ~30 min sin salir del módulo (clics, escribir) y confirmar que NO te devuelve al login; dejar el celular quieto y confirmar que a los ~28 min aparece el aviso "Tu sesión se cerrará en N min" con "Seguir conectado", y que a los 30 min cierra
- [ ] **Edición sin conexión y reapertura (F-02)**: sin señal editar la lista de empleados de Limpieza, cerrar la app, abrirla con señal y confirmar que se ve TU edición (no la vieja); editar otra vez y esperar 1 min: debe quedar tu último cambio
- [ ] **Bitácora de noche (F-06, después de correr el SQL)**: después de las 7 p. m. (Bogotá) escribir una nota y confirmar que aparece en el día de HOY y que se puede editar y eliminar
- [ ] **Inventario sin internet (F-04)**: con los datos apagados al abrir el módulo, confirmar que la pantalla NO queda en blanco y que al subir un PDF aparece "No se pudo cargar el lector de PDF"
- [ ] **Dos personas, mismo dato (F-02c)**: con dos celulares (A y B) abrir Limpieza → Empleados. B quita a un empleado y espera 5 s. A (que no recargó) agrega a otra persona. A debe ver la ventana "Alguien más cambió esto"; probar las 3 opciones en tres rondas: Combinar (queda B sin el empleado quitado + la persona nueva de A), Conservar lo mío y Usar lo del servidor
- [ ] **Sin choque normal**: una sola persona editando y guardando varias veces seguidas NO debe ver la ventana nunca
- [ ] **Zoom con dos dedos (F3a)**: en un iPhone y en un Android reales, pellizcar para ampliar en la pantalla de inicio y dentro de un módulo; debe ampliar, y al soltar no debe quedar nada roto. Doble toque rápido sobre un botón NO debe ampliar
- [ ] **Menú lateral en el celular**: con el menú cerrado no se ve ninguna franja oscura en el borde izquierdo de la pantalla
- [ ] **Administración en pantalla angosta**: "+ Nuevo usuario" se ve completo (puede quedar debajo del título)
- [ ] **Limpieza en el celular**: al tocar "Tareas" o "Máquinas" la pestaña activa queda visible; en Horario, al desplazar la tabla a los lados la columna con el nombre del empleado se queda fija
- [ ] **Líder de Seguridad en tablet vertical**: la pestaña Semáforo EPP y el registro semanal no hacen que la pantalla entera se desplace de lado (solo la tabla)
- [ ] **Botones con el dedo (F3b)**: en un celular real, tocar con el pulgar los botones pequeños (✏️ 🗑 en Bitácora, las flechas de fecha de Día a Día y Agenda, el botón de tema, las casillas de "Doble" en máquinas de Limpieza): ninguno debe pedir puntería ni activar el de al lado
- [ ] **Se ve bien en escritorio y tablet**: Limpieza → Horario, Administración y Día a Día se ven ordenados (filas más altas, sin textos cortados ni botones que se monten)
- [ ] **Letra legible (F3c)**: en el celular, las etiquetas pequeñas (insignias de rol, chips, "Hoy", días de la semana, tarjetas del libro de Agenda) se leen sin acercar la pantalla y no quedan cortadas
- [ ] **Impresión idéntica (F3c)**: generar e imprimir (o guardar en PDF) un horario de Limpieza, una hoja de Habladores, Folders y Wow Tablero, y compararlos con uno impreso antes: deben verse exactamente igual
- [ ] **Celular acostado**: abrir la app con el celular en horizontal; el menú y el contenido siguen usables y no hay barra lateral que tape todo
- [ ] **Solo con teclado (F4)**: sin tocar el mouse, recorrer con Tab el menú, abrir un módulo, cambiar de pestaña con las flechas, abrir "+ Nuevo usuario" y cerrarlo con Esc: el foco nunca se pierde ni queda atrapado detrás de la ventana
- [ ] **Lector de pantalla (VoiceOver en iPhone o TalkBack en Android)**: abrir Limpieza, tocar las pestañas y un botón de "Quitar": debe anunciar el nombre de la pestaña ("seleccionada") y de qué empleado es cada botón
- [ ] **Colores**: botones principales y pestañas activas en naranja se ven bien en tema claro y en tema oscuro (en oscuro el texto sobre el naranja es oscuro)
- [ ] **Antes de cada commit (F5)**: correr `node scripts/stamp.js` (regenera los checksums y el nombre del caché del Service Worker). Si el cambio no toca ningún archivo del precaché, no hace nada
- [ ] **Arranque sin internet (F5)**: abrir la app con internet, entrar, cerrarla; apagar datos y wifi y abrirla de nuevo: debe cargar el login con sus letras normales (no con la fuente del sistema) y, con sesión abierta, abrir Limpieza e Inventario (los botones de PDF/Excel deben seguir existiendo)
- [ ] **Después de desplegar una versión nueva**: abrir la app con internet y recargar una vez; el celular debe tomar los archivos nuevos (si algo se ve viejo, cerrar la app por completo y abrirla otra vez)
- [ ] **Indicador de sin conexión**: apagar el wifi/datos con la app abierta y confirmar que aparece la franja "📶 Sin conexión..." arriba, y que desaparece al reconectar
- [ ] **Sin conexión entre cuentas (S-05)**: con la cuenta A, apagar la señal, guardar una tarea en Día a Día y cerrar sesión; con la cuenta B (señal apagada) confirmar que NO aparece la tarea de A; prender la señal y confirmar que lo de A no aparece en B. Volver a entrar con A y confirmar que su tarea se sube sola
- [ ] **Quitar empleado (Limpieza)**: agregar un empleado con comilla simple (por ejemplo `O'Brien`), quitarlo y confirmar que se elimina solo ese; el horario de los demás no se mueve
- [ ] **Foto del Tablero Wow**: agregar un empleado con foto y confirmar que la foto se ve en la lista y en la tarjeta generada
- [ ] **Modo riel de sidebar**: en una pantalla ≥1024px (laptop/monitor), abrir un módulo y confirmar que la sidebar queda como una franja angosta con solo íconos (no desaparece del todo) — y que al pasar a una ventana angosta vuelve a comportarse como antes (oculta + botón ☰)
- [ ] **Spinner al abrir un módulo**: confirmar que se ve un spinner con fondo café (no una pantalla en blanco) mientras carga, y que si simulas conexión muy lenta (throttling en DevTools) aparece el botón "Reintentar" después de unos segundos
- [ ] **Admin — "Desactivar" tu propio usuario**: confirmar que en tu propia fila de la tabla de Administración ya NO aparece el botón "Desactivar" (debe decir "Tu usuario" en su lugar)
- [ ] **Admin — desactivar a otra persona**: confirmar que pide un modal de confirmación (no el diálogo gris del navegador) con el nombre de la persona
- [ ] **Modal de confirmación por módulo**: probar "eliminar" en cada uno de los 4 módulos que lo tenían (`inventario`: eliminar fila; `habladores`: eliminar seleccionados; `limpieza`: quitar empleado / eliminar máquina / eliminar tarea) y confirmar que aparece el modal propio de cada módulo, no el diálogo gris del navegador
- [ ] **Tabla de administración en celular**: confirmar que se puede hacer scroll horizontal y que aparece el texto "← Desliza para ver todas las columnas →"
- [ ] **Accesibilidad con teclado**: en `folders`, navegar el selector de formato solo con Tab + Enter/Espacio; en `wow-tablero`, hacer lo mismo con las tarjetas de empleado; en `limpieza`, confirmar que las 5 pestañas se leen bien con un lector de pantalla (o al menos que el atributo `aria-selected` cambia correctamente al inspeccionar con las herramientas de desarrollador)

