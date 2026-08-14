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
