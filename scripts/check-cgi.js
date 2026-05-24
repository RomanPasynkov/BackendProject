const fs = require('fs');
const path = require('path');

const cgiPath = path.join(__dirname, '..', 'index.cgi');
const content = fs.readFileSync(cgiPath, 'utf8');

if (!content.startsWith('#!/usr/bin/node')) {
  console.error('index.cgi must start with #!/usr/bin/node shebang');
  process.exit(1);
}

console.log('CGI check passed.');
