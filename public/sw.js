/* Siraj service worker — installability + static-asset resilience only.
 *
 * NEVER cached (always network passthrough):
 *  - /api/* (JSON, auth, sessions)
 *  - /admin/*, /dashboard/*, /auth/* (private pages)
 *  - /certificates/*, /verify (personal certificate data)
 *  - anything non-GET or cross-origin
 * Cached (cache-first, static assets only):
 *  - /_next/static/* (hashed build assets)
 *  - same-origin images/fonts + manifest/icons
 * No offline-learning claims: dynamic pages always hit the network.
 */

const CACHE = "siraj-static-v1";

const PRIVATE_PREFIXES = ["/api/", "/admin", "/dashboard", "/auth", "/certificates", "/verify"];

function isCacheable(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  for (const prefix of PRIVATE_PREFIXES) {
    if (path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : prefix + "/")) return false;
  }
  if (path.startsWith("/_next/static/")) return true;
  if (path === "/manifest.webmanifest" || path === "/favicon.ico" || path === "/icon.png" || path === "/apple-icon.png") return true;
  if (path.startsWith("/icons/")) return true;
  return /\.(png|jpe?g|webp|svg|gif|woff2?|ttf|otf)$/i.test(path);
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (!isCacheable(url)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request, { ignoreSearch: false });
      if (hit) return hit;
      const response = await fetch(request);
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })()
  );
});
