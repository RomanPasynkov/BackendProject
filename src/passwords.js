const crypto = require('crypto');

const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('base64url');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  if (!storedHash.startsWith('scrypt$')) return false;

  const [, salt, hash] = storedHash.split('$');
  if (!salt || !hash) return false;

  const actual = crypto.scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'base64url');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };
