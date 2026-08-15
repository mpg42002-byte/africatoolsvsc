// AFRICA TOOLS · netlify/functions/manage-user.js
//
// Esta función corre en el servidor de Netlify, nunca en el navegador de
// nadie. Es la única pieza del proyecto autorizada a usar la llave
// "service_role" de Supabase — la que puede crear o eliminar cuentas de
// otras personas. Esa llave vive en una variable de entorno de Netlify
// (SUPABASE_SERVICE_ROLE_KEY), nunca en el código ni en el repositorio.
//
// Antes de hacer nada, verifica con el token de quien llama que sea
// realmente un administrador activo — sin esto, cualquiera podría llamar
// esta función directamente (sin pasar por el panel) y crear cuentas.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Falta la sesión.' }) };
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) ¿El token es válido y corresponde a alguien real?
  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerData || !callerData.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Sesión inválida o expirada.' }) };
  }

  // 2) ¿Esa persona es administrador activo? (se verifica en el servidor,
  //    no se confía en nada que venga del navegador para esto)
  const { data: callerProfile, error: profileError } = await admin
    .from('profiles')
    .select('roles, activo')
    .eq('id', callerData.user.id)
    .single();
  const isAdmin = !profileError && callerProfile && callerProfile.activo &&
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
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: clave,
        email_confirm: true, // no hay flujo público de registro, así que se confirma directo
      });
      if (createError || !created || !created.user) {
        const msg = (createError && createError.message) || 'No se pudo crear la cuenta.';
        return { statusCode: 400, body: JSON.stringify({ error: msg }) };
      }
      const { error: insertError } = await admin.from('profiles').insert({
        id: created.user.id,
        usuario,
        nombre: nombre || '',
        roles,
        activo: true,
        must_change_password: true,
      });
      if (insertError) {
        // Si el perfil no se pudo crear, no dejamos huérfana la cuenta de Auth.
        await admin.auth.admin.deleteUser(created.user.id);
        return { statusCode: 400, body: JSON.stringify({ error: 'No se pudo guardar el perfil del usuario.' }) };
      }
      return { statusCode: 200, body: JSON.stringify({ id: created.user.id }) };
    }

    if (body.action === 'delete') {
      const { id } = body;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta el id del usuario.' }) };
      if (id === callerData.user.id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No puedes eliminar tu propia cuenta.' }) };
      }
      const { error: deleteError } = await admin.auth.admin.deleteUser(id);
      if (deleteError) {
        return { statusCode: 400, body: JSON.stringify({ error: deleteError.message || 'No se pudo eliminar.' }) };
      }
      // La fila en profiles se borra sola (on delete cascade).
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Acción no reconocida.' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error inesperado del servidor.' }) };
  }
};
