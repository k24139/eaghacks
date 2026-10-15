/**
 * Minimal static server for local preview of the harness. No framework, no host
 * allow-list, no build step — just the files in this repository.
 *
 * Usage: node tools/serve.mjs [port] [root]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const port = Number(process.argv[2] ?? process.env.PORT ?? 3000);
const root = resolve(process.argv[3] ?? ".");
const host = "0.0.0.0";

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
    const target = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ""));
    if (!target.startsWith(root)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    let finalPath = target;
    const info = await stat(finalPath).catch(() => null);
    if (info?.isDirectory()) finalPath = join(finalPath, "index.html");
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
