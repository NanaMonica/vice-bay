// serve.ts — a minimal static file server for the game/ folder (Node 22,
// standard library only). Run `node serve.ts` and open
// http://localhost:8080 in a desktop browser. It only serves files under
// game/, sends the MIME types a browser game needs (the vendored three.js
// build, the ES modules under game/src/), and answers 403/404 for anything
// outside it. A local development convenience, not a public web server.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_DIR = resolve(fileURLToPath(new URL('./game', import.meta.url)));

/** Pick the port from `--port N` (default 8080), clamped to a valid range. */
function pickPort(argv: string[]): number {
  const at = argv.indexOf('--port');
  const wanted = at === -1 ? 8080 : Number(argv[at + 1]);
  return Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;
}

const PORT = pickPort(process.argv.slice(2));

const TYPES = new Map<string, string>([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
  ['.glb', 'model/gltf-binary'],
  ['.gltf', 'model/gltf+json'],
  ['.bin', 'application/octet-stream'],
  ['.wasm', 'application/wasm'],
  ['.wav', 'audio/wav'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function mimeFor(file: string): string {
  return TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream';
}

/** Resolve a request path to a file under game/, or null if it escapes. */
function resolveGameFile(pathname: string): string | null {
  const clean = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const file = resolve(join(GAME_DIR, normalize(clean)));
  if (file !== GAME_DIR && !file.startsWith(GAME_DIR + sep)) return null;
  return file;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  const file = resolveGameFile(pathname);
  if (file === null) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size: number;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': mimeFor(file),
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`game/ is on http://localhost:${PORT}`);
});
