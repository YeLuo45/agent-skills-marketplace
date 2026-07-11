// Minimal build script using esbuild — no @vitejs/plugin-react needed.
// Bundles TSX → standalone JS, copies index.html and assets to dist/.

import { build } from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(__dirname, 'dist');

if (!existsSync(outdir)) mkdirSync(outdir, { recursive: true });

// Bundle TSX+TS into single JS file (browser target, no node built-ins)
console.log('[build] bundling src/main.tsx → dist/main.js');
await build({
  entryPoints: [resolve(__dirname, 'src/main.tsx')],
  bundle: true,
  format: 'esm',
  target: ['es2022'],
  outfile: resolve(outdir, 'main.js'),
  sourcemap: false,
  minify: true,
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.BASE_URL': '""',
  },
  loader: { '.ts': 'tsx', '.tsx': 'tsx', '.css': 'css' },
  jsx: 'automatic',
});

// Copy index.html (with rewritten <script src>)
const htmlSrc = resolve(__dirname, 'index.html');
const htmlOut = resolve(outdir, 'index.html');
let html = (await import('node:fs')).readFileSync(htmlSrc, 'utf-8');
html = html.replace('src="/src/main.tsx"', 'src="./main.js"');
(await import('node:fs')).writeFileSync(htmlOut, html);
console.log('[build] wrote dist/index.html');

copyFileSync(resolve(__dirname, 'public/favicon.svg'), resolve(outdir, 'favicon.svg'));
console.log('[build] copied public/favicon.svg');

console.log('[build] done ✓');
