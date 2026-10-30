#!/usr/bin/env node
/* Sin build: dos tareas de mantenimiento que se corren a mano antes de hacer commit.
     node scripts/stamp.js          → regenera assets/vendor/checksums.sha256 y estampa CACHE_NAME en service-worker.js
     node scripts/stamp.js --check  → no escribe nada; sale con error si alguno está desactualizado (lo usan las pruebas)
   CACHE_NAME = 'africa-tools-' + hash de TODOS los archivos que precachea el Service Worker (más su propia lógica):
   cada cambio en la app genera un nombre nuevo, así que el caché viejo se descarta solo y nadie tiene que acordarse de subir la versión. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const sha = (buf, alg = 'sha256') => crypto.createHash(alg).update(buf).digest('hex');
const check = process.argv.includes('--check');

// 1) checksums de assets/vendor
const vdir = path.join(ROOT, 'assets', 'vendor');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'licenses' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const files = walk(vdir).filter((f) => !/(checksums\.sha256|VERSIONS\.md)$/.test(f)).sort();
const sums = files.map((f) => `${sha(fs.readFileSync(f))}  ${path.relative(vdir, f).split(path.sep).join('/')}`).join('\n') + '\n';
const sumsPath = path.join(vdir, 'checksums.sha256');

// 2) CACHE_NAME
const swPath = path.join(ROOT, 'service-worker.js');
const sw = fs.readFileSync(swPath, 'utf8');
const list = [...sw.match(/const CORE_ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter((p) => p);
const h = crypto.createHash('sha256');
h.update(sw.replace(/const CACHE_NAME = '[^']*';/, ''));
['index.html', ...list].sort().forEach((p) => { const f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { h.update(p); h.update(fs.readFileSync(f)); } });
const name = 'africa-tools-' + h.digest('hex').slice(0, 12);
const swNew = sw.replace(/const CACHE_NAME = '[^']*';/, `const CACHE_NAME = '${name}';`);

if (check) {
  const bad = [];
  if (!fs.existsSync(sumsPath) || fs.readFileSync(sumsPath, 'utf8') !== sums) bad.push('assets/vendor/checksums.sha256 desactualizado');
  if (swNew !== sw) bad.push(`CACHE_NAME desactualizado (debería ser ${name})`);
  if (bad.length) { console.error(bad.join('\n') + '\n→ corre: node scripts/stamp.js'); process.exit(1); }
  console.log('OK · ' + name);
} else {
  fs.writeFileSync(sumsPath, sums);
  fs.writeFileSync(swPath, swNew);
  console.log(`checksums: ${files.length} archivos · CACHE_NAME = ${name}`);
}
