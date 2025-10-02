import { build } from 'esbuild';
import selfsigned from 'selfsigned';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const root = process.cwd();
const entryFile = path.resolve(root, 'app/main.js');
const outFile = path.resolve(root, 'public/app.js');

const buildCommon = {
  entryPoints: [entryFile],
  bundle: true,
  outfile: outFile,
  format: 'esm',
  target: ['es2022'],
  sourcemap: true,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': '"development"'
  },
  loader: {
    '.css': 'text',
    '.glsl': 'text',
    '.wgsl': 'text',
    '.png': 'dataurl',
    '.ktx2': 'binary'
  }
};

const builder = await build({
  ...buildCommon,
  incremental: true,
  watch: {
    onRebuild(error) {
      if (error) {
        console.error('[esbuild] rebuild failed:', error);
      } else {
        console.log('[esbuild] rebuilt');
      }
    }
  }
});

const certificate = selfsigned.generate(
  [{ name: 'commonName', value: 'localhost' }],
  { days: 30, keySize: 2048 }
);

const cert = certificate.cert;
const key = certificate.private;

const serverHandler = async (req, res) => {
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
    const type = contentType(ext);
    res.writeHead(200, { 'Content-Type': type });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end('Internal error');
  }
};

const httpsServer = https.createServer({ key, cert }, serverHandler);
const httpServer = http.createServer(serverHandler);

const HTTPS_PORT = Number(process.env.PORT || 5173);
const HTTP_PORT = HTTPS_PORT + 1;

await new Promise((resolve) => httpsServer.listen(HTTPS_PORT, resolve));
await new Promise((resolve) => httpServer.listen(HTTP_PORT, resolve));

console.log(`Dev server running:\n  https://localhost:${HTTPS_PORT}\n  http://localhost:${HTTP_PORT}`);
console.log('Press Ctrl+C to exit.');

process.on('SIGINT', async () => {
  await builder.stop?.();
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
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}
