/* AFRICA TOOLS · SHELL.JS */

const STORAGE_THEME = 'africa_tools_theme';
const STORAGE_LOGIN_ATTEMPTS = 'africa_tools_login_attempts';

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 5;

const MODULE_SOURCES = {
  'limpieza': 'modules/limpieza/africaLimpieza.html',
  'inventario': 'modules/inventario/africaInventario.html',
  'lider': 'modules/lider/LiderAfrica.html',
  'folders': 'modules/folders/marcacion-folders.html',
  'wow-tablero': 'modules/wow-tablero/tablero-wow-points.html',
  'wow-calificacion': 'modules/wow-calificacion/calificacion-wow-points.html',
  'habladores': 'modules/habladores/habladores-winner.html',
  'agenda': 'modules/agenda/AgendaFiestas.html',
  'diaadia': 'modules/diaadia/africaDiaADia.html',
};

/* ---------- Autenticación real (Supabase Auth) ----------
   El cliente `supabaseClient` viene de assets/supabase-config.js, cargado
   antes que este archivo. Aquí adentro seguimos usando "usuario" (no
   correo) de cara al equipo — por debajo se traduce a un correo falso
   (usuarioToEmail) porque Supabase Auth exige un correo como identidad,
   pero nadie del equipo lo ve ni lo escribe nunca. */
const AUTH_EMAIL_DOMAIN = 'africatools.internal';

function usuarioToEmail(usuario) {
  return String(usuario).trim().toLowerCase().replace(/\s+/g, '.') + '@' + AUTH_EMAIL_DOMAIN;
}

// Trae el perfil (nombre, roles, activo, etc.) de la persona ya autenticada.
async function fetchOwnProfile(userId) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, usuario, nombre, roles, activo, must_change_password')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    usuario: data.usuario,
    nombre: data.nombre,
    roles: data.roles || [],
    activo: data.activo,
    mustChangePassword: data.must_change_password,
  };
}

async function authenticate(usuario, clave) {
  const email = usuarioToEmail(usuario);
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: clave });
  if (error || !data || !data.user) return null;

  const profile = await fetchOwnProfile(data.user.id);
  if (!profile || profile.activo === false) {
    await supabaseClient.auth.signOut();
    return null;
  }
  return profile;
}

// Lista completa de usuarios — solo funciona para un administrador (lo
// hace cumplir la seguridad por fila configurada en Supabase, no este
// código). Se usa en el panel de Administración.
async function loadUsers() {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, usuario, nombre, roles, activo, must_change_password, created_at')
    .order('created_at', { ascending: true });
  if (error) { console.error('Error cargando usuarios:', error); return []; }
  return data.map(d => ({
    id: d.id,
    usuario: d.usuario,
    nombre: d.nombre,
    roles: d.roles || [],
    activo: d.activo,
    mustChangePassword: d.must_change_password,
  }));
}

// Edita nombre/roles/activo/mustChangePassword de un perfil existente.
// No sirve para crear ni eliminar usuarios — eso necesita la llave
// service_role, que nunca vive en el navegador (ver netlify/functions).
async function updateProfile(id, patch) {
  const dbPatch = {};
  if ('nombre' in patch) dbPatch.nombre = patch.nombre;
  if ('roles' in patch) dbPatch.roles = patch.roles;
  if ('activo' in patch) dbPatch.activo = patch.activo;
  if ('mustChangePassword' in patch) dbPatch.must_change_password = patch.mustChangePassword;
  const { error } = await supabaseClient.from('profiles').update(dbPatch).eq('id', id);
  if (error) console.error('Error actualizando perfil:', error);
  return !error;
}

// Cambia la propia contraseña (sirve para cualquier usuario cambiando la
// suya, incluido el cambio obligatorio del primer login).
async function updateOwnPassword(nuevaClave) {
  const { error } = await supabaseClient.auth.updateUser({ password: nuevaClave });
  return !error;
}

// Llama a la función del servidor para acciones que requieren privilegios
// que el navegador nunca debe tener (crear o eliminar una cuenta ajena).
async function callManageUserFunction(action, payload) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
  if (!token) return { ok: false, error: 'No hay sesión activa.' };

  try {
    const res = await fetch('/.netlify/functions/manage-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ action, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error || 'Error del servidor.' };
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: 'No se pudo conectar con el servidor.' };
  }
}

async function createUserRemote({ usuario, nombre, clave, roles }) {
  return callManageUserFunction('create', {
    email: usuarioToEmail(usuario), usuario, nombre, clave, roles,
  });
}

async function deleteUserRemote(id) {
  return callManageUserFunction('delete', { id });
}

// Permite que un administrador resetee la clave de otra persona (ej. si se
// bloqueó y no tiene forma de recuperarla por su cuenta). Marca la cuenta
// para que la persona deba cambiarla de nuevo en su próximo login.
async function resetPasswordRemote(id, nuevaClave) {
  return callManageUserFunction('reset-password', { id, nuevaClave });
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

// La sesión real la maneja Supabase (guarda su propio token, la renueva
// sola). Esto solo la consulta y arma el objeto de usuario que ya
// usa el resto del shell.
async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data || !data.session) return null;
  const profile = await fetchOwnProfile(data.session.user.id);
  if (!profile || profile.activo === false) return null;
  return profile;
}

async function clearSession() {
  await supabaseClient.auth.signOut();
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
   y cuándo. Vive en Supabase (tabla activity_log) — así, un administrador ve
   el mismo historial sin importar desde qué dispositivo entra. Solo un
   administrador puede leerlo (lo hace cumplir la seguridad por fila en
   Supabase, no este código); cualquier persona autenticada puede añadir una
   entrada sobre su propia acción. */
async function logActivity(action) {
  try {
    const actor = (typeof currentUser !== 'undefined' && currentUser && (currentUser.nombre || currentUser.usuario)) || 'Sistema';
    const actorId = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null;
    await supabaseClient.from('activity_log').insert({ actor, actor_id: actorId, action });
  } catch (e) {
    console.error('Error guardando actividad:', e);
  }
}

async function loadActivityLog(limit = 50, offset = 0) {
  const { data, error, count } = await supabaseClient
    .from('activity_log')
    .select('actor, action, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) { console.error('Error cargando actividad:', error); return { entries: [], total: 0 }; }
  const entries = data.map(d => ({ ts: new Date(d.created_at).getTime(), actor: d.actor, action: d.action }));
  return { entries, total: count || 0 };
}
