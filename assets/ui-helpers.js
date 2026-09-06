/* ============================================================
   Africa Tools — helpers de UI compartidos entre módulos
   ============================================================
   Antes esta misma lógica estaba copiada y pegada por separado en
   cada uno de los 9 módulos (con pequeñas diferencias entre copias).
   Cargar este archivo evita que un fix futuro tenga que repetirse
   9 veces — y que se le olvide alguna.

   Un módulo lo usa agregando, antes de su <script> principal:
     <script src="../../assets/ui-helpers.js"></script>

   NOTA: esto es independiente de assets/offline-storage.js (cola de
   sincronización) y de assets/supabase-config.js (cliente Supabase);
   ninguno de los dos depende de este archivo ni al revés.
   ============================================================ */

/**
 * Escapa un valor para insertarlo de forma segura como TEXTO dentro de
 * HTML (uso típico: `div.innerHTML = \`<span>${escapeHtml(nombre)}</span>\``).
 * Escapa también comillas simples/dobles — no hace daño en un nodo de
 * texto (el navegador las muestra igual) y de paso lo hace seguro si
 * alguna vez ese mismo valor se reutiliza dentro de un atributo.
 */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * Escapa un valor para insertarlo dentro de un atributo HTML delimitado
 * por comillas dobles (ej. `value="${escapeAttr(x)}"`). A diferencia de
 * escapeHtml, no toca comillas simples — se usa junto con
 * `.replace(/'/g, "\\'")` para armar `onclick="fn('${...}')"` de forma
 * segura tanto para el HTML como para el string de JS embebido.
 */
function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Modal de confirmación propio (reemplaza el confirm() nativo del
 * navegador). Requiere que la página tenga este markup — cada módulo
 * que lo usa ya lo trae en su HTML:
 *
 *   <div id="af-confirm-backdrop" class="hidden">
 *     <div id="af-confirm-card">
 *       <h3 id="af-confirm-title">¿Confirmar acción?</h3>
 *       <p id="af-confirm-body"></p>
 *       <div id="af-confirm-actions">
 *         <button id="af-confirm-cancel">Cancelar</button>
 *         <button id="af-confirm-accept">Confirmar</button>
 *       </div>
 *     </div>
 *   </div>
 *
 * Uso: `if (!(await afConfirm('¿Eliminar esto?'))) return;`
 */
function afConfirm(title, body) {
  const backdrop = document.getElementById('af-confirm-backdrop');
  document.getElementById('af-confirm-title').textContent = title;
  document.getElementById('af-confirm-body').textContent = body || '';
  backdrop.classList.remove('hidden');
  return new Promise((resolve) => {
    const cancelBtn = document.getElementById('af-confirm-cancel');
    const acceptBtn = document.getElementById('af-confirm-accept');
    const cleanup = (result) => {
      backdrop.classList.add('hidden');
      cancelBtn.removeEventListener('click', onCancel);
      acceptBtn.removeEventListener('click', onAccept);
      resolve(result);
    };
    const onCancel = () => cleanup(false);
    const onAccept = () => cleanup(true);
    cancelBtn.addEventListener('click', onCancel);
    acceptBtn.addEventListener('click', onAccept);
  });
}

/**
 * Segunda capa de protección de cada módulo — la primera es que el shell
 * no lo muestre en el menú si el rol no tiene acceso; esta evita que
 * alguien que llegue directo a la URL del módulo (sin pasar por el menú)
 * igual pueda ver o usar el contenido.
 *
 * Requiere que la página cargue, ANTES que este archivo:
 *   <script src="../../assets/supabase-config.js"></script>
 *   <script src="../../assets/permissions.js"></script>
 * y tener en el <head> (idealmente como la primera regla del <style>):
 *   body{visibility:hidden}
 * — así no hay ni un parpadeo del contenido real antes de que se resuelva
 * el chequeo.
 *
 * Uso, como primera línea del init() del módulo:
 *   const gate = await gateModuleAccess('bitacora');
 *   if (!gate.allowed) return;
 *   // seguir con currentUserId = gate.userId, etc.
 *
 * Devuelve { allowed, roles, userId, nombre }.
 */
const LAST_PROFILE_KEY = 'africa_tools_last_profile';

async function gateModuleAccess(moduleKey) {
  let roles = [], userId = null, nombre = '', usuario = '', fromCache = false;
  try {
    const { data } = await supabaseClient.auth.getSession();
    const authUid = data && data.session ? data.session.user.id : null;
    if (authUid) {
      userId = authUid;
      try {
        const { data: profile, error } = await supabaseClient.from('profiles').select('nombre, usuario, roles').eq('id', authUid).maybeSingle();
        if (error) throw error;
        if (profile) { nombre = profile.nombre || ''; usuario = profile.usuario || ''; roles = profile.roles || []; }
        // Se confirmó el rol con éxito — se guarda como "el último permiso
        // confirmado", para poder seguir trabajando si más tarde no hay
        // internet al abrir un módulo.
        try { localStorage.setItem(LAST_PROFILE_KEY, JSON.stringify({ userId, nombre, usuario, roles })); } catch (e) {}
      } catch (profileErr) {
        // Hay sesión, pero no se pudo consultar el rol (sin internet,
        // Supabase caído, etc.) — se usa el último permiso confirmado que
        // haya quedado guardado, y solo si es de esta misma persona (si
        // otra persona usó este dispositivo después, no aplica).
        fromCache = true;
        try {
          const cached = JSON.parse(localStorage.getItem(LAST_PROFILE_KEY) || 'null');
          if (cached && cached.userId === authUid) {
            nombre = cached.nombre || ''; usuario = cached.usuario || ''; roles = cached.roles || [];
          }
        } catch (e) {}
      }
    }
    // Sin sesión en absoluto (nunca inició sesión o la cerró): no hay
    // permiso que valga ni caché que usar — se trata como sin acceso.
  } catch (e) { /* no se pudo ni confirmar la sesión: se trata como sin acceso */ }

  const permitted = (typeof resolvePermittedModules === 'function') ? resolvePermittedModules(roles) : [];
  const allowed = permitted.includes(moduleKey);

  if (!allowed) {
    const overlay = document.createElement('div');
    overlay.id = 'af-access-denied-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:var(--bg-body,#EDE0C8);padding:20px;';
    overlay.innerHTML = `
      <div style="max-width:420px;text-align:center;padding:30px 24px;background:var(--card-bg,#fff);border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,.15);">
        <span style="font-size:40px;display:block;margin-bottom:14px;">🔒</span>
        <h2 style="font-family:var(--font-heading,inherit);color:var(--text-card,#333);margin:0 0 8px;">No tienes acceso a este módulo</h2>
        <p style="margin:0;color:var(--text-muted,#777);font-size:14px;">Si crees que esto es un error, contacta a un administrador.</p>
      </div>`;
    document.body.appendChild(overlay);
  }
  document.body.style.visibility = 'visible';
  return { allowed, roles, userId, nombre, usuario, fromCache };
}
