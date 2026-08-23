# 🦁 Africa Tools

Baúl de herramientas digitales para la operación de África Parque de Diversiones.

## 📦 Despliegue en Netlify

Este proyecto está listo para desplegarse directamente en Netlify:

### Opción 1: Despliegue desde Git

1. Sube el proyecto a GitHub/GitLab/Bitbucket
2. En Netlify: **Add new site → Import from Git**
3. Selecciona tu repositorio
4. Configuración automática (no necesita build):
   - **Build command:** (dejar vacío)
   - **Publish directory:** `.` (raíz del proyecto)
5. Click en **Deploy**

### Opción 2: Despliegue manual (Drag & Drop)

1. Ve a [Netlify Drop](https://app.netlify.com/drop)
2. Arrastra toda la carpeta `App` (excepto `_backups/`)
3. ¡Listo! Tu sitio estará disponible en minutos

## 🔧 Archivos incluidos para producción

```
App/
├── index.html              ← Entrada principal
├── manifest.json           ← Configuración PWA
├── service-worker.js       ← Cache offline
├── netlify.toml            ← Configuración de Netlify
├── .gitignore              ← Archivos a ignorar
├── LEEME.md                ← Documentación de usuario
├── assets/
│   ├── app.js
│   ├── shell.js
│   ├── permissions.js
│   ├── design-tokens.css
│   ├── shell.css
│   └── icons/ (SVG + PNG)
└── modules/ (7 módulos HTML)
```

## ✅ Características

- ✅ **PWA completa** - Instalable y funciona offline
- ✅ **Supabase** - Auth real y datos en Postgres, con cola de sincronización offline (`OfflineStorage`) para trabajar sin conexión
- ✅ **Responsive** - Desktop, tablet y móvil
- ✅ **Sin build** - No requiere npm ni bundler para desplegar
- ✅ **Seguro** - Headers de seguridad configurados

Ver `ESTRUCTURA-DATOS.md` para el detalle completo del modelo de datos vigente.

## 🚀 Uso después del despliegue

1. Abre tu URL de Netlify (ej. `https://africa-tools.netlify.app`)
2. Login inicial con las credenciales de administrador configuradas
3. Ve a **Administración → Usuarios** y:
   - Cambia la contraseña del admin
   - Crea usuarios para tu equipo (Supervisor, Líder de Seguridad, etc.)

## 🔒 Seguridad

- Auth real y datos en Supabase (Postgres) — ver `ESTRUCTURA-DATOS.md`
- Cada usuario ve solo sus propios datos por-usuario; copia local + cola de sincronización solo para trabajar offline
- Headers de seguridad configurados en `netlify.toml`
- Sistema de bloqueo por intentos fallidos de login

## 📱 Instalación como App

Después de visitar el sitio, el navegador ofrecerá instalar Africa Tools como aplicación:

- **Chrome/Edge:** Botón "Instalar" en la barra de direcciones
- **iOS Safari:** Compartir → Añadir a pantalla de inicio
- **Android:** Banner automático + menú → Instalar app

## 🛠️ Desarrollo local (opcional)

Si necesitas probar cambios localmente:

```bash
# Opción 1: Servidor Node.js incluido
node server.js
# Abre http://localhost:3000

# Opción 2: Python
python -m http.server 8080
# Abre http://localhost:8080

# Opción 3: Live Server en VS Code
# Clic derecho en index.html → Open with Live Server
```

## 📝 Notas importantes

- **Datos:** viven en Supabase (Postgres), privados por usuario donde aplica; ver `ESTRUCTURA-DATOS.md`
- **Offline:** el service worker cachea assets, y `OfflineStorage` encola cambios sin conexión para sincronizar al reconectar
- **Actualización:** Netlify redespliega automáticamente al hacer push a Git

## 🆘 Soporte

Para más detalles sobre el uso de cada módulo, consulta `LEEME.md`. Para el historial de cambios del proyecto, consulta `CHANGELOG.md`.
