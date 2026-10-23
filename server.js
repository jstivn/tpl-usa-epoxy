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

function transformHtmlWithCompany(html, company) {
  if (!company) return html;
  
  const formattedTitle = `${company} | 1-Tap Garage Floor Estimate`;
  const formattedDesc = `${company} installs industrial-grade epoxy flake systems and polyaspartic coatings. Diamond-ground slab prep, 1-day installation. Get a free instant estimate.`;
  const safeCompanyJson = JSON.stringify(company);

  const clientScript = `
<script>
(function() {
  window.__CUSTOM_COMPANY__ = ${safeCompanyJson};
  
  function applyBrand() {
    var c = window.__CUSTOM_COMPANY__;
    if (!c) return;

    if (document.title !== "${company} | 1-Tap Garage Floor Estimate") {
      document.title = "${company} | 1-Tap Garage Floor Estimate";
    }

    var walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while (node = walker.nextNode()) {
      if (node.nodeValue && (node.nodeValue.indexOf("Apex Epoxy Co.") !== -1 || node.nodeValue.indexOf("Apex Epoxy") !== -1)) {
        node.nodeValue = node.nodeValue.replace(/Apex Epoxy Co\\./g, c).replace(/Apex Epoxy/g, c);
      }
    }

    var h1 = document.querySelector('h1');
    if (h1 && (h1.textContent.indexOf("Metallic") !== -1 || h1.textContent.indexOf("Apex") !== -1)) {
      h1.textContent = c + " — Premium Garage Floor Coatings";
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBrand);
  } else {
    applyBrand();
  }

  window.addEventListener('load', function() {
    applyBrand();
    if (document.body) {
      var observer = new MutationObserver(function() {
        applyBrand();
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  });
})();
</script>
`;

  let out = html;
  // Replace title
  out = out.replace(/<title>.*?<\/title>/i, `<title>${formattedTitle}</title>`);
  // Replace OpenGraph
  out = out.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${formattedTitle}" />`);
  out = out.replace(/<meta property="og:site_name" content=".*?" \/>/i, `<meta property="og:site_name" content="${company}" />`);
  out = out.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${formattedDesc}" />`);
  // Inject client script into head
  out = out.replace('</head>', `${clientScript}</head>`);
  return out;
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Extract company parameter
  let company = parsedUrl.searchParams.get("c") || parsedUrl.searchParams.get("name") || parsedUrl.searchParams.get("company") || "";
  if (!company && pathname.startsWith("/demo/")) {
    const slug = pathname.replace(/^\/demo\/?/, "").split("/")[0];
    if (slug) {
      company = decodeURIComponent(slug).replace(/[-_+]+/g, " ").trim().replace(/\b\w/g, char => char.toUpperCase());
    }
  }
  company = company.trim();

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
      console.log('[AI CHAT QUERY]');
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(`Hello! ${company || 'Apex Epoxy Co.'} installs industrial-grade epoxy flake systems and polyaspartic coatings. Our floors feature diamond-ground slab prep and UV-stable polyaspartic topcoats. Submit your garage dimensions above for an instant quote!`);
    });
    return;
  }

  // Security check: prevent directory traversal
  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  function serveFile(filePath) {
    fs.stat(filePath, (err, stats) => {
      if (err) {
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

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    if (ext === '.html' && company) {
      fs.readFile(targetFile, 'utf-8', (readErr, htmlContent) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end('Internal Server Error');
        }
        const transformed = transformHtmlWithCompany(htmlContent, company);
        res.writeHead(200, headers);
        res.end(transformed);
      });
      return;
    }

    res.writeHead(200, headers);
    fs.createReadStream(targetFile).pipe(res);
  }

  function serveSPA() {
    const rootIndex = path.join(PUBLIC_DIR, 'index.html');
    fs.readFile(rootIndex, 'utf-8', (err, htmlContent) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Internal Server Error');
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      const transformed = transformHtmlWithCompany(htmlContent, company);
      res.end(transformed);
    });
  }

  serveFile(safePath);
});

server.listen(PORT, () => {
  console.log(`Apex Epoxy Co. / Dynamic Edge Demo running at http://localhost:${PORT}`);
  console.log(`Test personal link: http://localhost:${PORT}/?c=Old+GOAT+Coatings`);
  console.log(`Test slug link:     http://localhost:${PORT}/demo/West-Texas-Coatings`);
});
