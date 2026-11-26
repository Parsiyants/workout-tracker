// Прод-сервер: статика из dist + прокси /api и /files. Без зависимостей.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 80);
const ROOT = fileURLToPath(new URL("./dist/", import.meta.url));
const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8000";
const STORAGE_URL = process.env.STORAGE_URL || "http://storage:8010";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function cacheHeader(pathname) {
  if (pathname.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  if (pathname.startsWith("/icons/")) return "public, max-age=604800";
  if (pathname === "/sw.js" || pathname === "/manifest.webmanifest") return "no-cache";
  return "no-cache";
}

function proxy(req, res, base, extraHeaders = {}) {
  const target = new URL(req.url, base);
  const headers = { ...req.headers, host: target.host };
  delete headers["accept-encoding"];

  const upstream = httpRequest(
    { hostname: target.hostname, port: target.port, path: target.pathname + target.search, method: req.method, headers },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, { ...upstreamRes.headers, ...extraHeaders });
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("upstream unavailable");
  });

  req.pipe(upstream);
}

async function serveStatic(req, res, pathname) {
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  let filePath = join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) filePath = join(ROOT, "index.html");

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, "index.html");
    await stat(filePath);
  } catch {
    // SPA fallback
    filePath = join(ROOT, "index.html");
  }

  const info = await stat(filePath);
  res.writeHead(200, {
    "content-type": TYPES[extname(filePath)] || "application/octet-stream",
    "cache-control": cacheHeader("/" + safePath),
    "content-length": info.size,
  });
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url || "/", "http://localhost");

  if (pathname.startsWith("/api/")) {
    proxy(req, res, BACKEND_URL);
    return;
  }
  if (pathname.startsWith("/files/")) {
    // имена файлов — uuid, содержимое неизменяемо: браузер кэширует их надолго
    proxy(req, res, STORAGE_URL, {
      "cache-control": "public, max-age=31536000, immutable",
    });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end("method not allowed");
    return;
  }

  serveStatic(req, res, pathname).catch(() => {
    if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
    res.end("internal error");
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`tracker web on :${PORT}`);
});
