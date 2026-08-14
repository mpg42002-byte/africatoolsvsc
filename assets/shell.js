/* AFRICA TOOLS · SHELL.JS */

const STORAGE_USERS = 'africa_tools_users';
const STORAGE_SESSION = 'africa_tools_session';
const STORAGE_THEME = 'africa_tools_theme';
const STORAGE_LOGIN_ATTEMPTS = 'africa_tools_login_attempts';
const STORAGE_AUDIT_LOG = 'africa_tools_audit_log';

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 5;
const SESSION_EXPIRY_DAYS = 7;
const MAX_AUDIT_ENTRIES = 500;

const MODULE_SOURCES = {
  'limpieza': 'modules/limpieza/africaLimpieza.html',
  'inventario': 'modules/inventario/africaInventario.html',
  'lider': 'modules/lider/LiderAfrica.html',
  'folders': 'modules/folders/marcacion-folders.html',
  'wow-tablero': 'modules/wow-tablero/tablero-wow-points.html',
  'wow-calificacion': 'modules/wow-calificacion/calificacion-wow-points.html',
  'habladores': 'modules/habladores/habladores-winner.html',
};

async function hashPassword(plain) {
  const enc = new TextEncoder().encode(plain);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function addAuditLog(action, details, performedBy) {
  try {
    const log = JSON.parse(localStorage.getItem(STORAGE_AUDIT_LOG) || '[]');
    log.unshift({
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      action,
      details,
      performedBy: performedBy || 'Sistema'
    });
    
    if (log.length > MAX_AUDIT_ENTRIES) {
      log.splice(MAX_AUDIT_ENTRIES);
    }
    
    localStorage.setItem(STORAGE_AUDIT_LOG, JSON.stringify(log));
  } catch (e) {
    console.error('Error guardando auditoría:', e);
  }
}

function getAuditLog(limit = 50) {
  try {
    const log = JSON.parse(localStorage.getItem(STORAGE_AUDIT_LOG) || '[]');
    return log.slice(0, limit);
  } catch {
    return [];
  }
}

async function seedInitialAdminIfEmpty() {
  const users = loadUsers();
  if (users.length > 0) return;
  const hashed = await hashPassword('africa2026');
  users.push({
    id: 'u_' + Date.now(),
    usuario: 'admin',
    nombre: 'Administrador',
    passwordHash: hashed,
    roles: ['administrador'],
    activo: true,
  });
  saveUsers(users);
}

function getLoginAttempts() {
  try {
    const raw = sessionStorage.getItem(STORAGE_LOGIN_ATTEMPTS);
    return raw ? JSON.parse(raw) : { count: 0, lockUntil: null };
  } catch { return { count: 0, lockUntil: null }; }
}

function saveLoginAttempts(attempts) {
  sessionStorage.setItem(STORAGE_LOGIN_ATTEMPTS, JSON.stringify(attempts));
}

function isLoginLocked() {
  const attempts = getLoginAttempts();
  if (!attempts.lockUntil) return false;
  if (Date.now() < attempts.lockUntil) {
    return Math.ceil((attempts.lockUntil - Date.now()) / 1000);
  }
  saveLoginAttempts({ count: 0, lockUntil: null });
  return false;
}

function recordFailedLogin() {
  const attempts = getLoginAttempts();
  attempts.count += 1;
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockUntil = Date.now() + (LOGIN_LOCKOUT_MINUTES * 60 * 1000);
  }
  saveLoginAttempts(attempts);
}

function clearLoginAttempts() {
  saveLoginAttempts({ count: 0, lockUntil: null });
}

async function authenticate(usuario, clave) {
  const users = loadUsers();
  const hashed = await hashPassword(clave);
  const found = users.find(u =>
    u.usuario.toLowerCase() === String(usuario).toLowerCase() &&
    u.passwordHash === hashed &&
    u.activo !== false
  );
  return found || null;
}

function setSession(user, remember) {
  const sessionData = { 
    id: user.id, 
    usuario: user.usuario, 
    nombre: user.nombre, 
    roles: user.roles,
    expiresAt: Date.now() + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  };
  sessionStorage.setItem(STORAGE_SESSION, JSON.stringify(sessionData));
  if (remember) localStorage.setItem(STORAGE_SESSION, JSON.stringify(sessionData));
}

function getSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_SESSION) || localStorage.getItem(STORAGE_SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch { return null; }
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_SESSION);
  localStorage.removeItem(STORAGE_SESSION);
}

function getTheme() {
  return localStorage.getItem(STORAGE_THEME) || 'light';
}

function setTheme(theme) {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
  localStorage.setItem(STORAGE_THEME, normalizedTheme);
  document.documentElement.setAttribute('data-theme', normalizedTheme);
  const themeMeta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (themeMeta) themeMeta.setAttribute('content', normalizedTheme === 'dark' ? '#1E1610' : '#4A2F1F');
  const iframe = document.getElementById('module-frame');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type: 'africa-tools-set-theme', theme: normalizedTheme }, '*');
  }
}

/* ---------- Cierre de sesión por inactividad ----------
   Pensado para equipos compartidos (tablet de recepción, PC de bodega).
   30 minutos sin ningún clic/tecla/scroll cierra la sesión automáticamente. */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let lastActivityAt = Date.now();
let idleCheckInterval = null;

function markActivity() { lastActivityAt = Date.now(); }

function startIdleWatcher(onIdleTimeout) {
  stopIdleWatcher();
  lastActivityAt = Date.now();
  ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(evt =>
    document.addEventListener(evt, markActivity, { passive: true })
  );
  idleCheckInterval = setInterval(() => {
    if (Date.now() - lastActivityAt > IDLE_TIMEOUT_MS) {
      stopIdleWatcher();
      onIdleTimeout();
    }
  }, 30 * 1000);
}

function stopIdleWatcher() {
  if (idleCheckInterval) clearInterval(idleCheckInterval);
  idleCheckInterval = null;
  ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(evt =>
    document.removeEventListener(evt, markActivity)
  );
}

/* ---------- Log de actividad administrativa ----------
   Registro simple de qué se hizo desde Administración (usuarios/roles), quién
   y cuándo. Solo se ve dentro del panel de Administración. */
const STORAGE_ACTIVITY_LOG = 'africa_tools_activity_log';
const ACTIVITY_LOG_MAX = 200;

function logActivity(action) {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVITY_LOG);
    const log = raw ? JSON.parse(raw) : [];
    log.unshift({
      ts: Date.now(),
      actor: (typeof currentUser !== 'undefined' && currentUser && (currentUser.nombre || currentUser.usuario)) || 'Sistema',
      action,
    });
    if (log.length > ACTIVITY_LOG_MAX) log.length = ACTIVITY_LOG_MAX;
    localStorage.setItem(STORAGE_ACTIVITY_LOG, JSON.stringify(log));
  } catch { }
}

function loadActivityLog() {
  try { return JSON.parse(localStorage.getItem(STORAGE_ACTIVITY_LOG)) || []; } catch { return []; }
}

/* ---------- Respaldo y restauración de todos los datos ----------
   Africa Tools vive enteramente en este navegador (localStorage +
   IndexedDB del módulo Líder África). Esto empaqueta todo en un único
   .json descargable, y lo restaura leyendo ese mismo archivo. */
const LIDER_DB_NAME = 'panel-lider-seguridad';
const LIDER_STORE_NAME = 'kv';

function readIndexedDbStore(dbName, storeName) {
  return new Promise((resolve) => {
    let req;
    try { req = indexedDB.open(dbName); } catch { resolve(null); return; }
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) { db.close(); resolve(null); return; }
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const keysReq = store.getAllKeys();
      const valsReq = store.getAll();
      tx.oncomplete = () => {
        const out = {};
        keysReq.result.forEach((k, i) => { out[k] = valsReq.result[i]; });
        db.close();
        resolve(out);
      };
      tx.onerror = () => { db.close(); resolve(null); };
    };
  });
}

function writeIndexedDbStore(dbName, storeName, obj) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(storeName)) req.result.createObjectStore(storeName);
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      Object.keys(obj).forEach(k => store.put(obj[k], k));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
    req.onerror = () => reject(req.error);
  });
}

async function buildBackupData() {
  const data = { app: 'africa-tools', version: 1, exportedAt: new Date().toISOString(), localStorage: {}, indexedDB: {} };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    data.localStorage[k] = localStorage.getItem(k);
  }
  const liderData = await readIndexedDbStore(LIDER_DB_NAME, LIDER_STORE_NAME);
  if (liderData) data.indexedDB[LIDER_DB_NAME + '__' + LIDER_STORE_NAME] = liderData;
  return data;
}

async function downloadBackupFile() {
  const data = await buildBackupData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `africa-tools-respaldo-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function restoreBackupFile(file) {
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('invalid_json'); }
  if (!data || data.app !== 'africa-tools' || !data.localStorage) throw new Error('not_a_backup');
  Object.keys(data.localStorage).forEach(k => localStorage.setItem(k, data.localStorage[k]));
  const liderKey = LIDER_DB_NAME + '__' + LIDER_STORE_NAME;
  if (data.indexedDB && data.indexedDB[liderKey]) {
    await writeIndexedDbStore(LIDER_DB_NAME, LIDER_STORE_NAME, data.indexedDB[liderKey]);
  }
}
