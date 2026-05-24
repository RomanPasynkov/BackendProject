const crypto = require('crypto');
const { getPool, withTransaction } = require('./db');
const { hashPassword, verifyPassword } = require('./passwords');

async function createContact(values, basePath) {
  return withTransaction(async (db) => {
    const [insertResult] = await db.query(
      `INSERT INTO contacts (name, phone, email, message)
       VALUES (:name, :phone, :email, :message)`,
      values,
    );

    const contactId = insertResult.insertId;

    const login = await generateUniqueLogin(db);
    const password = generatePassword();
    await db.query(
      `INSERT INTO contact_accounts (contact_id, login, password_hash)
       VALUES (:contact_id, :login, :password_hash)`,
      {
        contact_id: contactId,
        login,
        password_hash: hashPassword(password),
      },
    );

    return {
      id: contactId,
      login,
      password,
      profileUrl: `${basePath || ''}/api/profile/${contactId}`,
    };
  });
}

async function updateContact(contactId, values) {
  return withTransaction(async (db) => {
    const [result] = await db.query(
      `UPDATE contacts
       SET name = :name,
           phone = :phone,
           email = :email,
           message = :message
       WHERE id = :id`,
      { id: contactId, ...values },
    );

    if (result.affectedRows === 0) {
      const error = new Error('Заявка не найдена.');
      error.status = 404;
      throw error;
    }

    const [rows] = await db.query(
      'SELECT id, name, phone, email, message, created_at FROM contacts WHERE id = :id',
      { id: contactId },
    );
    const row = rows[0];
    return {
      id: Number(row.id),
      name: row.name,
      phone: row.phone,
      email: row.email,
      message: row.message,
      created_at: row.created_at,
    };
  });
}

async function authenticate(login, password) {
  const db = await getPool();
  const [rows] = await db.query(
    `SELECT contact_id, password_hash
     FROM contact_accounts
     WHERE login = :login`,
    { login },
  );

  const account = rows[0];
  if (!account || !verifyPassword(password, account.password_hash)) return null;

  return {
    contactId: Number(account.contact_id),
    contact: await loadContact(Number(account.contact_id)),
  };
}

async function loadContact(id) {
  const db = await getPool();
  const [rows] = await db.query(
    `SELECT id, name, phone, email, message, created_at
     FROM contacts
     WHERE id = :id`,
    { id },
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: Number(row.id),
    name: row.name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    created_at: row.created_at,
  };
}

async function loadLoginByContactId(contactId) {
  const db = await getPool();
  const [rows] = await db.query(
    'SELECT login FROM contact_accounts WHERE contact_id = :id',
    { id: contactId },
  );
  return rows.length > 0 ? rows[0].login : null;
}

async function generateUniqueLogin(db) {
  let login;
  let exists = true;

  while (exists) {
    login = `user_${randomString(8, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
    const [rows] = await db.query(
      'SELECT COUNT(*) AS count FROM contact_accounts WHERE login = :login',
      { login },
    );
    exists = Number(rows[0].count) > 0;
  }

  return login;
}

function generatePassword() {
  return randomString(12, 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789');
}

function randomString(length, alphabet) {
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return value;
}

module.exports = { authenticate, createContact, loadContact, loadLoginByContactId, updateContact };
