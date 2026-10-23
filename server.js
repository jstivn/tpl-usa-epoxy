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

  // Handle Mock API Endpoints for interactive demo forms & AI
  if (pathname === '/api/lead-router' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('[DEMO LEAD RECEIVED]:', body);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: true, message: 'Quote request received successfully!' }));
    });
    return;
  }

  if (pathname === '/api/ai-chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end("Hello! Apex Epoxy Co. installs high-end metallic marble and full-flake garage floor systems across Dallas-Fort Worth. Our floors feature industrial diamond-ground slab prep and UV-stable polyaspartic topcoats engineered for Texas heat. Feel free to call us at (214) 555-0199 or submit the quick quote form above!");
    });
    return;
  }

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

    // Disable caching completely for instant development preview
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    res.writeHead(200, headers);
    fs.createReadStream(targetFile).pipe(res);
  }

  function serveSPA() {
    const rootIndex = path.join(PUBLIC_DIR, 'index.html');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    fs.createReadStream(rootIndex).pipe(res);
  }

  serveFile(safePath);
});

server.listen(PORT, () => {
  console.log(`Apex Epoxy Co. local server running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop.`);
});
