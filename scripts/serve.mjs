import { createServer } from 'node:http';
import { watch } from 'node:fs';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { build, projectRoot, outputRoot } from './build.mjs';

await build();
const clients = new Set();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const refreshScript = '<script>const previewUpdates = new EventSource("/__preview_events"); previewUpdates.onmessage = () => location.reload();</script>';
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
  catch { response.writeHead(400); response.end('Invalid URL'); return; }
  if (pathname === '/__preview_events') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    response.write(': connected\n\n'); clients.add(response); request.on('close', () => clients.delete(response)); return;
  }
  let path = resolve(outputRoot, '.' + pathname);
  if (path !== outputRoot && !path.startsWith(outputRoot + sep)) { response.writeHead(403); response.end('Forbidden'); return; }
  try {
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    let content = await readFile(path);
    const type = types[extname(path)] || 'application/octet-stream';
    if (type.startsWith('text/html')) content = Buffer.from(content.toString().replace('</body>', refreshScript + '</body>'));
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Page not found.'); }
});

let timer;
let building = false;
let pending = false;
async function rebuild() {
  if (building) { pending = true; return; }
  building = true;
  try {
    const result = await build();
    console.log(`Updated preview: ${result.images}/${result.publications} paper images.`);
    for (const client of clients) client.write('data: updated\n\n');
  } catch (error) { console.error(`Preview update failed: ${error.message}`); }
  finally { building = false; if (pending) { pending = false; await rebuild(); } }
}
const watchers = ['content', 'src', 'assets'].map(directory => watch(resolve(projectRoot, directory), { recursive: true }, () => {
  clearTimeout(timer); timer = setTimeout(rebuild, 180);
}));
server.on('error', error => { console.error(error.message); process.exitCode = 1; for (const watcher of watchers) watcher.close(); });
server.listen(4173, '127.0.0.1', async () => {
  await mkdir(resolve(projectRoot, '.sites-runtime'), { recursive: true });
  await writeFile(resolve(projectRoot, '.sites-runtime/local-preview.json'), JSON.stringify({ pid: process.pid, url: 'http://127.0.0.1:4173/', projectRoot }, null, 2));
  console.log('Local: http://127.0.0.1:4173/');
  console.log('Content and style changes refresh this preview automatically.');
});
function shutdown() {
  for (const watcher of watchers) watcher.close();
  for (const client of clients) client.end();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
