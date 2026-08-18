/* AFRICA TOOLS · OFFLINE-STORAGE.JS ·
   Capa compartida de guardado offline-first para los módulos con datos en
   Supabase (Limpieza, Líder de Seguridad, Wow Tablero). Cada guardado:
   1. Se escribe primero en este dispositivo (IndexedDB) — instantáneo,
      la pantalla nunca espera a internet.
   2. Se intenta subir a Supabase de inmediato si hay conexión.
   3. Si no hay conexión (o falla), queda en una cola pendiente que se
      reintenta sola apenas vuelva la señal (evento 'online') o cada 30s.

   Se carga con <script src="../../assets/offline-storage.js"></script>
   DESPUÉS de supabase-config.js en cada módulo que lo use. Expone un
   único objeto global: OfflineStorage.
*/
const OfflineStorage = (function () {
  const DB_NAME = 'africa-tools-offline';
  const DB_VERSION = 1;
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function cacheId(module, key) { return module + '::' + key; }

  async function cacheGet(module, key) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('cache', 'readonly');
      const req = tx.objectStore('cache').get(cacheId(module, key));
      req.onsuccess = () => resolve(req.result ? req.result.value : undefined);
      req.onerror = () => resolve(undefined);
    });
  }

  async function cachePut(module, key, value) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('cache', 'readwrite');
      tx.objectStore('cache').put({ id: cacheId(module, key), module, key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async function queueAdd(module, key, value) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('queue', 'readwrite');
      tx.objectStore('queue').add({ module, key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
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

  async function queueCount() {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('queue', 'readonly');
      const req = tx.objectStore('queue').count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  }

  async function getCurrentUserId() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      return data && data.session ? data.session.user.id : null;
    } catch (e) { return null; }
  }

  // Lee un dato. Si hay conexión, trae la versión más reciente de Supabase
  // y de paso refresca la copia local. Si no hay conexión (o Supabase
  // falla), usa la última copia guardada en este dispositivo.
  async function get(module, key, def) {
    const uid = await getCurrentUserId();
    if (!uid) return def;
    if (navigator.onLine) {
      try {
        const { data, error } = await supabaseClient
          .from('module_data')
          .select('value')
          .eq('user_id', uid).eq('module', module).eq('key', key)
          .maybeSingle();
        if (!error) {
          const value = data ? data.value : def;
          await cachePut(module, key, value);
          return value;
        }
      } catch (e) { /* sin conexión real o falla de red: sigue con la copia local */ }
    }
    const cached = await cacheGet(module, key);
    return cached !== undefined ? cached : def;
  }

  // Guarda un dato. Se escribe local de inmediato (nunca espera a la red);
  // si hay conexión intenta subirlo ya mismo, y si no puede, lo deja en la
  // cola para reintentar después.
  async function set(module, key, value) {
    await cachePut(module, key, value);
    const uid = await getCurrentUserId();
    if (!uid) return;
    if (navigator.onLine) {
      try {
        const { error } = await supabaseClient.from('module_data').upsert({
          user_id: uid, module, key, value, updated_at: new Date().toISOString(),
        });
        if (!error) { notifyQueueChange(); return; }
      } catch (e) { /* cae a la cola pendiente */ }
    }
    await queueAdd(module, key, value);
    notifyQueueChange();
  }

  // Reintenta subir todo lo que quedó pendiente. Se llama sola al volver
  // la conexión y cada 30 segundos como respaldo.
  async function syncQueue() {
    if (!navigator.onLine) return;
    const uid = await getCurrentUserId();
    if (!uid) return;
    const items = await queueAll();
    for (const item of items) {
      try {
        const { error } = await supabaseClient.from('module_data').upsert({
          user_id: uid, module: item.module, key: item.key, value: item.value,
          updated_at: new Date(item.updatedAt).toISOString(),
        });
        if (!error) await queueRemove(item.id);
      } catch (e) { /* se reintenta en el próximo ciclo */ }
    }
    notifyQueueChange();
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

  return { get, set, syncQueue, queueCount };
})();
