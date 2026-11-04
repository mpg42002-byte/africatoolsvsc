#!/usr/bin/env node
/* Imprime el CASE de public.module_roles() para supabase/policies.sql, calculado desde assets/permissions.js
   (la misma tabla de roles → módulos que usa la interfaz). La prueba tests/sql/rls.test.js verifica que el SQL coincida. */
const fs = require('fs'), path = require('path'), vm = require('vm');
function moduleRoles() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'permissions.js'), 'utf8');
  const ctx = vm.createContext({});
  vm.runInContext(src + '\nthis.__R = { MODULES, ROLES };', ctx);
  const { MODULES, ROLES } = ctx.__R;
  const out = {};
  for (const m of MODULES) {
    out[m.key] = Object.entries(ROLES).filter(([, r]) => {
      if (m.alwaysAvailable) return true;
      const list = r.modules === 'ALL' ? ['ALL'] : r.modules;
      return list.includes(m.key) || (list.includes('ALL') && !m.restricted);
    }).map(([k]) => k).sort();
  }
  return out;
}
module.exports = { moduleRoles };
if (require.main === module) {
  const m = moduleRoles();
  console.log(Object.entries(m).map(([k, v]) => `    when '${k}' then array[${v.map((x) => `'${x}'`).join(', ')}]`).join('\n'));
}
