const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath = path.join(__dirname, '..', '.env')) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function getConfig() {
  return {
    basePath: process.env.BASE_PATH || '',
    db: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME || 'u82295',
      user: process.env.DB_USER || 'u82295',
      password: process.env.DB_PASSWORD || '7819341',
    },
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
  };
}

module.exports = { getConfig, loadEnvFile };
