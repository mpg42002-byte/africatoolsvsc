/* AFRICA TOOLS · PERMISOS */
const MODULES = [
  { key: 'limpieza', label: 'Limpieza', icon: '🧹', description: 'Organiza parejas y horarios de limpieza.' },
  { key: 'inventario', label: 'Inventario', icon: '📦', description: 'Procesa y organiza archivos de inventario.' },
  { key: 'lider', label: 'Líder de Seguridad', icon: '🛡️', description: 'Gestiona recursos y seguridad del equipo.' },
  { key: 'folders', label: 'Folders', icon: '🏷️', description: 'Genera marcación lista para imprimir.' },
  { key: 'wow-tablero', label: 'Tablero Wow Points', icon: '⭐', description: 'Crea tableros de reconocimiento Wow.' },
  { key: 'wow-calificacion', label: 'Calificación Wow Points', icon: '🏆', description: 'Prepara tarjetas de calificación Wow.' },
  { key: 'habladores', label: 'Habladores Winner', icon: '📢', description: 'Diseña habladores y señalética Winner.' },
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
  lider_seguridad: {
    label: 'Líder de Seguridad',
    modules: ['lider'],
    isAdmin: false,
  },
};

function resolvePermittedModules(userRoles) {
  const allKeys = MODULES.map(m => m.key);
  const set = new Set();
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
