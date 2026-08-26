/* AFRICA TOOLS · APP.JS */

let currentUser = null;
let currentView = 'dashboard';
(async function init() {
  setTheme(getTheme());

  const session = await getSession();
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
      const forcePwModal = document.getElementById('force-pw-modal-backdrop');
      if (forcePwModal && !forcePwModal.classList.contains('hidden')) {
        event.preventDefault();
      }
    }
    
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    
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
  
  const forcePwSaveBtn = document.getElementById('force-pw-save');
  if (forcePwSaveBtn) forcePwSaveBtn.addEventListener('click', onForcePasswordSave);

  const logPrevBtn = document.getElementById('activity-log-prev');
  if (logPrevBtn) logPrevBtn.addEventListener('click', () => {
    if (activityLogState.page > 0) { activityLogState.page -= 1; renderActivityLog(); }
  });
  const logNextBtn = document.getElementById('activity-log-next');
  if (logNextBtn) logNextBtn.addEventListener('click', () => {
    activityLogState.page += 1; renderActivityLog();
  });
  const logPageSizeSelect = document.getElementById('activity-log-pagesize');
  if (logPageSizeSelect) logPageSizeSelect.addEventListener('change', (e) => {
    activityLogState.pageSize = parseInt(e.target.value, 10) || 50;
    activityLogState.page = 0;
    renderActivityLog();
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
  const isAdminView = viewKey === 'admin';
  chrome.classList.toggle('hidden', !module && !isAdminView);
  document.getElementById('module-chrome-title').textContent = module ? module.label : (isAdminView ? 'Administración' : '');
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
  // Supabase Auth siempre persiste la sesión en este dispositivo — no
  // existe una versión "solo por esta pestaña".
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
  currentUser = { id: user.id, usuario: user.usuario, nombre: user.nombre, roles: user.roles };
  
  if (user.mustChangePassword) {
    document.getElementById('login-screen').classList.add('hidden');
    const modal = document.getElementById('force-pw-modal-backdrop');
    if (modal) modal.classList.remove('hidden');
    return;
  }
  showApp();
}

async function onLogout() {
  stopIdleWatcher();
  await clearSession();
  currentUser = null;
  document.getElementById('login-form').reset();
  document.getElementById('app-shell').classList.add('hidden');
  // Borra el iframe del módulo por completo. Si no hiciéramos esto, la
  // próxima persona que entre y abra el mismo módulo se encontraría con
  // los datos de la sesión anterior todavía en memoria — el shell evita
  // recargar un módulo que "ya está cargado" para no recargarlo de más,
  // así que hay que forzar ese reinicio explícitamente al cerrar sesión.
  const frame = document.getElementById('module-frame');
  if (frame) {
    frame.removeAttribute('data-current');
    frame.src = 'about:blank';
  }
  showLogin();
  showShellToast('Sesión cerrada correctamente.');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  const forcePwModal = document.getElementById('force-pw-modal-backdrop');
  if (forcePwModal) forcePwModal.classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  renderUserChip();
  renderNav();
  goToView('dashboard');
  startIdleWatcher(() => {
    onLogout();
    const errorBox = document.getElementById('login-error');
    errorBox.textContent = 'Tu sesión se cerró por inactividad. Vuelve a ingresar.';
    errorBox.classList.remove('hidden');
  });
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

  const dashBtn = navButton('Inicio', 'dashboard', currentView === 'dashboard', '🏠');
  nav.appendChild(dashBtn);

  MODULE_CATEGORIES.forEach(cat => {
    const modsInCat = MODULES.filter(m => (m.category || 'otros') === cat.key && permitted.includes(m.key));
    if (modsInCat.length === 0) return;
    const label = document.createElement('div');
    label.className = 'nav-section-label';
    label.textContent = cat.label;
    nav.appendChild(label);
    modsInCat.forEach(m => nav.appendChild(navButton(m.label, m.key, currentView === m.key, m.icon)));
  });

  const adminSection = document.getElementById('nav-admin-section');
  adminSection.innerHTML = '';
  if (isAdmin) {
    const adminLabel = document.createElement('div');
    adminLabel.className = 'nav-section-label';
    adminLabel.textContent = 'Administración';
    adminSection.appendChild(adminLabel);
    adminSection.appendChild(navButton('Usuarios', 'admin', currentView === 'admin', '👤'));
  }
}

function navButton(label, viewKey, active, icon) {
  const btn = document.createElement('button');
  btn.className = 'navlink' + (active ? ' active' : '');
  btn.title = label;
  btn.innerHTML = `<span class="navlink-icon">${icon || '•'}</span><span class="navlink-label">${escapeHtmlLocal(label)}</span>`;
  if (active) btn.setAttribute('aria-current', 'page');
  btn.addEventListener('click', () => goToView(viewKey));
  return btn;
}

function showToast(message, type = 'error') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type === 'error' ? 'toast-error' : '');
  const icon = type === 'error' ? '⚠️' : '✅';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
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
    if (announcer) announcer.textContent = 'Navegaste a Inicio';
  } else if (viewKey === 'admin') {
    if (!userIsAdmin(currentUser.roles)) { goToView('dashboard'); return; }
    document.getElementById('app-shell').classList.add('module-active');
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

  let totalCards = 0;
  MODULE_CATEGORIES.forEach(cat => {
    const modsInCat = MODULES.filter(m => (m.category || 'otros') === cat.key && permitted.includes(m.key));
    if (modsInCat.length === 0) return;
    totalCards += modsInCat.length;

    const catLabel = document.createElement('div');
    catLabel.className = 'dash-category-label';
    catLabel.textContent = cat.label;
    grid.appendChild(catLabel);

    const catGrid = document.createElement('div');
    catGrid.className = 'module-grid';
    modsInCat.forEach(m => {
      const card = document.createElement('button');
      card.className = 'module-card';
      const iconDisplay = m.icon || '•';
      card.innerHTML = `<div class="cardIcon" aria-hidden="true">${iconDisplay}</div><div class="cardTitle">${escapeHtmlLocal(m.label)}</div>${m.description ? `<div class="cardDesc">${escapeHtmlLocal(m.description)}</div>` : ''}<div class="cardGo">Abrir →</div>`;
      card.addEventListener('click', () => goToView(m.key));
      catGrid.appendChild(card);
    });
    grid.appendChild(catGrid);
  });

  if (totalCards === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted)">No tienes módulos asignados todavía. Pide a un administrador que te asigne un rol.</p>';
  }
  if (currentUser.roles.includes('lider_seguridad') || userIsAdmin(currentUser.roles)) { renderDashboardSummary(permitted); } else { document.getElementById('dash-summary').innerHTML = ''; }
}

function renderDashboardSummary(permitted) {
  const wrap = document.getElementById('dash-summary');
  wrap.innerHTML = '';

  if (currentUser.roles.includes('lider_seguridad')) {
    const now = new Date();
    const monthKey = 'checklist-' + now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    supabaseClient
      .from('module_data')
      .select('value')
      .eq('user_id', currentUser.id).eq('module', 'lider').eq('key', monthKey)
      .maybeSingle()
      .then(({ data, error }) => {
        let label = 'Checklist mensual sin iniciar';
        if (!error && data && data.value) {
          try {
            const state = JSON.parse(data.value);
            const total = Object.keys(state).length;
            const done = Object.values(state).filter(Boolean).length;
            if (total > 0) label = `${done}/${total} tareas completadas este mes`;
          } catch { /* deja el label por defecto */ }
        }
        const div = document.createElement('div');
        div.className = 'summary-card';
        div.innerHTML = `<div class="sc-label">Líder de Seguridad</div><div class="sc-value">${escapeHtmlLocal(label)}</div>`;
        wrap.appendChild(div);
      })
      .catch(() => {});
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

async function renderAdmin() {
  const users = await loadUsers();
  const tbody = document.getElementById('admin-tbody');
  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    const rolesHtml = u.roles.map(r => `<span class="badge-role">${escapeHtmlLocal((ROLES[r] && ROLES[r].label) || r)}</span>`).join('');
    tr.innerHTML = `
      <td>${escapeHtmlLocal(u.nombre || '')}</td>
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

    const isSelf = u.usuario === currentUser.usuario;
    const isFirstAdmin = users[0].id === u.id;
    
    if (!isSelf && !isFirstAdmin) {
      const willActivate = u.activo === false;
      const toggleBtn = document.createElement('button');
      toggleBtn.className = willActivate ? 'btn-secondary' : 'btn-warn';
      toggleBtn.style.marginRight = '6px';
      toggleBtn.textContent = willActivate ? 'Activar' : 'Desactivar';
      toggleBtn.addEventListener('click', async () => {
        if (!willActivate) {
          const ok = await showConfirm(
            `¿Desactivar a ${u.nombre || u.usuario}?`,
            'No podrá iniciar sesión hasta que se reactive.'
          );
          if (!ok) return;
        }
        u.activo = willActivate;
        const success = await updateProfile(u.id, { activo: willActivate });
        if (!success) { showShellToast('No se pudo actualizar el usuario.'); return; }
        await logActivity(`Usuario ${willActivate ? 'activado' : 'desactivado'}: ${u.nombre || u.usuario}`);
        await renderAdmin();
        showShellToast(`Usuario ${willActivate ? 'activado' : 'desactivado'}.`);
      });
      actionsTd.appendChild(toggleBtn);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-danger';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', async () => {
        const ok = await showConfirm(
          `¿Eliminar a ${u.nombre || u.usuario}?`,
          'Esta acción no se puede deshacer.'
        );
        if (!ok) return;
        const result = await deleteUserRemote(u.id);
        if (!result.ok) { showShellToast('No se pudo eliminar: ' + result.error); return; }
        await logActivity(`Eliminó al usuario: ${u.nombre || u.usuario}`);
        await renderAdmin();
        showShellToast('Usuario eliminado.');
      });
      actionsTd.appendChild(deleteBtn);
    } else if (isSelf) {
      const selfLabel = document.createElement('span');
      selfLabel.textContent = 'Tu usuario';
      selfLabel.style.fontSize = '13px';
      selfLabel.style.color = 'var(--text-muted)';
      actionsTd.appendChild(selfLabel);
    } else if (isFirstAdmin) {
      const protectedLabel = document.createElement('span');
      protectedLabel.textContent = 'Admin principal (protegido)';
      protectedLabel.style.fontSize = '13px';
      protectedLabel.style.color = 'var(--text-muted)';
      actionsTd.appendChild(protectedLabel);
    }
    
    tbody.appendChild(tr);
  });
  
  await renderActivityLog();
  document.getElementById('new-user-btn').onclick = () => openUserModal(null);
}

async function openUserModal(existingUser) {
  const backdrop = document.getElementById('user-modal-backdrop');
  backdrop.classList.remove('hidden');
  document.getElementById('user-modal-title').textContent = existingUser ? 'Editar usuario' : 'Nuevo usuario';
  document.getElementById('um-nombre').value = existingUser ? (existingUser.nombre || '') : '';
  document.getElementById('um-usuario').value = existingUser ? existingUser.usuario : '';
  document.getElementById('um-usuario').disabled = !!existingUser;
  document.getElementById('um-clave').value = '';
  document.getElementById('um-clave').placeholder = '';
  const claveField = document.getElementById('um-clave-field');
  if (existingUser) {
    claveField.style.display = 'none';
  } else {
    claveField.style.display = '';
  }

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
  const isFirstAdminMod = existingUser && existingUser.id === (await loadUsers())[0].id;
  Object.keys(ROLES).forEach(roleKey => {
    const id = 'role_' + roleKey;
    const checked = (existingUser && existingUser.roles.includes(roleKey)) || (isFirstAdminMod && roleKey === 'administrador');
    const lockAttr = (isFirstAdminMod && roleKey === 'administrador') ? 'disabled' : '';
    rolesWrap.innerHTML += `<label><input type="checkbox" id="${id}" value="${roleKey}" ${checked ? 'checked' : ''} ${lockAttr}/> ${escapeHtmlLocal(ROLES[roleKey].label)}</label>`;
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
      showToast('El nombre completo es obligatorio.'); 
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return; 
    }
    if (!usuario) { 
      showToast('El nombre de usuario es obligatorio.'); 
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return; 
    }
    if (!existingUser && !clave) { 
      showToast('La contraseña es obligatoria para un usuario nuevo.'); 
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return; 
    }
    if (clave && clave.length < 6) { 
      showToast('La contraseña debe tener al menos 6 caracteres.'); 
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return; 
    }
    if (selectedRoles.length === 0) { 
      showToast('Asigna al menos un rol para que el usuario pueda acceder a sus herramientas.'); 
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return; 
    }

    const users = await loadUsers();
    if (existingUser) {
      const dupOtherUser = users.some(u => u.id !== existingUser.id && u.usuario.toLowerCase() === usuario.toLowerCase());
      if (dupOtherUser) {
        showToast('Ya existe un usuario con ese nombre.');
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
        return;
      }
      const success = await updateProfile(existingUser.id, { nombre, roles: selectedRoles });
      if (!success) {
        showToast('No se pudo guardar. Intenta de nuevo.');
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
        return;
      }
      // Cambiar la contraseña de OTRA persona necesita privilegios que el
      // navegador nunca debe tener — solo se puede cambiar la propia.
      // Queda pendiente para una fase posterior (reset de clave por admin).
      await logActivity(`Editó al usuario "${nombre || usuario}"`);
    } else {
      if (users.some(u => u.usuario.toLowerCase() === usuario.toLowerCase())) {
        showToast('Ya existe un usuario con ese nombre.');
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
        return;
      }
      const result = await createUserRemote({ usuario, nombre, clave, roles: selectedRoles });
      if (!result.ok) {
        showToast('No se pudo crear: ' + result.error);
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
        return;
      }
      await logActivity(`Creó al usuario "${nombre || usuario}"`);
    }

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
/* ---------- MODAL DE CONFIRMACIÓN PERSONALIZADO ---------- */
function showConfirm(title, body) {
  const backdrop = document.getElementById('confirm-modal-backdrop');
  if (!backdrop) return Promise.resolve(false);
  
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-body').textContent = body;
  backdrop.classList.remove('hidden');

  return new Promise((resolve) => {
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const acceptBtn = document.getElementById('confirm-modal-accept');
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

/* ---------- CAMBIO DE CONTRASEÑA OBLIGATORIO (primer login) ---------- */
async function onForcePasswordSave() {
  const clave = document.getElementById('fp-clave').value;
  const clave2 = document.getElementById('fp-clave2').value;
  const errorBox = document.getElementById('force-pw-error');
  errorBox.classList.add('hidden');

  if (!clave || clave.length < 6) {
    errorBox.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (clave !== clave2) {
    errorBox.textContent = 'Las dos contraseñas no coinciden.';
    errorBox.classList.remove('hidden');
    return;
  }

  const success = await updateOwnPassword(clave);
  if (!success) {
    errorBox.textContent = 'No se pudo cambiar la contraseña. Intenta de nuevo.';
    errorBox.classList.remove('hidden');
    return;
  }
  await updateProfile(currentUser.id, { mustChangePassword: false });
  await logActivity('Cambió su contraseña (primer login obligatorio)');
  document.getElementById('fp-clave').value = '';
  document.getElementById('fp-clave2').value = '';
  showApp();
}

/* ---------- LOG DE ACTIVIDAD (renderizado en Administración) ---------- */
let activityLogState = { page: 0, pageSize: 50 };

async function renderActivityLog() {
  const tbody = document.getElementById('activity-log-tbody');
  if (!tbody) return;

  const { pageSize, page } = activityLogState;
  const offset = page * pageSize;
  const { entries, total } = await loadActivityLog(pageSize, offset);

  if (entries.length === 0 && page > 0) {
    // Se quedó en una página que ya no existe (por ejemplo, cambiaron el
    // tamaño de página). Vuelve a la primera y reintenta.
    activityLogState.page = 0;
    return renderActivityLog();
  }

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="activity-log-empty">Sin actividad registrada todavía.</td></tr>`;
  } else {
    tbody.innerHTML = entries.map(entry => {
      const d = new Date(entry.ts);
      const when = d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
      return `<tr>
        <td>${escapeHtmlLocal(when)}</td>
        <td>${escapeHtmlLocal(entry.actor)}</td>
        <td>${escapeHtmlLocal(entry.action)}</td>
      </tr>`;
    }).join('');
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageInfo = document.getElementById('activity-log-pageinfo');
  const prevBtn = document.getElementById('activity-log-prev');
  const nextBtn = document.getElementById('activity-log-next');
  if (pageInfo) pageInfo.textContent = total === 0 ? '' : `Página ${page + 1} de ${totalPages} (${total} en total)`;
  if (prevBtn) prevBtn.disabled = page === 0;
  if (nextBtn) nextBtn.disabled = page + 1 >= totalPages;
}



setTimeout(() => {
  const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
  if (isIos && !isInStandaloneMode && !localStorage.getItem('ios_prompt_dismissed')) {
    const p = document.getElementById('ios-install-prompt');
    if (p) {
      p.classList.remove('hidden');
      document.getElementById('ios-prompt-close').addEventListener('click', () => {
        p.classList.add('hidden');
        localStorage.setItem('ios_prompt_dismissed', 'true');
      });
    }
  }
}, 3000);
