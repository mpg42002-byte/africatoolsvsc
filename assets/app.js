/* AFRICA TOOLS · APP.JS */

let currentUser = null;
let currentView = 'dashboard';
(async function init() {
  await seedInitialAdminIfEmpty();
  setTheme(getTheme());

  const session = getSession();
  if (session) {
    currentUser = session;
    showApp();
  } else {
    showLogin();
  }

  document.getElementById('login-form').addEventListener('submit', onLoginSubmit);
  document.getElementById('logout-btn').addEventListener('click', onLogout);
  document.getElementById('theme-toggle').addEventListener('click', onToggleTheme);
  document.getElementById('menu-fab').addEventListener('click', () => setSidebarOpen(true));
  document.getElementById('module-menu-btn').addEventListener('click', () => setSidebarOpen(true));
  document.getElementById('module-chrome-theme').addEventListener('click', onToggleTheme);
  document.getElementById('sidebar-backdrop').addEventListener('click', () => setSidebarOpen(false));
  document.getElementById('module-frame').addEventListener('load', () => {
    const frame = document.getElementById('module-frame');
    const expectedKey = frame.dataset.pendingKey;
    if (!expectedKey) return;
    let loadedHref = '';
    try { 
      loadedHref = frame.contentWindow.location.href;
    } catch (err) { 
      clearTimeout(frame.dataset.loadingTimeout);
      frame.contentWindow.postMessage({ type: 'africa-tools-set-theme', theme: getTheme() }, '*');
      window.requestAnimationFrame(() => {
        frame.classList.remove('is-loading');
        document.getElementById('module-loading').classList.add('hidden');
        delete frame.dataset.pendingKey;
        delete frame.dataset.loadingTimeout;
      });
      return; 
    }
    if (loadedHref === 'about:blank') return;
    clearTimeout(frame.dataset.loadingTimeout);
    frame.contentWindow.postMessage({ type: 'africa-tools-set-theme', theme: getTheme() }, '*');
    window.requestAnimationFrame(() => {
      frame.classList.remove('is-loading');
      document.getElementById('module-loading').classList.add('hidden');
      delete frame.dataset.pendingKey;
      delete frame.dataset.loadingTimeout;
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setSidebarOpen(false);
      document.getElementById('user-modal-backdrop').classList.add('hidden');
    }
    
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      if (currentView === 'admin') {
        document.getElementById('user-search').focus();
      }
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      if (currentView === 'admin' && userIsAdmin(currentUser.roles)) {
        openUserModal(null);
      }
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      event.preventDefault();
      goToView('dashboard');
    }
  });
})();

function setSidebarOpen(open) {
  document.getElementById('sidebar').classList.toggle('open', open);
  document.getElementById('sidebar-backdrop').classList.toggle('show', open);
  document.getElementById('menu-fab').setAttribute('aria-expanded', String(open));
  document.getElementById('module-menu-btn').setAttribute('aria-expanded', String(open));
}

function moduleByKey(key) { return MODULES.find(m => m.key === key); }

function updateModuleChrome(viewKey) {
  const chrome = document.getElementById('module-chrome');
  const module = moduleByKey(viewKey);
  chrome.classList.toggle('hidden', !module);
  document.getElementById('module-chrome-title').textContent = module ? module.label : '';
}

function showShellToast(message) {
  let toast = document.getElementById('shell-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'shell-toast'; toast.className = 'shell-toast'; toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showShellToast.timer);
  showShellToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

async function onLoginSubmit(e) {
  e.preventDefault();
  const usuario = document.getElementById('login-usuario').value.trim();
  const clave = document.getElementById('login-clave').value;
  const remember = document.getElementById('login-remember').checked;
  const errorBox = document.getElementById('login-error');
  errorBox.classList.add('hidden');

  const lockedSeconds = isLoginLocked();
  if (lockedSeconds) {
    const minutes = Math.floor(lockedSeconds / 60);
    const seconds = lockedSeconds % 60;
    errorBox.textContent = `Demasiados intentos fallidos. Intenta de nuevo en ${minutes > 0 ? minutes + 'm ' : ''}${seconds}s.`;
    errorBox.classList.remove('hidden');
    return;
  }

  const user = await authenticate(usuario, clave);
  if (!user) {
    recordFailedLogin();
    const attempts = getLoginAttempts();
    const remaining = MAX_LOGIN_ATTEMPTS - attempts.count;
    if (remaining > 0 && remaining <= 2) {
      errorBox.textContent = `Usuario o contraseña incorrectos. Te quedan ${remaining} intentos.`;
    } else {
      errorBox.textContent = 'Usuario o contraseña incorrectos, o el usuario está inactivo.';
    }
    errorBox.classList.remove('hidden');
    return;
  }
  
  clearLoginAttempts();
  setSession(user, remember);
  currentUser = { id: user.id, usuario: user.usuario, nombre: user.nombre, roles: user.roles };
  showApp();
}

function onLogout() {
  clearSession();
  currentUser = null;
  document.getElementById('login-form').reset();
  document.getElementById('app-shell').classList.add('hidden');
  showLogin();
  showShellToast('Sesión cerrada correctamente.');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  renderUserChip();
  renderNav();
  goToView('dashboard');
}

function renderUserChip() {
  const initials = (currentUser.nombre || currentUser.usuario).slice(0, 2).toUpperCase();
  const roleLabels = currentUser.roles.map(r => (ROLES[r] && ROLES[r].label) || r).join(', ');
  document.getElementById('user-chip').innerHTML = `
    <div class="avatar">${initials}</div>
    <div class="who">
      <div class="name">${escapeHtmlLocal(currentUser.nombre || currentUser.usuario)}</div>
      <div class="roles">${escapeHtmlLocal(roleLabels)}</div>
    </div>
  `;
}

function renderNav() {
  const permitted = resolvePermittedModules(currentUser.roles);
  const isAdmin = userIsAdmin(currentUser.roles);
  const nav = document.getElementById('nav-modules');
  nav.innerHTML = '';

  const dashBtn = navButton('Dashboard', 'dashboard', currentView === 'dashboard');
  nav.appendChild(dashBtn);

  const label = document.createElement('div');
  label.className = 'nav-section-label';
  label.textContent = 'Módulos';
  nav.appendChild(label);

  MODULES.filter(m => permitted.includes(m.key)).forEach(m => {
    nav.appendChild(navButton(m.label, m.key, currentView === m.key));
  });

  const adminSection = document.getElementById('nav-admin-section');
  adminSection.innerHTML = '';
  if (isAdmin) {
    const adminLabel = document.createElement('div');
    adminLabel.className = 'nav-section-label';
    adminLabel.textContent = 'Administración';
    adminSection.appendChild(adminLabel);
    adminSection.appendChild(navButton('Usuarios', 'admin', currentView === 'admin'));
  }
}

function navButton(label, viewKey, active) {
  const btn = document.createElement('button');
  btn.className = 'navlink' + (active ? ' active' : '');
  btn.textContent = label;
  if (active) btn.setAttribute('aria-current', 'page');
  btn.addEventListener('click', () => goToView(viewKey));
  return btn;
}

function goToView(viewKey) {
  currentView = viewKey;
  renderNav();

  const dash = document.getElementById('dashboard-view');
  const admin = document.getElementById('admin-view');
  const frameWrap = document.getElementById('module-frame-wrap');
  const frame = document.getElementById('module-frame');

  dash.classList.add('hidden');
  admin.classList.add('hidden');
  frameWrap.classList.add('hidden');
  updateModuleChrome(viewKey);

  const announcer = document.getElementById('view-announcer');
  const module = moduleByKey(viewKey);

  if (viewKey === 'dashboard') {
    document.getElementById('app-shell').classList.remove('module-active');
    setSidebarOpen(false);
    dash.classList.remove('hidden');
    renderDashboard();
    if (announcer) announcer.textContent = 'Navegaste al Dashboard';
  } else if (viewKey === 'admin') {
    if (!userIsAdmin(currentUser.roles)) { goToView('dashboard'); return; }
    document.getElementById('app-shell').classList.remove('module-active');
    setSidebarOpen(false);
    admin.classList.remove('hidden');
    renderAdmin();
    if (announcer) announcer.textContent = 'Navegaste a Administración de usuarios';
  } else {
    const permitted = resolvePermittedModules(currentUser.roles);
    if (!permitted.includes(viewKey)) { goToView('dashboard'); return; }
    document.getElementById('app-shell').classList.add('module-active');
    setSidebarOpen(false);
    frameWrap.classList.remove('hidden');
    if (announcer) announcer.textContent = `Cargando ${module ? module.label : 'módulo'}`;
    const src = MODULE_SOURCES[viewKey];
    if (frame.getAttribute('data-current') !== viewKey) {
      const loader = document.getElementById('module-loading');
      frame.classList.add('is-loading');
      loader.classList.remove('hidden');
      void loader.offsetWidth;
      frame.setAttribute('data-current', viewKey);
      frame.dataset.pendingKey = viewKey;
      clearTimeout(frame.dataset.loadingTimeout);
      frame.dataset.loadingTimeout = setTimeout(() => {
        frame.classList.remove('is-loading');
        loader.classList.add('hidden');
        delete frame.dataset.pendingKey;
        delete frame.dataset.loadingTimeout;
      }, 8000);
      requestAnimationFrame(() => {
        frame.src = `${src}?theme=${encodeURIComponent(getTheme())}`;
      });
    }
  }
}

function renderDashboard() {
  const permitted = resolvePermittedModules(currentUser.roles);
  document.getElementById('dash-greeting-name').textContent = currentUser.nombre || currentUser.usuario;
  const grid = document.getElementById('module-grid');
  grid.innerHTML = '';
  MODULES.filter(m => permitted.includes(m.key)).forEach(m => {
    const card = document.createElement('button');
    card.className = 'module-card';
    card.innerHTML = `<span class="module-card-icon" aria-hidden="true">${m.icon}</span><div class="cardTitle">${escapeHtmlLocal(m.label)}</div><p class="cardDescription">${escapeHtmlLocal(m.description)}</p><div class="cardGo">Abrir herramienta →</div>`;
    card.addEventListener('click', () => goToView(m.key));
    grid.appendChild(card);
  });
  if (grid.children.length === 0) {
    grid.innerHTML = '<div class="dashboard-empty"><span aria-hidden="true">🔐</span><strong>Aún no tienes herramientas asignadas</strong><p>Pide a un administrador que te asigne un rol para comenzar.</p></div>';
  }
}

(function initKioskMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('kiosk') === '1') {
    document.body.classList.add('kiosk-mode');
    const style = document.createElement('style');
    style.textContent = `
      body.kiosk-mode #sidebar { display: none !important; }
      body.kiosk-mode #main-content { margin-left: 0 !important; }
      body.kiosk-mode #mobile-menu-btn { display: none !important; }
    `;
    document.head.appendChild(style);
  }
})();

let allUsersCache = [];
let currentSort = { column: null, ascending: true };
let currentPage = 1;
const USERS_PER_PAGE = 20;

function renderAdmin() {
  const users = loadUsers();
  allUsersCache = users;
  
  // Poblar filtro
  const filterRole = document.getElementById('filter-role');
  filterRole.innerHTML = '<option value="">Todos los roles</option>';
  const uniqueRoles = [...new Set(users.flatMap(u => u.roles))];
  uniqueRoles.sort().forEach(roleKey => {
    const opt = document.createElement('option');
    opt.value = roleKey;
    opt.textContent = (ROLES[roleKey] && ROLES[roleKey].label) || roleKey;
    filterRole.appendChild(opt);
  });
  
  renderUsersTable(users);
  
  function applyFilters() {
    currentPage = 1;
    const roleFilter = document.getElementById('filter-role').value;
    const statusFilter = document.getElementById('filter-status').value;
    const searchQuery = document.getElementById('user-search').value.toLowerCase().trim();
    
    let filtered = allUsersCache;
    
    // Filtro por rol
    if (roleFilter) {
      filtered = filtered.filter(u => u.roles.includes(roleFilter));
    }
    
    if (statusFilter === 'active') {
      filtered = filtered.filter(u => u.activo !== false);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(u => u.activo === false);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(u => {
        const nombre = (u.nombre || '').toLowerCase();
        const usuario = u.usuario.toLowerCase();
        const rolesText = u.roles.map(r => (ROLES[r] && ROLES[r].label) || r).join(' ').toLowerCase();
        return nombre.includes(searchQuery) || usuario.includes(searchQuery) || rolesText.includes(searchQuery);
      });
    }
    
    renderUsersTable(filtered);
  }
  
  const searchInput = document.getElementById('user-search');
  searchInput.value = '';
  searchInput.oninput = applyFilters;
  
  document.getElementById('filter-role').onchange = applyFilters;
  document.getElementById('filter-status').onchange = applyFilters;

  document.querySelectorAll('.sortable').forEach(th => {
    th.style.cursor = 'pointer';
    th.onclick = () => {
      const column = th.dataset.sort;
      if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
      } else {
        currentSort.column = column;
        currentSort.ascending = true;
      }
      
      const sorted = [...allUsersCache].sort((a, b) => {
        let valA, valB;
        if (column === 'nombre') {
          valA = (a.nombre || '').toLowerCase();
          valB = (b.nombre || '').toLowerCase();
        } else if (column === 'usuario') {
          valA = a.usuario.toLowerCase();
          valB = b.usuario.toLowerCase();
        } else if (column === 'roles') {
          valA = a.roles.join(',').toLowerCase();
          valB = b.roles.join(',').toLowerCase();
        } else if (column === 'activo') {
          valA = a.activo !== false ? 1 : 0;
          valB = b.activo !== false ? 1 : 0;
        }
        
        if (valA < valB) return currentSort.ascending ? -1 : 1;
        if (valA > valB) return currentSort.ascending ? 1 : -1;
        return 0;
      });
      
      document.querySelectorAll('.sortable').forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        if (header.dataset.sort === column) {
          indicator.textContent = currentSort.ascending ? ' ▲' : ' ▼';
          header.style.fontWeight = '700';
        } else {
          indicator.textContent = '';
          header.style.fontWeight = '600';
        }
      });
      
      renderUsersTable(sorted);
    };
  });

  document.getElementById('new-user-btn').onclick = () => openUserModal(null);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('admin-tbody');
  tbody.innerHTML = '';
  
  // Paginación
  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
  const startIdx = (currentPage - 1) * USERS_PER_PAGE;
  const endIdx = startIdx + USERS_PER_PAGE;
  const paginatedUsers = users.slice(startIdx, endIdx);
  
  const pagination = document.getElementById('users-pagination');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const pageCurrent = document.getElementById('page-current');
  const pageTotal = document.getElementById('page-total');
  
  if (totalPages > 1) {
    pagination.classList.remove('hidden');
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    pageCurrent.textContent = currentPage;
    pageTotal.textContent = totalPages;
    
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderUsersTable(users);
      }
    };
    
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderUsersTable(users);
      }
    };
  } else {
    pagination.classList.add('hidden');
  }
  
  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  paginatedUsers.forEach(u => {
    const tr = document.createElement('tr');
    if (u.activo === false) tr.classList.add('user-inactive');
    const rolesHtml = u.roles.map(r => `<span class="badge-role">${escapeHtmlLocal((ROLES[r] && ROLES[r].label) || r)}</span>`).join('');
    const initials = getInitials(u.nombre || u.usuario);
    tr.innerHTML = `
      <td><span class="user-avatar" title="${escapeHtmlLocal(u.nombre || '')}">${initials}</span>${escapeHtmlLocal(u.nombre || '')}</td>
      <td>${escapeHtmlLocal(u.usuario)}</td>
      <td>${rolesHtml || '<span class="badge-role badge-off">Sin rol</span>'}</td>
      <td>${u.activo !== false ? 'Activo' : '<span class="badge-role badge-off">Inactivo</span>'}</td>
      <td></td>
    `;
    const actionsTd = tr.lastElementChild;

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-secondary';
    editBtn.style.marginRight = '6px';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => openUserModal(u));
    actionsTd.appendChild(editBtn);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-secondary';
    toggleBtn.style.marginRight = '6px';
    toggleBtn.textContent = u.activo !== false ? 'Desactivar' : 'Activar';
    toggleBtn.addEventListener('click', () => {
      if (u.id === currentUser.id && u.activo !== false) {
        alert('No puedes desactivar tu propia cuenta mientras tienes la sesión iniciada.');
        return;
      }
      const action = u.activo !== false ? 'desactivar' : 'activar';
      if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a "${u.usuario}"? ${u.activo !== false ? 'No podrá iniciar sesión hasta que se reactive.' : 'Podrá iniciar sesión nuevamente.'}`)) return;
      u.activo = !(u.activo !== false);
      const all = loadUsers().map(x => x.id === u.id ? u : x);
      saveUsers(all);
      allUsersCache = all;
      renderUsersTable(all);
      
      addAuditLog(action === 'desactivar' ? 'usuario_desactivado' : 'usuario_activado', {
        usuarioId: u.id,
        usuario: u.usuario
      }, currentUser.usuario);
      
      showShellToast(`Usuario ${action === 'desactivar' ? 'desactivado' : 'activado'}.`);
    });
    actionsTd.appendChild(toggleBtn);

    if (u.usuario !== currentUser.usuario) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.textContent = 'Eliminar';
      delBtn.addEventListener('click', () => {
        if (!confirm(`¿Eliminar al usuario "${u.usuario}"? Esta acción no se puede deshacer.`)) return;
        
        addAuditLog('usuario_eliminado', {
          usuarioId: u.id,
          usuario: u.usuario,
          nombre: u.nombre
        }, currentUser.usuario);
        
        const all = loadUsers().filter(x => x.id !== u.id);
        saveUsers(all);
        allUsersCache = all;
        renderUsersTable(all);
        showShellToast('Usuario eliminado.');
      });
      actionsTd.appendChild(delBtn);
    }

    tbody.appendChild(tr);
  });
}

function openUserModal(existingUser) {
  const backdrop = document.getElementById('user-modal-backdrop');
  backdrop.classList.remove('hidden');
  document.getElementById('user-modal-title').textContent = existingUser ? 'Editar usuario' : 'Nuevo usuario';
  document.getElementById('um-nombre').value = existingUser ? (existingUser.nombre || '') : '';
  document.getElementById('um-usuario').value = existingUser ? existingUser.usuario : '';
  document.getElementById('um-usuario').disabled = !!existingUser;
  document.getElementById('um-clave').value = '';
  document.getElementById('um-clave').placeholder = existingUser ? 'Dejar en blanco para no cambiarla' : '';

  const passwordInput = document.getElementById('um-clave');
  const strengthContainer = document.getElementById('password-strength');
  const strengthFill = document.getElementById('password-strength-fill');
  const strengthText = document.getElementById('password-strength-text');
  
  passwordInput.oninput = () => {
    const password = passwordInput.value;
    if (!password) {
      strengthContainer.classList.add('hidden');
      return;
    }
    
    strengthContainer.classList.remove('hidden');
    let strength = 0;
    let label = '';
    let width = 0;
    
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    // Clasificar
    strengthFill.className = 'password-strength-fill';
    if (strength <= 2) {
      label = 'Débil';
      width = 33;
      strengthFill.classList.add('weak');
    } else if (strength <= 3) {
      label = 'Media';
      width = 66;
      strengthFill.classList.add('medium');
    } else {
      label = 'Fuerte';
      width = 100;
      strengthFill.classList.add('strong');
    }
    
    strengthFill.style.width = width + '%';
    strengthText.textContent = label;
  };

  const rolesWrap = document.getElementById('um-roles');
  rolesWrap.innerHTML = '';
  Object.keys(ROLES).forEach(roleKey => {
    const id = 'role_' + roleKey;
    const checked = existingUser && existingUser.roles.includes(roleKey);
    rolesWrap.innerHTML += `
      <label><input type="checkbox" id="${id}" value="${roleKey}" ${checked ? 'checked' : ''}/> ${escapeHtmlLocal(ROLES[roleKey].label)}</label>
    `;
  });

  const modalCard = backdrop.querySelector('.modal-card');
  const focusableElements = modalCard.querySelectorAll('input:not([disabled]), button:not([disabled])');
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const trapFocus = (e) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  modalCard.addEventListener('keydown', trapFocus);

  const closeModal = () => {
    backdrop.classList.add('hidden');
    modalCard.removeEventListener('keydown', trapFocus);
    strengthContainer.classList.add('hidden');
  };
  
  document.getElementById('user-modal-cancel').onclick = closeModal;
  backdrop.onclick = (event) => { if (event.target === backdrop) closeModal(); };
  setTimeout(() => document.getElementById(existingUser ? 'um-nombre' : 'um-usuario').focus(), 0);
  document.getElementById('user-modal-save').onclick = async () => {
    const saveBtn = document.getElementById('user-modal-save');
    const originalText = saveBtn.textContent;
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';
    
    const nombre = document.getElementById('um-nombre').value.trim();
    const usuario = document.getElementById('um-usuario').value.trim();
    const clave = document.getElementById('um-clave').value;
    const selectedRoles = Array.from(rolesWrap.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value);

    if (!nombre) { 
      alert('El nombre completo es obligatorio.'); 
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return; 
    }
    if (!usuario) { 
      alert('El nombre de usuario es obligatorio.'); 
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return; 
    }
    if (!existingUser && !clave) { 
      alert('La contraseña es obligatoria para un usuario nuevo.'); 
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return; 
    }
    if (clave && clave.length < 6) { 
      alert('La contraseña debe tener al menos 6 caracteres.'); 
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return; 
    }
    if (selectedRoles.length === 0) { 
      alert('Asigna al menos un rol para que el usuario pueda acceder a sus herramientas.'); 
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return; 
    }

    const users = loadUsers();
    if (existingUser) {
      const idx = users.findIndex(u => u.id === existingUser.id);
      users[idx].nombre = nombre;
      users[idx].roles = selectedRoles;
      if (clave) users[idx].passwordHash = await hashPassword(clave);
      
      addAuditLog('usuario_editado', {
        usuarioId: existingUser.id,
        usuario: existingUser.usuario,
        cambios: { nombre, roles: selectedRoles, cambioContrasena: !!clave }
      }, currentUser.usuario);
    } else {
      if (users.some(u => u.usuario.toLowerCase() === usuario.toLowerCase())) {
        alert('Ya existe un usuario con ese nombre.');
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
        return;
      }
      const newUser = {
        id: 'u_' + Date.now(),
        usuario, nombre,
        passwordHash: await hashPassword(clave),
        roles: selectedRoles,
        activo: true,
      };
      users.push(newUser);
      
      addAuditLog('usuario_creado', {
        usuarioId: newUser.id,
        usuario: newUser.usuario,
        nombre: newUser.nombre,
        roles: selectedRoles
      }, currentUser.usuario);
    }
    saveUsers(users);
    
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
    
    backdrop.classList.add('hidden');
    renderAdmin();
    showShellToast(existingUser ? 'Usuario actualizado.' : 'Usuario creado.');
  };
}

function onToggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
}

function escapeHtmlLocal(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
