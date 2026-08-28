/* Servidor HTTP local para desarrollo */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  
  if (urlPath.endsWith('/')) {
    urlPath += 'index.html';
  }
  
  if (urlPath === '' || urlPath === '/') {
    urlPath = '/index.html';
  }
  
  let filePath = '.' + urlPath;
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 - No encontrado</h1><p>El archivo solicitado no existe.</p>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Error del servidor: ${err.code}`, 'utf-8');
      }
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>404 - No encontrado</h1><p>No hay index.html en este directorio.</p>', 'utf-8');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content, 'utf-8');
        }
      });
    } else {
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end(`Error leyendo archivo: ${err.code}`, 'utf-8');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    }
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  🦁 AFRICA TOOLS - Servidor de desarrollo           ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✓ Servidor corriendo en: http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Instrucciones:');
  console.log('  1. Abre tu navegador');
  console.log(`  2. Ve a: http://localhost:${PORT}`);
  console.log('  3. Presiona Ctrl+C para detener el servidor');
  console.log('');
  console.log('Esperando peticiones...');
  console.log('');
});

server.on('request', (req, res) => {
  const timestamp = new Date().toLocaleTimeString('es-ES');
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
});
