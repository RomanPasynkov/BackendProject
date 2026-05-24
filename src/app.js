const { getConfig } = require('./config');
const { clearCookieHeader, html, json, parseBody, parseCookies, redirect, setCookieHeader, wantsJson } = require('./http');
const { createToken, getBearerPayload } = require('./jwt');
const { normalizeContact, validateContact } = require('./validation');
const { serveStatic } = require('./static');
const { renderFormPage } = require('./views');
const {
  authenticate,
  createContact,
  loadContact,
  updateContact,
} = require('./submissions');

const TOKEN_MAX_AGE = 60 * 60 * 24;

async function handleRequest(rawRequest) {
  const config = getConfig();
  const request = normalizeRequest(rawRequest, config.basePath);
  request.cookies = parseCookies(request.headers.cookie);
  request.bodyData = parseBody(request.body, String(request.headers['content-type'] || ''));
  request.effectiveMethod = getEffectiveMethod(request);

  try {
    return await route(request, config);
  } catch (error) {
    return handleError(error, request);
  }
}

async function route(request, config) {
  const { path, effectiveMethod } = request;

  if (effectiveMethod === 'GET' && path === '/api/health') {
    return json(200, { ok: true });
  }

  if (effectiveMethod === 'POST' && path === '/api/contacts') {
    return createContactRoute(request, config);
  }

  if (effectiveMethod === 'POST' && path === '/api/login') {
    return loginRoute(request, config);
  }

  if (effectiveMethod === 'POST' && path === '/api/logout') {
    return logoutRoute(request);
  }

  if (effectiveMethod === 'GET' && path === '/api/profile') {
    return profileRoute(request);
  }

  const profileMatch = path.match(/^\/api\/profile\/(\d+)$/);
  if (profileMatch && effectiveMethod === 'PUT') {
    return updateProfileRoute(request, Number(profileMatch[1]));
  }

  if (effectiveMethod === 'GET' && (path === '/form' || path === '/form.html')) {
    return serveStatic('/form.html');
  }

  if (effectiveMethod === 'GET' && !path.startsWith('/api/')) {
    const staticResponse = await serveStatic(path || '/');
    if (staticResponse) return staticResponse;
  }

  if (effectiveMethod === 'GET' && (path === '/' || path === '')) {
    const staticResponse = await serveStatic('/index.html');
    if (staticResponse) return staticResponse;
  }

  return json(404, { ok: false, error: 'Маршрут не найден.' });
}

async function createContactRoute(request, config) {
  const values = normalizeContact(request.bodyData);
  const errors = validateContact(values);

  if (Object.keys(errors).length > 0) {
    if (wantsJson(request)) return json(422, { ok: false, errors });
    return html(422, renderFormPage({ config, errors, values }));
  }

  const auth = getBearerPayload(request);
  const authContactId = auth ? Number(auth.sub) : 0;

  if (authContactId) {
    const contact = await updateContact(authContactId, values);
    if (wantsJson(request)) {
      return json(200, { ok: true, contact, message: 'Данные успешно обновлены.' });
    }
    return html(200, renderFormPage({
      config,
      values: contact,
      message: 'Данные успешно обновлены.',
      isAuthenticated: true,
    }));
  }

  const created = await createContact(values, config.basePath || '');

  if (wantsJson(request)) {
    return json(201, {
      ok: true,
      contact: { id: created.id },
      credentials: { login: created.login, password: created.password },
      profileUrl: created.profileUrl,
    });
  }

  return html(201, renderFormPage({
    config,
    values,
    credentials: created,
    message: 'Данные успешно сохранены.',
  }));
}

async function loginRoute(request, config) {
  const login = String(request.bodyData.login || '').trim();
  const password = String(request.bodyData.password || '');

  if (!login || !password) {
    if (wantsJson(request)) {
      return json(422, { ok: false, error: 'Введите логин и пароль.' });
    }
    return html(422, renderFormPage({ config, authError: 'Введите логин и пароль.', authForm: { login } }));
  }

  const account = await authenticate(login, password);
  if (!account) {
    if (wantsJson(request)) {
      return json(401, { ok: false, error: 'Неверный логин или пароль.' });
    }
    return html(401, renderFormPage({ config, authError: 'Неверный логин или пароль.', authForm: { login } }));
  }

  const token = createToken({ sub: String(account.contactId), contactId: account.contactId });

  if (wantsJson(request)) {
    return json(200, {
      ok: true,
      token,
      tokenType: 'Bearer',
      contact: account.contact,
    });
  }

  const cookie = setCookieHeader('token', token, TOKEN_MAX_AGE);
  return html(200, renderFormPage({
    config,
    values: account.contact,
    message: 'Вход выполнен. Можно редактировать данные.',
    isAuthenticated: true,
  }), { 'Set-Cookie': cookie });
}

async function logoutRoute(request) {
  if (wantsJson(request)) {
    return json(200, { ok: true });
  }

  const cookie = clearCookieHeader('token');
  return redirect('/form', { 'Set-Cookie': cookie });
}

async function profileRoute(request) {
  const auth = getBearerPayload(request);
  const contactId = Number(auth && auth.sub ? auth.sub : 0);
  if (!contactId) return json(401, { ok: false, error: 'Требуется авторизация.' });

  const contact = await loadContact(contactId);
  if (!contact) return json(404, { ok: false, error: 'Заявка не найдена.' });

  return json(200, { ok: true, contact });
}

async function updateProfileRoute(request, contactId) {
  const auth = getBearerPayload(request);
  const authContactId = Number(auth && auth.sub ? auth.sub : 0);
  if (!authContactId) return json(401, { ok: false, error: 'Требуется авторизация.' });
  if (authContactId !== contactId) return json(403, { ok: false, error: 'Нельзя редактировать чужой профиль.' });

  const values = normalizeContact(request.bodyData);
  const errors = validateContact(values);
  if (Object.keys(errors).length > 0) {
    return json(422, { ok: false, errors });
  }

  const contact = await updateContact(contactId, values);
  return json(200, { ok: true, contact });
}

function normalizeRequest(rawRequest, basePath) {
  const url = new URL(rawRequest.url || '/', 'http://localhost');
  let path = url.pathname || '/';

  if (basePath && path.startsWith(basePath)) {
    path = path.slice(basePath.length) || '/';
  }

  const headers = {};
  for (const [key, value] of Object.entries(rawRequest.headers || {})) {
    headers[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  }

  return {
    ...rawRequest,
    path,
    query: Object.fromEntries(url.searchParams.entries()),
    headers,
  };
}

function getEffectiveMethod(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'POST' && request.bodyData && request.bodyData._method) {
    return String(request.bodyData._method).toUpperCase();
  }
  return method;
}

function handleError(error, request) {
  const status = Number(error.status || 500);

  if (wantsJson(request)) {
    return json(status, { ok: false, error: error.message || 'Внутренняя ошибка сервера.' });
  }

  return json(status, { ok: false, error: error.message || 'Внутренняя ошибка сервера.' });
}

module.exports = { handleRequest };
