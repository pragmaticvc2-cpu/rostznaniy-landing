import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const publicDir = path.join(dist, "public");

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "server"), { recursive: true });
await mkdir(publicDir, { recursive: true });
await mkdir(path.join(dist, ".openai"), { recursive: true });

for (const entry of ["index.html", "styles.css", "script.js", "assets"]) {
  await cp(path.join(root, entry), path.join(publicDir, entry), { recursive: true });
}

await cp(
  path.join(root, ".openai", "hosting.json"),
  path.join(dist, ".openai", "hosting.json")
);

const serverSource = `import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const publicDir = path.resolve("dist/public");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function typeFor(filePath) {
  return contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function resolvePublicAsset(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  let relativePath = decodedPath.replace(/^\\/+/, "");
  if (!relativePath || relativePath.endsWith("/")) {
    relativePath += "index.html";
  }

  const candidate = path.resolve(publicDir, relativePath);
  if (candidate !== publicDir && !candidate.startsWith(publicDir + path.sep)) {
    return null;
  }

  try {
    const fileStat = await stat(candidate);
    if (fileStat.isFile()) {
      return candidate;
    }
    if (fileStat.isDirectory()) {
      return path.join(candidate, "index.html");
    }
  } catch {
    return null;
  }

  return null;
}

async function handler(request) {
  const url = new URL(request.url);
  const assetPath = await resolvePublicAsset(url.pathname);
  const filePath = assetPath || path.join(publicDir, "index.html");

  try {
    const body = await readFile(filePath);
    const isHtml = path.basename(filePath) === "index.html";
    return new Response(body, {
      headers: {
        "content-type": typeFor(filePath),
        "cache-control": isHtml ? "no-cache" : "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export default {
  fetch: handler
};

export { handler };
`;

await writeFile(path.join(dist, "server", "index.js"), serverSource);
