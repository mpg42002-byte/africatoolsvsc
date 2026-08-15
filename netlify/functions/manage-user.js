// AFRICA TOOLS · netlify/functions/manage-user.js
//
// Esta función corre en el servidor de Netlify, nunca en el navegador de
// nadie. Es la única pieza del proyecto autorizada a usar la llave
// "service_role" de Supabase — la que puede crear o eliminar cuentas de
// otras personas. Esa llave vive en una variable de entorno de Netlify
// (SUPABASE_SERVICE_ROLE_KEY), nunca en el código ni en el repositorio.
//
// Habla con Supabase directo por fetch (sin ninguna librería externa) para
// no depender de que Netlify instale paquetes dentro de netlify/functions.
//
// Antes de hacer nada, verifica con el token de quien llama que sea
// realmente un administrador activo — sin esto, cualquiera podría llamar
// esta función directamente (sin pasar por el panel) y crear cuentas.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseFetch(path, options = {}) {
  const res = await fetch(SUPABASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      ...(options.headers || {}),
    },
  });
  let json = null;
  try { json = await res.json(); } catch { /* algunas respuestas vienen vacías (204) */ }
  return { ok: res.status >= 200 && res.status < 300, status: res.status, data: json };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido.' }) };
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'El servidor no tiene configurada la conexión con Supabase.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cuerpo de la solicitud inválido.' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const callerToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!callerToken) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Falta la sesión.' }) };
  }

  // 1) ¿El token de quien llama es válido y corresponde a alguien real?
  const callerRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + callerToken,
    },
  });
  if (!callerRes.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Sesión inválida o expirada.' }) };
  }
  const callerUser = await callerRes.json();

  // 2) ¿Esa persona es administrador activo? (se verifica en el servidor,
  //    no se confía en nada que venga del navegador para esto)
  const profileCheck = await supabaseFetch(
    `/rest/v1/profiles?id=eq.${callerUser.id}&select=roles,activo`
  );
  const callerProfile = profileCheck.ok && Array.isArray(profileCheck.data) ? profileCheck.data[0] : null;
  const isAdmin = callerProfile && callerProfile.activo &&
    Array.isArray(callerProfile.roles) && callerProfile.roles.includes('administrador');
  if (!isAdmin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'No tienes permiso para hacer esto.' }) };
  }

  // 3) Ejecutar la acción pedida.
  try {
    if (body.action === 'create') {
      const { email, usuario, nombre, clave, roles } = body;
      if (!email || !usuario || !clave || !Array.isArray(roles) || roles.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos para crear el usuario.' }) };
      }

      const createRes = await supabaseFetch('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password: clave, email_confirm: true }),
      });
      if (!createRes.ok || !createRes.data || !createRes.data.id) {
        const msg = (createRes.data && (createRes.data.msg || createRes.data.error_description)) || 'No se pudo crear la cuenta.';
        return { statusCode: 400, body: JSON.stringify({ error: msg }) };
      }

      const newUserId = createRes.data.id;
      const insertRes = await supabaseFetch('/rest/v1/profiles', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          id: newUserId,
          usuario,
          nombre: nombre || '',
          roles,
          activo: true,
          must_change_password: true,
        }),
      });
      if (!insertRes.ok) {
        // Si el perfil no se pudo crear, no dejamos huérfana la cuenta de Auth.
        await supabaseFetch(`/auth/v1/admin/users/${newUserId}`, { method: 'DELETE' });
        return { statusCode: 400, body: JSON.stringify({ error: 'No se pudo guardar el perfil del usuario.' }) };
      }
      return { statusCode: 200, body: JSON.stringify({ id: newUserId }) };
    }

    if (body.action === 'delete') {
      const { id } = body;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta el id del usuario.' }) };
      if (id === callerUser.id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No puedes eliminar tu propia cuenta.' }) };
      }
      const deleteRes = await supabaseFetch(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
      if (!deleteRes.ok) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No se pudo eliminar.' }) };
      }
      // La fila en profiles se borra sola (on delete cascade).
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Acción no reconocida.' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error inesperado del servidor.' }) };
  }
};
