const http = require('http');
const { handleRequest } = require('./src/app');
const { loadEnvFile } = require('./src/config');

loadEnvFile();

const port = Number(process.env.PORT || 3000);

const server = http.createServer(async (req, res) => {
  const chunks = [];

  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    try {
      const result = await handleRequest({
        method: req.method || 'GET',
        url: req.url || '/',
        headers: req.headers,
        body: Buffer.concat(chunks),
        remoteAddress: req.socket.remoteAddress || '',
      });

      res.writeHead(result.status, result.headers);
      res.end(result.body);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: error.message }));
    }
  });
});

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
