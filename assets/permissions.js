/* AFRICA TOOLS · PERMISOS */
const MODULES = [
  { key: 'limpieza', label: 'Limpieza', icon: '🧹', description: 'Organiza parejas y horarios de limpieza.', category: 'operacion' },
  { key: 'lider', label: 'Líder de Seguridad', icon: '🛡️', description: 'Gestiona recursos y seguridad del equipo.', category: 'operacion' },
  // alwaysAvailable: se agrega a TODOS los roles sin importar su lista de
  // módulos — es personal de cada usuario, no depende de su rol/cargo.
  { key: 'diaadia', label: 'Día a Día', icon: '✅', description: 'Tus tareas periódicas: qué te toca hoy.', alwaysAvailable: true, category: 'operacion' },
  { key: 'inventario', label: 'Inventario', icon: '📦', description: 'Procesa y organiza archivos de inventario.', category: 'impresion' },
  { key: 'folders', label: 'Folders', icon: '🏷️', description: 'Genera marcación lista para imprimir.', category: 'impresion' },
  { key: 'habladores', label: 'Habladores Winner', icon: '📢', description: 'Diseña habladores y señalética Winner.', category: 'impresion' },
  { key: 'wow-tablero', label: 'Tablero Wow Points', icon: '⭐', description: 'Crea tableros de reconocimiento Wow.', category: 'wow' },
  { key: 'wow-calificacion', label: 'Calificación Wow Points', icon: '🏆', description: 'Prepara tarjetas de calificación Wow.', category: 'wow' },
  { key: 'agenda', label: 'Agenda de Fiestas', icon: '🎉', description: 'Calendario y disponibilidad de salones para eventos.', category: 'eventos' },
];

// Orden y etiquetas de las categorías para agrupar el sidebar y el
// dashboard — un módulo sin `category` (no debería pasar, pero por las
// dudas) cae en un grupo "Otros" al final.
const MODULE_CATEGORIES = [
  { key: 'operacion', label: 'Operación diaria' },
  { key: 'impresion', label: 'Impresión y señalética' },
  { key: 'wow', label: 'Reconocimiento Wow' },
  { key: 'eventos', label: 'Eventos' },
  { key: 'otros', label: 'Otros' },
];

const ROLES = {
  administrador: {
    label: 'Administrador',
    modules: 'ALL',
    isAdmin: true,
  },
  supervisor: {
    label: 'Supervisor',
    modules: 'ALL',
    isAdmin: false,
  },
  lider_parque: {
    label: 'Líder de Parque',
    modules: 'ALL',
    isAdmin: false,
  },
  lider_seguridad: {
    label: 'Líder de Seguridad',
    modules: ['lider'],
    isAdmin: false,
  },
  cajero: {
    label: 'Cajero',
    modules: ['agenda'],
    isAdmin: false,
  },
  anfitrion_fiesta: {
    label: 'Anfitrión de Fiesta',
    modules: ['agenda'],
    isAdmin: false,
  },
};

function resolvePermittedModules(userRoles) {
  const allKeys = MODULES.map(m => m.key);
  const alwaysKeys = MODULES.filter(m => m.alwaysAvailable).map(m => m.key);
  const set = new Set(alwaysKeys);
  (userRoles || []).forEach(roleKey => {
    const role = ROLES[roleKey];
    if (!role) return;
    if (role.modules === 'ALL') {
      allKeys.forEach(k => set.add(k));
    } else {
      role.modules.forEach(k => set.add(k));
    }
  });
  return Array.from(set);
}

function userIsAdmin(userRoles) {
  return (userRoles || []).some(r => ROLES[r] && ROLES[r].isAdmin);
}
