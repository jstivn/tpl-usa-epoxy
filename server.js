const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // Parse URL, remove query parameters
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Security check: prevent directory traversal
  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  // Helper to serve file
  function serveFile(filePath) {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        // SPA Fallback: serve root index.html
        return serveSPA();
      }

      if (stats.isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        return fs.stat(indexPath, (indexErr, indexStats) => {
          if (!indexErr && indexStats.isFile()) {
            return sendFile(indexPath);
          }
          return serveSPA();
        });
      }

      if (stats.isFile()) {
        return sendFile(filePath);
      }

      serveSPA();
    });
  }

  function sendFile(targetFile) {
    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Fast caching headers
    const headers = { 'Content-Type': contentType };
    if (targetFile.includes(path.sep + 'assets' + path.sep)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'public, max-age=3600';
    }

    res.writeHead(200, headers);
    fs.createReadStream(targetFile).pipe(res);
  }

  function serveSPA() {
    const rootIndex = path.join(PUBLIC_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(rootIndex).pipe(res);
  }

  serveFile(safePath);
});

server.listen(PORT, () => {
  console.log(`IronCoat Epoxy Co. local server running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop.`);
});
