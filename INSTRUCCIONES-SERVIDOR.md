# Instrucciones para ejecutar Africa Tools

## ⚠️ Importante

**NO** puedes abrir `index.html` directamente con doble clic. Los navegadores bloquean el acceso entre iframes cuando usas el protocolo `file://`.

Debes usar un servidor HTTP local.

---

## 🚀 Opción 1: Servidor Node.js incluido (recomendado)

### Primera vez:
1. Abre PowerShell o CMD en la carpeta del proyecto
2. Ejecuta:
   ```
   node server.js
   ```
3. Abre tu navegador y ve a: **http://localhost:3000**

### Después:
- Siempre ejecuta `node server.js` antes de abrir la app
- Presiona `Ctrl+C` en la terminal para detener el servidor

---

## 🔧 Opción 2: Extensión de VS Code

Si usas Visual Studio Code:

1. Instala la extensión **Live Server**
2. Click derecho en `index.html` → "Open with Live Server"
3. Se abrirá automáticamente en tu navegador

---

## 🌐 Opción 3: Python (si tienes Python instalado)

```bash
# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000
```

Luego abre: **http://localhost:3000**

---

## 🔐 Credenciales por defecto

- **Usuario:** admin
- **Contraseña:** africa2026

---

## 🐛 Solución de problemas

### "El overlay se queda cargando"
→ Verifica que estés usando `http://localhost:3000`, NO `file://`

### "Puerto 3000 ya está en uso"
→ Cambia el puerto en `server.js` (línea 10) a otro número (ej. 3001, 8080)

### Los cambios no se reflejan
→ Presiona `Ctrl+Shift+R` en el navegador (hard refresh)
