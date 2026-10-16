/**
 * Minimal static server for local preview of the harness. No framework, no host
 * allow-list, no build step — just the files in this repository.
 *
 * Usage: node tools/serve.mjs [port] [root]
 */
import { createServer } from "node:http";
import { readFile, stat, realpath } from "node:fs/promises";
import { extname, join, relative, resolve, isAbsolute } from "node:path";

const port = Number(process.argv[2] ?? process.env.PORT ?? 3000);
const root = resolve(process.argv[3] ?? ".");
const host = process.env.HOST ?? "127.0.0.1";
const rootReal = await realpath(root);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".zip": "application/zip",
  ".md": "text/markdown; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/harness/index.html";
    // Prevent path traversal outside the served root.
    const target = resolve(root, `.${path}`);
    const rel = relative(root, target);
    if (rel.startsWith('..') || isAbsolute(rel) || path.split(/[/\\]/).some(part => part.startsWith('.'))) {
      res.writeHead(403).end("forbidden");
      return;
    }
    let finalPath = target;
    const info = await stat(finalPath).catch(() => null);
    if (info?.isDirectory()) finalPath = join(finalPath, "index.html");
    const actual = await realpath(finalPath);
    const actualRel = relative(rootReal, actual);
    if (actualRel.startsWith('..') || isAbsolute(actualRel)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    const body = await readFile(finalPath);
    res.writeHead(200, {
      "content-type": MIME[extname(finalPath)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
});

server.listen(port, host, () => {
  console.log(`serving ${root} on http://${host}:${port}/`);
});
