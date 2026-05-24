const querystring = require('querystring');

function json(status, payload, headers = {}) {
  return response(status, JSON.stringify(payload), {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
}

function html(status, body, headers = {}) {
  return response(status, body, {
    'Content-Type': 'text/html; charset=utf-8',
    ...headers,
  });
}

function response(status, body = '', headers = {}) {
  const normalizedBody = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  return {
    status,
    headers: {
      'Content-Length': normalizedBody.length,
      ...headers,
    },
    body: normalizedBody,
  };
}

function redirect(location, headers = {}) {
  return response(302, '', { Location: location, ...headers });
}

function wantsJson(request) {
  const accept = String(request.headers.accept || '');
  const requestedWith = String(request.headers['x-requested-with'] || '');
  const contentType = String(request.headers['content-type'] || '');
  return accept.includes('application/json')
    || contentType.includes('application/json')
    || requestedWith.toLowerCase() === 'fetch';
}

function parseCookies(header) {
  const result = {};
  if (!header) return result;

  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }

  return result;
}

function parseBody(rawBody, contentType) {
  const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
  if (!text) return {};

  if (contentType.includes('application/json')) {
    try { return JSON.parse(text); } catch (_) { return {}; }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return parseFormUrlencoded(text);
  }

  if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
    return parseSimpleXml(text);
  }

  return {};
}

function parseFormUrlencoded(text) {
  const raw = querystring.parse(text);
  const result = {};

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'languages' || key === 'languages[]') {
      result.languages = Array.isArray(value) ? value : [value];
    } else {
      result[key.replace(/\[\]$/, '')] = Array.isArray(value) ? value[value.length - 1] : value;
    }
  }

  return result;
}

function parseSimpleXml(xml) {
  const data = {};
  const tagPattern = /<([A-Za-z0-9_:-]+)>([\s\S]*?)<\/\1>/g;
  let match;

  while ((match = tagPattern.exec(xml)) !== null) {
    const key = match[1].replace(/^[^:]+:/, '');
    const value = match[2].replace(/<[^>]+>/g, '').trim();
    if (key === 'language' || key === 'languages') {
      data.languages = data.languages || [];
      if (value) data.languages.push(unescapeXml(value));
    } else {
      data[key] = unescapeXml(value);
    }
  }

  return data;
}

function unescapeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function setCookieHeader(name, value, maxAge) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', `Max-Age=${maxAge}`, 'SameSite=Lax'];
  return parts.join('; ');
}

function clearCookieHeader(name) {
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

module.exports = {
  clearCookieHeader,
  html,
  json,
  parseBody,
  parseCookies,
  redirect,
  response,
  setCookieHeader,
  wantsJson,
};
