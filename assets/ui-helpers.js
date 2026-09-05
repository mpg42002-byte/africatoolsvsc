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
