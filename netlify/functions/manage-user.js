// AFRICA TOOLS · netlify/functions/manage-user.js
//
// Esta función corre en el servidor de Netlify, nunca en el navegador de nadie. Es la única pieza del proyecto autorizada
// a usar la llave "service_role" de Supabase — la que puede crear o eliminar cuentas de otras personas. Esa llave vive en
// una variable de entorno de Netlify (SUPABASE_SERVICE_ROLE_KEY), nunca en el código ni en el repositorio.
//
// Habla con Supabase directo por fetch (sin librerías externas).
//
// Antes de hacer nada verifica, con el token de quien llama, que sea realmente un administrador activo. Además (Fase 6):
//   · TODO lo que llega del navegador se valida aquí: id (UUID), roles (lista permitida), usuario (patrón y largo),
//     nombre (largo y sin caracteres de control) y contraseña (mínimo 10) — en crear Y en restablecer.
//   · El correo de la cuenta NO se acepta del navegador: se deriva del usuario (igual que hace el inicio de sesión).
//   · Se revisa el encabezado Origin (defensa extra; el token va en un encabezado, no en una cookie).
//   · La cuenta principal (la administradora más antigua) no se puede restablecer ni eliminar por otra persona.
//   · El registro de actividad lo escribe el SERVIDOR con la identidad verificada de quien llama (antes lo escribía el
//     navegador y se podía falsificar).

const ROLES = ['administrador', 'supervisor', 'lider_parque', 'lider_seguridad', 'cajero', 'anfitrion_fiesta'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USUARIO_RE = /^[a-z0-9][a-z0-9 ._-]{1,31}$/;
const AUTH_EMAIL_DOMAIN = 'africatools.internal';
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 72; // bcrypt ignora lo que pase de 72 bytes

const usuarioToEmail = (usuario) => String(usuario).trim().toLowerCase().replace(/\s+/g, '.') + '@' + AUTH_EMAIL_DOMAIN;
const reply = (statusCode, obj) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);

function validatePassword(p) {
  if (typeof p !== 'string' || p.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (Buffer.byteLength(p, 'utf8') > PASSWORD_MAX) return `La contraseña es demasiado larga (máximo ${PASSWORD_MAX} caracteres).`;
  return null;
}

function originAllowed(headers, env) {
  const origin = headers.origin || headers.Origin;
  if (!origin) return true; // llamadas que no vienen de un navegador: igual necesitan el token de un administrador
  const host = headers['x-forwarded-host'] || headers.host || headers.Host || '';
  const extra = String(env.ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
  return origin === 'https://' + host || origin === 'http://' + host || extra.includes(origin);
}

function makeHandler({ fetch: doFetch, env }) {
  const SUPABASE_URL = env.SUPABASE_URL;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  async function sb(path, options = {}) {
    const res = await doFetch(SUPABASE_URL + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY, ...(options.headers || {}) },
    });
    let json = null;
    try { json = await res.json(); } catch { /* algunas respuestas vienen vacías (204) */ }
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: json };
  }
  const authMsg = (r, fallback) => clean((r.data && (r.data.msg || r.data.error_description || r.data.message)) || fallback, 200);

  return async function handler(event) {
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Método no permitido.' });
    if (!SUPABASE_URL || !KEY) return reply(500, { error: 'El servidor no tiene configurada la conexión con Supabase.' });
    const headers = event.headers || {};
    if (!originAllowed(headers, env)) return reply(403, { error: 'Origen no permitido.' });

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Cuerpo de la solicitud inválido.' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'Cuerpo de la solicitud inválido.' });

    const callerToken = String(headers.authorization || headers.Authorization || '').replace(/^Bearer\s+/i, '');
    if (!callerToken) return reply(401, { error: 'Falta la sesión.' });

    // 1) ¿El token de quien llama es válido y corresponde a alguien real?
    const callerRes = await doFetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: KEY, Authorization: 'Bearer ' + callerToken } });
    if (!callerRes.ok) return reply(401, { error: 'Sesión inválida o expirada.' });
    const callerUser = await callerRes.json();
    if (!callerUser || !UUID_RE.test(String(callerUser.id))) return reply(401, { error: 'Sesión inválida o expirada.' });

    // 2) ¿Es administrador activo? (se verifica aquí, no se confía en nada del navegador)
    const pc = await sb(`/rest/v1/profiles?id=eq.${callerUser.id}&select=roles,activo,usuario,nombre`);
    const caller = pc.ok && Array.isArray(pc.data) ? pc.data[0] : null;
    if (!(caller && caller.activo && Array.isArray(caller.roles) && caller.roles.includes('administrador'))) {
      return reply(403, { error: 'No tienes permiso para hacer esto.' });
    }
    const actorName = clean(caller.nombre || caller.usuario || 'Administración', 80);
    const audit = (action) => sb('/rest/v1/activity_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ actor: actorName, actor_id: callerUser.id, action: clean(action, 200) }) }).catch(() => null);

    // La cuenta principal (la administradora más antigua) solo la puede tocar ella misma.
    async function isProtected(targetId) {
      const first = await sb('/rest/v1/profiles?select=id&order=created_at.asc&limit=1');
      const firstId = first.ok && Array.isArray(first.data) && first.data[0] ? first.data[0].id : null;
      return !!firstId && firstId === targetId && callerUser.id !== targetId;
    }

    // 3) Ejecutar la acción pedida.
    try {
      if (body.action === 'create') {
        const usuario = clean(body.usuario, 200).toLowerCase(); // sin recortar: un usuario demasiado largo se rechaza, no se acorta en silencio
        const nombre = clean(body.nombre, 80);
        const roles = body.roles;
        if (!USUARIO_RE.test(usuario)) return reply(400, { error: 'El usuario debe tener entre 2 y 32 caracteres: letras sin tildes, números, espacio, punto, guion o guion bajo.' });
        if (!Array.isArray(roles) || roles.length === 0 || roles.length > ROLES.length || !roles.every((r) => ROLES.includes(r)) || new Set(roles).size !== roles.length) {
          return reply(400, { error: 'Los roles no son válidos.' });
        }
        const pwErr = validatePassword(body.clave);
        if (pwErr) return reply(400, { error: pwErr });

        const createRes = await sb('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: usuarioToEmail(usuario), password: body.clave, email_confirm: true }) });
        if (!createRes.ok || !createRes.data || !UUID_RE.test(String(createRes.data.id))) return reply(400, { error: authMsg(createRes, 'No se pudo crear la cuenta.') });

        const newUserId = createRes.data.id;
        const insertRes = await sb('/rest/v1/profiles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: newUserId, usuario, nombre, roles, activo: true, must_change_password: true }) });
        if (!insertRes.ok) {
          await sb(`/auth/v1/admin/users/${newUserId}`, { method: 'DELETE' }); // no dejamos huérfana la cuenta de Auth
          return reply(400, { error: 'No se pudo guardar el perfil del usuario.' });
        }
        await audit(`Creó al usuario: ${nombre || usuario}`);
        return reply(200, { id: newUserId });
      }

      if (body.action === 'delete') {
        const id = String(body.id || '');
        if (!UUID_RE.test(id)) return reply(400, { error: 'Falta el id del usuario o no es válido.' });
        if (id === callerUser.id) return reply(400, { error: 'No puedes eliminar tu propia cuenta.' });
        if (await isProtected(id)) return reply(403, { error: 'La cuenta principal está protegida.' });
        const target = await sb(`/rest/v1/profiles?id=eq.${id}&select=usuario,nombre`);
        const who = target.ok && Array.isArray(target.data) && target.data[0] ? (target.data[0].nombre || target.data[0].usuario) : id;
        const del = await sb(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
        if (!del.ok) return reply(400, { error: 'No se pudo eliminar.' });
        await audit(`Eliminó al usuario: ${who}`);
        return reply(200, { ok: true }); // el perfil se borra solo (on delete cascade)
      }

      if (body.action === 'reset-password') {
        const id = String(body.id || '');
        if (!UUID_RE.test(id)) return reply(400, { error: 'Falta el id del usuario o no es válido.' });
        const pwErr = validatePassword(body.nuevaClave);
        if (pwErr) return reply(400, { error: pwErr });
        if (await isProtected(id)) return reply(403, { error: 'La cuenta principal está protegida.' });

        const resetRes = await sb(`/auth/v1/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ password: body.nuevaClave }) });
        if (!resetRes.ok) return reply(400, { error: authMsg(resetRes, 'No se pudo cambiar la clave.') });
        const target = await sb(`/rest/v1/profiles?id=eq.${id}&select=usuario,nombre`);
        const who = target.ok && Array.isArray(target.data) && target.data[0] ? (target.data[0].nombre || target.data[0].usuario) : id;
        await audit(`Restableció la clave de: ${who}`);
        // Forzamos a que la persona la cambie apenas entre, igual que un usuario nuevo.
        const flag = await sb(`/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ must_change_password: true }) });
        if (!flag.ok) return reply(200, { ok: true, warning: 'Clave cambiada, pero no se pudo marcar el cambio obligatorio en el próximo login.' });
        return reply(200, { ok: true });
      }

      return reply(400, { error: 'Acción no reconocida.' });
    } catch (e) {
      return reply(500, { error: 'Error inesperado del servidor.' });
    }
  };
}

exports.makeHandler = makeHandler;
exports.handler = makeHandler({ fetch: (...a) => fetch(...a), env: process.env });
exports._internals = { ROLES, UUID_RE, USUARIO_RE, PASSWORD_MIN, usuarioToEmail, validatePassword, originAllowed };
