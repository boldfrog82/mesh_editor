import selfsigned from 'selfsigned';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const root = process.cwd();

const certificate = selfsigned.generate(
  [{ name: 'commonName', value: 'localhost' }],
  { days: 7, keySize: 2048 }
);

const cert = certificate.cert;
const key = certificate.private;

const handler = async (req, res) => {
  try {
    const reqUrl = url.parse(req.url).pathname || '/';
    let filePath = path.join(root, 'public', reqUrl);
    if (reqUrl.endsWith('/')) {
      filePath = path.join(filePath, 'index.html');
    }
    const stat = await fs.promises.stat(filePath).catch(() => undefined);
    if (!stat || stat.isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': contentType(ext) });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end('Internal error');
  }
};

const httpsServer = https.createServer({ key, cert }, handler);
const httpServer = http.createServer(handler);

const HTTPS_PORT = Number(process.env.PORT || 8443);
const HTTP_PORT = HTTPS_PORT + 1;

await new Promise((resolve) => httpsServer.listen(HTTPS_PORT, resolve));
await new Promise((resolve) => httpServer.listen(HTTP_PORT, resolve));

console.log(`Preview server:\n  https://localhost:${HTTPS_PORT}\n  http://localhost:${HTTP_PORT}`);

process.on('SIGINT', () => {
  httpsServer.close();
  httpServer.close();
  process.exit(0);
});

function contentType(ext) {
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.webmanifest':
      return 'application/manifest+json; charset=utf-8';
    case '.png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}
