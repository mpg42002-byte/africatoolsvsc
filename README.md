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

- ✅ **100% estático** - No necesita servidor backend
- ✅ **PWA completa** - Instalable y funciona offline
- ✅ **localStorage** - Datos guardados localmente en cada navegador
- ✅ **Responsive** - Desktop, tablet y móvil
- ✅ **Sin dependencias** - No requiere npm ni build
- ✅ **Seguro** - Headers de seguridad configurados

## 🚀 Uso después del despliegue

1. Abre tu URL de Netlify (ej. `https://africa-tools.netlify.app`)
2. Login inicial con las credenciales de administrador configuradas
3. Ve a **Administración → Usuarios** y:
   - Cambia la contraseña del admin
   - Crea usuarios para tu equipo (Supervisor, Líder de Seguridad, etc.)

## 🔒 Seguridad

- Los datos se guardan en localStorage de cada navegador
- Cada parque/computadora tiene su propia base de datos local
- Las contraseñas se hashean con SHA-256
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

- **Datos locales:** Cada navegador/dispositivo tiene sus propios datos
- **Backups:** Usa las funciones de exportación de cada módulo
- **Actualización:** Netlify redespliega automáticamente al hacer push a Git
- **Cache:** El service worker cachea assets para uso offline

## 🆘 Soporte

Para más detalles sobre el uso de cada módulo, consulta `LEEME.md`.
