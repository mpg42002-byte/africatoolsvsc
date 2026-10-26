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

/* ============================================================
   Actividad hacia el shell (cierre por inactividad)
   ============================================================
   Dentro del <iframe> los clics/teclas no llegan al documento del shell, así que sin esto el shell
   creía que la persona estaba inactiva y la sacaba a los 30 min aunque estuviera trabajando.
   Aviso con throttle de 10 s; solo hacia el mismo origen. Un módulo con un formulario a medias puede
   llamar AfricaActivity.setDirty(true/false) para que el shell no cierre la sesión sin avisar. */
(function () {
  if (window.parent === window) return; // módulo abierto suelto, sin shell
  let last = 0;
  function ping() {
    const now = Date.now();
    if (now - last < 10000) return;
    last = now;
    try { window.parent.postMessage({ type: 'africa-tools-activity' }, location.origin); } catch (e) { /* sin shell */ }
  }
  ['click', 'keydown', 'touchstart', 'scroll', 'mousemove', 'input'].forEach((evt) =>
    document.addEventListener(evt, ping, { passive: true, capture: true })
  );
  window.AfricaActivity = {
    setDirty(flag) { try { window.parent.postMessage({ type: 'africa-tools-dirty', dirty: !!flag }, location.origin); } catch (e) { /* sin shell */ } }
  };
})();

/* ============================================================
   Choque de edición (dos personas cambiaron el mismo dato)
   ============================================================
   assets/offline-storage.js avisa con el evento 'offline-storage:conflict' cuando, al guardar un dato compartido
   del equipo, el servidor ya tiene una versión más nueva hecha por alguien más. Aquí se le pregunta a la persona
   qué hacer. Requiere que el módulo cargue offline-storage.js (si no, no hay nada que preguntar). */
(function () {
  const NOMBRES = { limpieza: 'Limpieza', 'wow-tablero': 'Wow Tablero', 'wow-calificacion': 'Wow Calificación', folders: 'Marcación de folders', habladores: 'Habladores Winner' };
  const fila = [];
  let abierto = false;

  function siguiente() {
    if (abierto || !fila.length) return;
    abierto = true;
    const d = fila.shift();
    const back = document.createElement('div');
    back.id = 'af-conflict-modal';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-labelledby', 'af-conflict-title');
    back.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    const card = document.createElement('div');
    card.style.cssText = 'background:#3b2a1a;color:#fff;border:2px solid #f5a623;border-radius:16px;padding:20px;max-width:440px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 12px 32px rgba(0,0,0,.45)';
    const h = document.createElement('h2');
    h.id = 'af-conflict-title';
    h.style.cssText = 'margin:0 0 8px;font-size:18px';
    h.textContent = 'Alguien más cambió esto mientras editabas';
    const p = document.createElement('p');
    p.style.cssText = 'margin:0 0 16px;font-size:14px;line-height:1.45;opacity:.92';
    p.textContent = `En ${NOMBRES[d.module] || d.module} otra persona guardó cambios antes que tú. Elige qué hacer con lo que escribiste:`;
    card.append(h, p);
    const OPC = [
      ['merge', 'Combinar', 'Junta tus cambios con los de la otra persona. Lo que alguno borró no reaparece.'],
      ['mine', 'Conservar lo mío', 'Reemplaza lo de la otra persona por lo que tú escribiste.'],
      ['server', 'Usar lo del servidor', 'Descarta tus cambios y deja lo que guardó la otra persona.']
    ];
    OPC.forEach(([choice, label, help], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.choice = choice;
      b.style.cssText = `display:block;width:100%;min-height:44px;margin:0 0 10px;padding:10px 14px;border-radius:12px;border:2px solid #f5a623;text-align:left;cursor:pointer;font:inherit;${i === 0 ? 'background:#f5a623;color:#2b1a0a' : 'background:transparent;color:#fff'}`;
      const t = document.createElement('strong'); t.textContent = label;
      const s = document.createElement('span'); s.style.cssText = 'display:block;font-size:12.5px;opacity:.85;margin-top:2px'; s.textContent = help;
      b.append(t, s);
      b.addEventListener('click', async () => {
        card.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        let r = { ok: false };
        try { r = await OfflineStorage.resolveConflict(d.module, d.key, choice); } catch (e) { /* se vuelve a preguntar en la próxima carga */ }
        back.remove(); abierto = false;
        // Con 'combinar' o 'servidor' lo que muestra la pantalla cambió: se recarga el módulo para verlo al día.
        if (r.ok && choice !== 'mine') location.reload(); else siguiente();
      });
      card.appendChild(b);
    });
    back.appendChild(card);
    document.body.appendChild(back);
    card.querySelector('button').focus();
  }

  window.addEventListener('offline-storage:conflict', (e) => { fila.push(e.detail); siguiente(); });
})();
