/* AFRICA TOOLS · OFFLINE-STORAGE.JS ·
   Capa compartida de guardado offline-first para los módulos con datos en
   Supabase. Cada guardado:
   1. Se escribe primero en este dispositivo (IndexedDB) — instantáneo,
      la pantalla nunca espera a internet.
   2. Se intenta subir a Supabase de inmediato si hay conexión.
   3. Si no hay conexión (o falla), queda en una cola pendiente que se
      reintenta sola apenas vuelva la señal (evento 'online') o cada 30s.

   Se carga con <script src="../../assets/offline-storage.js"></script>
   DESPUÉS de supabase-config.js en cada módulo que lo use. Expone un
   único objeto global: OfflineStorage.

   get/set aceptan un último parámetro `shared` (por defecto false):
   - false (o sin pasarlo) → dato PRIVADO por persona, en `module_data`
     (llave user_id+module+key). Así funciona Día a Día.
   - true → dato COMPARTIDO entre todo el equipo con acceso al módulo, en
     `module_data_shared` (llave module+key, sin user_id). Así funciona
     Limpieza, Folders, Habladores Winner, Wow Tablero y Wow Calificación.
*/
const OfflineStorage = (function () {
  const DB_NAME = 'africa-tools-offline';
  const DB_VERSION = 2;
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        // v2: respaldo de pendientes viejos que no tenían dueño (ver migrateLegacy)
        if (!db.objectStoreNames.contains('legacy_backup')) db.createObjectStore('legacy_backup', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => { const db = req.result; migrateLegacy(db).then(() => resolve(db), () => resolve(db)); };
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  // La caché y la cola pertenecen a UNA persona (uid): en un celular compartido, lo que guardó A
  // nunca se lee ni se sube como si fuera de B. Los datos compartidos del equipo también se
  // guardan por uid (cada quien tiene su copia local).
  function cacheId(uid, shared, module, key) { return uid + '::' + (shared ? 'shared' : 'private') + '::' + module + '::' + key; }

  // Migración única v1 → v2. Los pendientes y la caché viejos NO tienen dueño, así que no se
  // pueden atribuir a nadie con seguridad: se guardan en 'legacy_backup' (descargables con
  // OfflineStorage.exportLegacyBackup) y se retiran de la cola; la caché vieja se descarta
  // (se vuelve a bajar del servidor).
  function migrateLegacy(db) {
    return new Promise((resolve) => {
      const tx = db.transaction(['queue', 'cache', 'legacy_backup'], 'readwrite');
      const q = tx.objectStore('queue'), c = tx.objectStore('cache'), b = tx.objectStore('legacy_backup');
      const rq = q.getAll();
      rq.onsuccess = () => {
        const orphans = (rq.result || []).filter((it) => !it.uid);
        if (orphans.length) {
          b.add({ at: new Date().toISOString(), items: orphans });
          orphans.forEach((it) => q.delete(it.id));
          console.warn('[OfflineStorage] ' + orphans.length + ' cambio(s) pendiente(s) sin dueño se guardaron en un respaldo. Usa OfflineStorage.exportLegacyBackup().');
        }
      };
      const rc = c.getAll();
      rc.onsuccess = () => { (rc.result || []).filter((e) => !e.uid).forEach((e) => c.delete(e.id)); };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  }

  async function cacheGetRec(uid, shared, module, key) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('cache', 'readonly');
      const req = tx.objectStore('cache').get(cacheId(uid, shared, module, key));
      req.onsuccess = () => resolve(req.result || undefined);
      req.onerror = () => resolve(undefined);
    });
  }
  async function cacheGet(uid, shared, module, key) {
    const rec = await cacheGetRec(uid, shared, module, key);
    return rec ? rec.value : undefined;
  }

  // `base` (solo datos compartidos) = la "hora de versión" del servidor sobre la que está basada esta copia
  // (string tal cual la devolvió el servidor, o null si el dato no existía). undefined = conservar la que había.
  async function cachePut(uid, shared, module, key, value, base) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('cache', 'readwrite');
      const st = tx.objectStore('cache');
      const id = cacheId(uid, shared, module, key);
      const rq = st.get(id);
      rq.onsuccess = () => {
        const prev = rq.result;
        const rec = { id, uid, shared: !!shared, module, key, value, updatedAt: Date.now() };
        const b = base !== undefined ? base : (prev ? prev.base : undefined);
        if (b !== undefined) rec.base = b;
        st.put(rec);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
  async function cacheSetBase(uid, shared, module, key, base) {
    const rec = await cacheGetRec(uid, shared, module, key);
    if (rec) await cachePut(uid, shared, module, key, rec.value, base);
  }

  // La cola se COALESCE por (uid, módulo, clave, shared): solo importa el último valor de cada dato,
  // no una pila de versiones viejas que luego se reenvían en orden.
  // `extra` (solo datos compartidos): { base, baseValue, conflict } — la versión del servidor sobre la que se editó,
  // el valor que había entonces (para poder combinar sin revivir cosas borradas) y el choque si ya se detectó.
  // Al coalescer se CONSERVA la base original: es la versión sobre la que partió la primera edición pendiente.
  async function queueAdd(uid, module, key, value, shared, extra) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('queue', 'readwrite');
      const st = tx.objectStore('queue');
      const rq = st.getAll();
      rq.onsuccess = () => {
        const olds = (rq.result || []).filter((it) => sameSlot(it, uid, module, key, shared));
        const prev = olds[0];
        olds.forEach((it) => st.delete(it.id));
        const item = { uid, module, key, value, shared: !!shared, updatedAt: Date.now() };
        if (shared) {
          const e = extra || {};
          item.base = prev && prev.base !== undefined ? prev.base : (e.base !== undefined ? e.base : null);
          const bv = prev && 'baseValue' in prev ? prev.baseValue : e.baseValue;
          if (bv !== undefined) item.baseValue = bv;
          const c = (prev && prev.conflict) || e.conflict;
          if (c) item.conflict = c;
        }
        st.add(item);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  // Solo actualiza si el pendiente SIGUE existiendo (otro proceso pudo haberlo subido y borrado entretanto).
  async function queueUpdate(item) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('queue', 'readwrite');
      const st = tx.objectStore('queue');
      const rq = st.get(item.id);
      rq.onsuccess = () => { if (rq.result) st.put(item); };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  function sameSlot(it, uid, module, key, shared) {
    return it.uid === uid && it.module === module && it.key === key && !!it.shared === !!shared;
  }

  // Borra lo pendiente de un dato (ya hay una versión más nueva en el servidor).
  async function queueClearSlot(uid, module, key, shared) {
    const items = (await queueAll()).filter((it) => sameSlot(it, uid, module, key, shared));
    for (const it of items) await queueRemove(it.id);
  }

  async function queueAll() {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('queue', 'readonly');
      const req = tx.objectStore('queue').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async function queueRemove(id) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('queue', 'readwrite');
      tx.objectStore('queue').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  // Cuenta solo los pendientes de la persona con sesión (los de otras cuentas no son suyos).
  async function queueCount() {
    const uid = await getCurrentUserId();
    if (!uid) return 0;
    return (await queueAll()).filter((it) => it.uid === uid).length;
  }

  // Descarga un JSON con los pendientes viejos que no se pudieron atribuir a nadie (migración v2).
  async function exportLegacyBackup() {
    const db = await openDB();
    const rows = await new Promise((resolve) => {
      const req = db.transaction('legacy_backup', 'readonly').objectStore('legacy_backup').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    if (!rows.length) return 0;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'africa-tools-pendientes-viejos-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return rows.reduce((n, r) => n + r.items.length, 0);
  }

  async function getCurrentUserId() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      return data && data.session ? data.session.user.id : null;
    } catch (e) { return null; }
  }

  // ---------- Combinar (3 vías) ----------
  // Une "lo mío" con "lo del servidor" usando como referencia lo que había cuando empecé a editar (`base`):
  // lo que yo no toqué se queda como lo dejó el otro; lo que el otro no tocó se queda como lo dejé yo; y lo
  // BORRADO por cualquiera de los dos NO revive. Si los dos cambiaron lo mismo de forma distinta, gana lo mío.
  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  function itemKey(x) { return isObj(x) && x.id !== undefined && x.id !== null ? 'id:' + x.id : 'j:' + JSON.stringify(x); }

  function merge3(base, server, mine) {
    if (deepEqual(mine, base)) return server;           // yo no cambié nada
    if (deepEqual(server, base)) return mine;           // el otro no cambió nada
    if (deepEqual(server, mine)) return mine;
    if (Array.isArray(server) && Array.isArray(mine)) return mergeArrays(Array.isArray(base) ? base : [], server, mine);
    if (isObj(server) && isObj(mine)) {
      const b = isObj(base) ? base : {};
      const out = {};
      new Set([...Object.keys(server), ...Object.keys(mine), ...Object.keys(b)]).forEach((k) => {
        const inS = k in server, inM = k in mine, inB = k in b;
        if (inS && inM) out[k] = merge3(b[k], server[k], mine[k]);
        else if (inS && !inM) { if (!(inB && deepEqual(server[k], b[k]))) out[k] = server[k]; }   // yo lo borré (si el otro lo editó, gana su edición)
        else if (!inS && inM) { if (!(inB && deepEqual(mine[k], b[k]))) out[k] = mine[k]; }       // el otro lo borró (si yo lo edité, gana mi edición)
      });
      return out;
    }
    return mine;
  }
  function mergeArrays(base, server, mine) {
    const bm = new Map(base.map((x) => [itemKey(x), x]));
    const mm = new Map(mine.map((x) => [itemKey(x), x]));
    const sm = new Map(server.map((x) => [itemKey(x), x]));
    const out = [];
    server.forEach((sx) => {
      const k = itemKey(sx);
      if (mm.has(k)) out.push(deepEqual(mm.get(k), bm.get(k)) ? sx : (bm.has(k) ? merge3(bm.get(k), sx, mm.get(k)) : mm.get(k)));
      else if (bm.has(k)) { if (!deepEqual(sx, bm.get(k))) out.push(sx); }  // yo lo quité (si el otro lo editó, se queda)
      else out.push(sx);                                                    // lo agregó el otro
    });
    mine.forEach((mx) => {
      const k = itemKey(mx);
      if (sm.has(k)) return;
      if (!bm.has(k)) out.push(mx);                                         // lo agregué yo
      else if (!deepEqual(mx, bm.get(k))) out.push(mx);                     // el otro lo quitó pero yo lo había editado
    });
    return out;
  }

  // ---------- Guardado con control de versión (datos compartidos) ----------
  // Llama a la función SQL save_shared (sql/2026-10-25-F2b-save-shared.sql). Devuelve:
  //   {kind:'ok', updatedAt} · {kind:'conflict', serverValue, serverUpdatedAt} · {kind:'missing'} · {kind:'error'}
  // 'missing' = el SQL todavía no se corrió en Supabase: se guarda como antes (sin control de versión) para no romper nada.
  async function saveShared(module, key, value, base) {
    try {
      const { data, error } = await supabaseClient.rpc('save_shared', { p_module: module, p_key: key, p_value: value, p_base_updated_at: base === undefined ? null : base });
      if (error) {
        const msg = String(error.message || '') + ' ' + String(error.code || '');
        if (/PGRST202|42883|Could not find the function|schema cache/i.test(msg) || error.status === 404) return { kind: 'missing' };
        return { kind: 'error' };
      }
      if (data && data.ok) return { kind: 'ok', updatedAt: data.updated_at };
      if (data && data.conflict) return { kind: 'conflict', serverValue: data.server_value, serverUpdatedAt: data.server_updated_at, serverUpdatedBy: data.server_updated_by };
      return { kind: 'error' };
    } catch (e) { return { kind: 'error' }; }
  }
  async function legacyUpsertShared(uid, module, key, value) {
    console.warn('[OfflineStorage] save_shared no existe en Supabase: guardando sin control de versión. Corre sql/2026-10-25-F2b-save-shared.sql.');
    const { error } = await supabaseClient.from('module_data_shared').upsert({ module, key, value, updated_by: uid, updated_at: new Date().toISOString() });
    return !error;
  }

  // Un choque se avisa UNA vez por dato y por carga de página; ui-helpers.js (AfricaConflict) muestra la pregunta.
  const announced = new Set();
  function announceConflict(item) {
    const id = item.module + '::' + item.key;
    if (announced.has(id) || !item.conflict) return;
    announced.add(id);
    window.dispatchEvent(new CustomEvent('offline-storage:conflict', { detail: {
      module: item.module, key: item.key, mine: item.value, server: item.conflict.serverValue,
      serverUpdatedAt: item.conflict.serverUpdatedAt, base: item.baseValue
    } }));
  }

  // Lee un dato. Si hay conexión, trae la versión más reciente de Supabase
  // y de paso refresca la copia local. Si no hay conexión (o Supabase
  // falla), usa la última copia guardada en este dispositivo.
  async function get(module, key, def, shared) {
    const uid = await getCurrentUserId();
    if (!uid) return def;
    // Si hay cambios propios sin subir de ESTE dato, primero se intentan subir; si aún no se puede,
    // lo que vale es lo que la persona escribió (lo encolado), no la copia vieja del servidor.
    let pending = (await queueAll()).find((it) => sameSlot(it, uid, module, key, shared));
    if (pending && navigator.onLine) {
      await syncQueue();
      pending = (await queueAll()).find((it) => sameSlot(it, uid, module, key, shared));
    }
    if (pending) {
      await cachePut(uid, shared, module, key, pending.value);
      if (pending.conflict) setTimeout(() => announceConflict(pending), 0);
      return pending.value;
    }
    if (navigator.onLine) {
      try {
        let query = supabaseClient.from(shared ? 'module_data_shared' : 'module_data').select(shared ? 'value,updated_at' : 'value').eq('module', module).eq('key', key);
        if (!shared) query = query.eq('user_id', uid);
        const { data, error } = await query.maybeSingle();
        if (!error) {
          const value = data ? data.value : def;
          // Se recuerda la versión del servidor: es la "base" de lo que la persona edite a partir de aquí.
          await cachePut(uid, shared, module, key, value, shared ? (data ? data.updated_at : null) : undefined);
          return value;
        }
      } catch (e) { /* sin conexión real o falla de red: sigue con la copia local */ }
    }
    const cached = await cacheGet(uid, shared, module, key);
    return cached !== undefined ? cached : def;
  }

  // Guarda un dato. Se escribe local de inmediato (nunca espera a la red);
  // si hay conexión intenta subirlo ya mismo, y si no puede, lo deja en la
  // cola para reintentar después.
  async function set(module, key, value, shared) {
    const uid = await getCurrentUserId();
    if (!uid) return; // sin sesión no hay dueño: no se guarda ni en caché ni en cola
    const rec = await cacheGetRec(uid, shared, module, key);
    const pending = (await queueAll()).find((it) => sameSlot(it, uid, module, key, shared));
    await cachePut(uid, shared, module, key, value);

    if (!shared) {
      if (navigator.onLine) {
        try {
          const row = { user_id: uid, module, key, value, updated_at: new Date().toISOString() };
          const { error } = await supabaseClient.from('module_data').upsert(row);
          if (!error) { await queueClearSlot(uid, module, key, shared); notifyQueueChange(); return; }
        } catch (e) { /* cae a la cola pendiente */ }
      }
      await queueAdd(uid, module, key, value, shared);
      notifyQueueChange();
      return;
    }

    // Compartido: se parte de la versión sobre la que la persona empezó a editar.
    const extra = {
      base: pending ? pending.base : (rec && rec.base !== undefined ? rec.base : null),
      baseValue: pending && 'baseValue' in pending ? pending.baseValue : (rec ? rec.value : undefined)
    };
    if (pending && pending.conflict) { await queueAdd(uid, module, key, value, shared, extra); notifyQueueChange(); return; } // choque sin resolver: no se sube nada
    if (navigator.onLine) {
      const r = await saveShared(module, key, value, extra.base);
      if (r.kind === 'ok') { await cachePut(uid, shared, module, key, value, r.updatedAt); await queueClearSlot(uid, module, key, shared); notifyQueueChange(); return; }
      if (r.kind === 'conflict') {
        await queueAdd(uid, module, key, value, shared, { ...extra, conflict: { serverValue: r.serverValue, serverUpdatedAt: r.serverUpdatedAt } });
        notifyQueueChange();
        announceConflict((await queueAll()).find((it) => sameSlot(it, uid, module, key, shared)));
        return;
      }
      if (r.kind === 'missing' && await legacyUpsertShared(uid, module, key, value)) { await queueClearSlot(uid, module, key, shared); notifyQueueChange(); return; }
    }
    await queueAdd(uid, module, key, value, shared, extra);
    notifyQueueChange();
  }

  // Reintenta subir todo lo que quedó pendiente. Se llama sola al volver
  // la conexión y cada 30 segundos como respaldo.
  // Una sola sincronización a la vez: el evento 'online', el reloj de 30 s y get() pueden llamarla al mismo tiempo,
  // y dos subidas simultáneas del mismo dato se verían entre sí como un choque falso.
  let syncing = null;
  function syncQueue() {
    if (syncing) return syncing;
    syncing = syncQueueOnce().finally(() => { syncing = null; });
    return syncing;
  }
  async function syncQueueOnce() {
    if (!navigator.onLine) return;
    const uid = await getCurrentUserId();
    if (!uid) return;
    // Solo se suben los pendientes de ESTA persona; los de otras cuentas esperan a que ellas inicien sesión.
    const items = (await queueAll()).filter((it) => it.uid === uid);
    for (const item of items) {
      try {
        // Si mientras tanto la persona guardó algo más nuevo de este dato, este pendiente ya no vale.
        const fresh = (await queueAll()).find((it) => it.id === item.id);
        if (!fresh || fresh.updatedAt !== item.updatedAt) continue;
        if (!item.shared) {
          const row = { user_id: item.uid, module: item.module, key: item.key, value: item.value, updated_at: new Date(item.updatedAt).toISOString() };
          const { error } = await supabaseClient.from('module_data').upsert(row);
          if (!error) await queueRemove(item.id);
          continue;
        }
        if (item.conflict) { announceConflict(item); continue; } // espera a que la persona decida
        const r = await saveShared(item.module, item.key, item.value, item.base === undefined ? null : item.base);
        if (r.kind === 'ok') {
          const now = (await queueAll()).find((it) => sameSlot(it, item.uid, item.module, item.key, true));
          if (now && now.id !== item.id) { now.base = r.updatedAt; now.baseValue = item.value; await queueUpdate(now); } // edición más nueva: parte de lo que acabo de subir
          else await queueRemove(item.id);
          await cacheSetBase(item.uid, true, item.module, item.key, r.updatedAt);
        } else if (r.kind === 'conflict') {
          item.conflict = { serverValue: r.serverValue, serverUpdatedAt: r.serverUpdatedAt };
          await queueUpdate(item);
          announceConflict(item);
        } else if (r.kind === 'missing') {
          if (await legacyUpsertShared(item.uid, item.module, item.key, item.value)) await queueRemove(item.id);
        }
      } catch (e) { /* se reintenta en el próximo ciclo */ }
    }
    notifyQueueChange();
  }

  // La persona decidió qué hacer con un choque: 'mine' (conservar lo mío) · 'server' (usar lo del servidor) ·
  // 'merge' (combinar). Devuelve { ok, value } con el valor que quedó vigente.
  async function resolveConflict(module, key, choice) {
    const uid = await getCurrentUserId();
    if (!uid) return { ok: false };
    const item = (await queueAll()).find((it) => sameSlot(it, uid, module, key, true) && it.conflict);
    if (!item) return { ok: false };
    announced.delete(module + '::' + key);
    const { serverValue, serverUpdatedAt } = item.conflict;
    if (choice === 'server') {
      await queueRemove(item.id);
      await cachePut(uid, true, module, key, serverValue, serverUpdatedAt);
      notifyQueueChange();
      return { ok: true, value: serverValue };
    }
    const value = choice === 'merge' ? merge3(item.baseValue, serverValue, item.value) : item.value;
    item.value = value;
    item.base = serverUpdatedAt;
    item.baseValue = serverValue;
    item.updatedAt = Date.now();
    delete item.conflict;
    await queueUpdate(item);
    await cachePut(uid, true, module, key, value);
    await syncQueue();
    return { ok: true, value };
  }

  // Avisa cuántos cambios quedan pendientes de subir — al propio módulo
  // (evento) y al shell si estamos dentro de un iframe (postMessage), para
  // que el indicador de conexión pueda mostrar "N cambios pendientes".
  function notifyQueueChange() {
    queueCount().then((n) => {
      window.dispatchEvent(new CustomEvent('offline-queue-change', { detail: { count: n } }));
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'africa-tools-queue-count', count: n }, '*');
      }
    });
  }

  window.addEventListener('online', syncQueue);
  setInterval(syncQueue, 30000);
  // Avisa el conteo inicial apenas carga (por si ya había algo pendiente
  // de una sesión anterior sin conexión).
  notifyQueueChange();

  return { get, set, syncQueue, queueCount, exportLegacyBackup, resolveConflict, merge3 };
})();
