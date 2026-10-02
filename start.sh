#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-3000}"
export PORT
PROJECT_DIR="$(pwd)"
DIST_DIR="$PROJECT_DIR/dist"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
export PROJECT_DIR DIST_DIR WEB_DIR
/usr/bin/time -p mkdir -p "$DIST_DIR" "$WEB_DIR"
/usr/bin/time -p test -f "$DIST_DIR/index.html"
if /usr/bin/time -p test -f "$PROJECT_DIR/package.json"; then
  if /usr/bin/time -p test -f "$PROJECT_DIR/package-lock.json"; then
    /usr/bin/time -p npm ci --no-audit --no-fund
  else
    /usr/bin/time -p npm install --no-audit --no-fund
  fi
  if /usr/bin/time -p node -e "process.exit(require('./package.json').scripts&&require('./package.json').scripts.build?0:1)"; then
    /usr/bin/time -p npm run build
  fi
  /usr/bin/time -p test -f "$DIST_DIR/index.html"
fi
/usr/bin/time -p node --input-type=module -e "
import { writeFileSync, mkdirSync } from 'node:fs';
const web = process.env.WEB_DIR;
mkdirSync(web, { recursive: true });
writeFileSync(web + '/deployment-output.json', JSON.stringify({ project: process.env.PROJECT_DIR, directory: process.env.DIST_DIR }));
"
/usr/bin/time -p cat "$WEB_DIR/deployment-output.json"
/usr/bin/time -p test -n "${RUNTIME_DIR:-}"
exec /usr/bin/time -p node --input-type=module -e "
import { createServer } from 'node:http';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
const root = resolve(process.env.DIST_DIR || 'dist');
const port = Number(process.env.PORT || 3000);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + '/')) { res.writeHead(404); res.end('Not found'); return; }
    try { if (statSync(path).isDirectory()) path = join(path, 'index.html'); } catch { path = join(root, 'index.html'); }
    if (!existsSync(path)) path = join(root, 'index.html');
    res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(readFileSync(path));
  } catch (e) { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '0.0.0.0', () => console.log('Serving ' + root + ' on :' + port));
"
