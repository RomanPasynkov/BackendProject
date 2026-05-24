/* eslint-env browser */
(() => {
  'use strict';

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const TOKEN_KEY = 'dc_jwt_token';
  const CONTACT_ID_KEY = 'dc_contact_id';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (_) { return null; }
  }
  function setToken(token, contactId) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      if (contactId) localStorage.setItem(CONTACT_ID_KEY, String(contactId));
    } catch (_) {}
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(CONTACT_ID_KEY); } catch (_) {}
  }
  function getContactId() {
    try { return Number(localStorage.getItem(CONTACT_ID_KEY)) || 0; } catch (_) { return 0; }
  }

  function authHeaders() {
    const token = getToken();
    const h = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'fetch' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  }

  // ========== Validation ==========
  function validateForm(form) {
    let ok = true;
    clearErrors(form);
    const v = getFormValues(form);

    if (!v.name) { showError(form, 'name', 'Поле обязательно'); ok = false; }
    else if (v.name.length < 2) { showError(form, 'name', 'Минимум 2 символа'); ok = false; }

    if (!v.phone) { showError(form, 'phone', 'Поле обязательно'); ok = false; }
    else if (!/^\+?[0-9\s\-()]{6,20}$/.test(v.phone)) { showError(form, 'phone', 'Некорректный формат'); ok = false; }

    if (!v.email) { showError(form, 'email', 'Поле обязательно'); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) { showError(form, 'email', 'Некорректный email'); ok = false; }

    if (!v.message) { showError(form, 'message', 'Поле обязательно'); ok = false; }
    else if (v.message.length < 10) { showError(form, 'message', 'Минимум 10 символов'); ok = false; }

    return ok;
  }

  function getFormValues(form) {
    const fd = new FormData(form);
    return {
      name: (fd.get('name') || '').trim(),
      phone: (fd.get('phone') || '').trim(),
      email: (fd.get('email') || '').trim(),
      message: (fd.get('message') || '').trim(),
    };
  }

  function showError(form, fieldName, message) {
    const el = form.querySelector(`[name="${fieldName}"]`);
    if (el) el.style.borderColor = '#ff6464';
    const errEl = form.querySelector(`[data-error-for="${fieldName}"]`);
    if (errEl) { errEl.textContent = message; return; }
    const span = el ? el.closest('.field') : null;
    if (span) {
      const s = span.querySelector('.field__error');
      if (s) s.textContent = message;
    }
  }

  function clearErrors(form) {
    qsa('.field__input', form).forEach((el) => { el.style.borderColor = ''; });
    qsa('.field__error', form).forEach((el) => { el.textContent = ''; });
  }

  function showServerErrors(form, errors) {
    for (const [field, message] of Object.entries(errors)) showError(form, field, message);
  }

  // ========== UI ==========
  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = !!loading;
    btn.classList.toggle('is-loading', !!loading);
  }

  function setStatus(text) {
    const el = qs('#formStatus');
    if (el) el.textContent = text || '';
  }

  function showAlert(message, type) {
    removeAlerts();
    const div = document.createElement('div');
    div.className = 'formAlert ' + (type === 'error' ? 'formAlert--err' : 'formAlert--ok');
    div.innerHTML = message;
    const head = qs('.section__head');
    if (head && head.nextElementSibling) head.parentNode.insertBefore(div, head.nextElementSibling);
    else if (head) head.parentNode.appendChild(div);
  }

  function removeAlerts() {
    qsa('.formAlert').forEach((el) => el.remove());
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function fillForm(form, data) {
    if (!data || !form) return;
    ['name', 'phone', 'email', 'message'].forEach((f) => {
      const el = form.querySelector('[name="' + f + '"]');
      if (el) el.value = data[f] || '';
    });
  }

  // ========== State ==========
  let isAuthenticated = false;
  let currentContactId = 0;
  let currentUserName = '';

  function updateUI() {
    const btnText = qs('#submitBtn .btn__text');
    if (btnText) btnText.textContent = isAuthenticated ? 'Обновить данные' : 'Отправить';

    const authCard = qs('#authCard');
    if (authCard) {
      if (isAuthenticated) {
        authCard.innerHTML =
          '<h3 class="infoCard__title">Личный кабинет</h3>' +
          '<p class="infoCard__text">Вы вошли как <strong>' + escapeHtml(currentUserName || 'пользователь') + '</strong></p>' +
          '<button class="btn btn--ghost" type="button" id="logoutBtn" style="width:100%;margin-top:8px">Выйти</button>';
        const logoutBtn = qs('#logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
      } else {
        // restore login form on logout (page reloads anyway)
      }
    }

    // hide the "agree" note when editing
    const note = qs('.form__note');
    if (note) note.style.display = isAuthenticated ? 'none' : '';
  }

  // ========== Auth ==========
  async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const login = (form.querySelector('[name="login"]').value || '').trim();
    const password = form.querySelector('[name="password"]').value || '';

    if (!login || !password) { showAlert('Введите логин и пароль.', 'error'); return; }

    const btn = form.querySelector('button[type="submit"]');
    setLoading(btn, true);

    try {
      const res = await fetch('./api/login', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ login, password }) });
      const data = await res.json();

      if (!res.ok || !data.ok) { showAlert(data.error || 'Неверный логин или пароль.', 'error'); return; }

      setToken(data.token, data.contact ? data.contact.id : 0);
      isAuthenticated = true;
      currentContactId = data.contact ? data.contact.id : 0;
      currentUserName = data.contact ? (data.contact.name || '') : '';

      if (data.contact) fillForm(qs('#contactForm'), data.contact);

      removeAlerts();
      showAlert('Вход выполнен. Можно редактировать данные.', 'success');
      updateUI();
    } catch (err) {
      showAlert('Ошибка сети.', 'error');
      console.error(err);
    } finally {
      setLoading(btn, false);
    }
  }

  async function handleLogout() {
    clearToken();
    isAuthenticated = false;
    currentContactId = 0;
    try { await fetch('./api/logout', { method: 'POST', headers: authHeaders() }); } catch (_) {}
    location.reload();
  }

  // ========== Submit ==========
  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    removeAlerts();
    setStatus('');
    if (!validateForm(form)) return;

    const values = getFormValues(form);
    const btn = qs('#submitBtn');
    setLoading(btn, true);

    try {
      let url, method;
      if (isAuthenticated && currentContactId) {
        url = './api/profile/' + currentContactId;
        method = 'PUT';
      } else {
        url = './api/contacts';
        method = 'POST';
      }

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(values) });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.errors) { showServerErrors(form, data.errors); showAlert('Исправьте ошибки в форме.', 'error'); }
        else showAlert(data.error || 'Ошибка.', 'error');
        return;
      }

      if (data.credentials) {
        showAlert(
          '<strong>Сохраните данные для входа:</strong><br>Логин: <code>' + escapeHtml(data.credentials.login) + '</code><br>Пароль: <code>' + escapeHtml(data.credentials.password) + '</code>',
          'success'
        );
        setStatus('Данные сохранены. Запишите логин и пароль!');
      } else {
        showAlert(data.message || 'Данные сохранены.', 'success');
        setStatus(data.message || '');
      }

      if (data.contact) fillForm(form, data.contact);
    } catch (err) {
      showAlert('Ошибка сети.', 'error');
      console.error(err);
    } finally {
      setLoading(btn, false);
    }
  }

  // ========== Init ==========
  async function init() {
    const form = qs('#contactForm');
    const authForm = qs('#authForm');

    if (form) form.addEventListener('submit', handleSubmit);
    if (authForm) authForm.addEventListener('submit', handleLogin);

    const token = getToken();
    if (token) {
      try {
        const res = await fetch('./api/profile', { headers: authHeaders() });
        const data = await res.json();
        if (res.ok && data.ok && data.contact) {
          isAuthenticated = true;
          currentContactId = data.contact.id;
          currentUserName = data.contact.name || '';
          fillForm(form, data.contact);
          updateUI();
        } else { clearToken(); }
      } catch (_) { clearToken(); }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
