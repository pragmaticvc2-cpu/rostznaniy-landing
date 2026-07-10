import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const clientDir = path.join(dist, "client");

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "server"), { recursive: true });
await mkdir(clientDir, { recursive: true });
await mkdir(path.join(dist, ".openai"), { recursive: true });

for (const entry of ["index.html", "styles.css", "script.js", "assets"]) {
  await cp(path.join(root, entry), path.join(clientDir, entry), { recursive: true });
}

await cp(
  path.join(root, ".openai", "hosting.json"),
  path.join(dist, ".openai", "hosting.json")
);

const serverSource = `function hasFileExtension(pathname) {
  return /\\/[^/]+\\.[^/]+$/.test(pathname);
}

function requestForPath(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

async function handler(request, env) {
  if (!env?.ASSETS?.fetch) {
    return new Response("Assets binding unavailable", { status: 500 });
  }

  const url = new URL(request.url);
  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404 || hasFileExtension(url.pathname)) {
    return assetResponse;
  }

  return env.ASSETS.fetch(requestForPath(request, "/index.html"));
}

export default {
  fetch: handler
};

export { handler };
`;

await writeFile(path.join(dist, "server", "index.js"), serverSource);
