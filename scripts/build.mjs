import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const entryFile = path.resolve(root, 'app/main.js');
const outFile = path.resolve(root, 'public/app.js');

await build({
  entryPoints: [entryFile],
  bundle: true,
  outfile: outFile,
  format: 'esm',
  target: ['es2022'],
  sourcemap: false,
  minify: true,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  loader: {
    '.css': 'text',
    '.glsl': 'text',
    '.wgsl': 'text',
    '.png': 'dataurl',
    '.ktx2': 'binary'
  }
});

const swPath = path.resolve(root, 'public/sw.js');
if (fs.existsSync(swPath)) {
  const now = new Date().toISOString();
  const swSource = await fs.promises.readFile(swPath, 'utf-8');
  const updated = swSource.replace(/const CACHE_VERSION = "v[0-9a-z.-]+";/, `const CACHE_VERSION = "v${Date.now().toString(36)}";`);
  if (updated !== swSource) {
    await fs.promises.writeFile(swPath, updated, 'utf-8');
  } else {
    await fs.promises.writeFile(swPath, swSource + `\n// build stamp ${now}\n`, 'utf-8');
  }
}

console.log('Build complete. Output ready in public/.');
