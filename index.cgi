#!/usr/bin/node
const { handleRequest } = require('./src/app');
const { loadEnvFile } = require('./src/config');

loadEnvFile();

function readStdin(contentLength) {
  return new Promise((resolve, reject) => {
    if (contentLength <= 0) {
      resolve(Buffer.alloc(0));
      return;
    }

    const chunks = [];
    let received = 0;
    let done = false;

    process.stdin.on('data', (chunk) => {
      if (done) return;
      chunks.push(chunk);
      received += chunk.length;

      if (received >= contentLength) {
        done = true;
        process.stdin.pause();
        resolve(Buffer.concat(chunks, received).subarray(0, contentLength));
      }
    });
    process.stdin.on('end', () => {
      if (done) return;
      done = true;
      resolve(Buffer.concat(chunks, received).subarray(0, contentLength));
    });
    process.stdin.on('error', reject);
  });
}

function collectHeaders(env) {
  const headers = {};

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('HTTP_')) continue;
    const name = key
      .slice(5)
      .toLowerCase()
      .replace(/_/g, '-');
    headers[name] = value;
  }

  if (env.CONTENT_TYPE) headers['content-type'] = env.CONTENT_TYPE;
  if (env.CONTENT_LENGTH) headers['content-length'] = env.CONTENT_LENGTH;
  if (env.AUTH_TYPE && env.REMOTE_USER) headers.authorization = `${env.AUTH_TYPE} ${env.REMOTE_USER}`;

  return headers;
}

function writeResponse(result) {
  const headers = { ...result.headers };
  const status = result.status || 200;
  const reason = httpReason(status);

  process.stdout.write(`Status: ${status} ${reason}\r\n`);
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) process.stdout.write(`${name}: ${item}\r\n`);
    } else {
      process.stdout.write(`${name}: ${value}\r\n`);
    }
  }
  process.stdout.write('\r\n');
  process.stdout.write(result.body || '');
}

function httpReason(status) {
  return {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    302: 'Found',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
  }[status] || 'OK';
}

(async () => {
  try {
    const env = process.env;
    const body = await readStdin(Number(env.CONTENT_LENGTH || 0));
    const query = env.QUERY_STRING ? `?${env.QUERY_STRING}` : '';
    const url = `${env.REQUEST_URI || env.SCRIPT_NAME || '/'}${env.REQUEST_URI ? '' : query}`;

    const result = await handleRequest({
      method: env.REQUEST_METHOD || 'GET',
      url,
      headers: collectHeaders(env),
      body,
      remoteAddress: env.REMOTE_ADDR || '',
    });

    writeResponse(result);
    process.exit(0);
  } catch (error) {
    writeResponse({
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: false, error: error.message }),
    });
    process.exit(0);
  }
})();
