const crypto = require('crypto');
const { getConfig } = require('./config');

const TOKEN_TTL_SECONDS = 60 * 60 * 24;

function createToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };

  const body = {
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedBody = base64url(JSON.stringify(body));
  const signature = sign(`${encodedHeader}.${encodedBody}`);

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedBody, signature] = parts;
  const expected = sign(`${encodedHeader}.${encodedBody}`);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));

    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    if (!payload.exp || Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch (_) {
    return null;
  }
}

function getBearerPayload(request) {
  const authorization = String(request.headers.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (match) return verifyToken(match[1]);

  const cookies = request.cookies || {};
  if (cookies.token) return verifyToken(cookies.token);

  return null;
}

function base64url(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(value) {
  return crypto
    .createHmac('sha256', getConfig().jwtSecret)
    .update(value)
    .digest('base64url');
}

module.exports = { createToken, getBearerPayload, verifyToken };
