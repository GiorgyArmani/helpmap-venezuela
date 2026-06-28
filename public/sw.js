/* HelpMap Venezuela — offline-first service worker.
 *
 * Goal: the app must open and show the last-loaded data even with no internet,
 * using the cache left from the user's previous connection.
 *
 *   - Navigations            → network-first, fall back to the cached app shell,
 *                              and finally to a built-in offline page.
 *   - Same-origin assets     → stale-while-revalidate (instant + refresh in bg).
 *   - Supabase REST (reads)  → stale-while-revalidate so data shows offline.
 *   - Map tiles + Leaflet    → cache-first (areas viewed before render offline).
 *
 * Bump CACHE_VERSION to discard old caches on the next visit.
 */
const CACHE_VERSION = "v3";
const SHELL_CACHE = `helpmap-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `helpmap-static-${CACHE_VERSION}`;
const TILE_CACHE = `helpmap-tiles-${CACHE_VERSION}`;
const DATA_CACHE = `helpmap-data-${CACHE_VERSION}`;
const KEEP = [SHELL_CACHE, STATIC_CACHE, TILE_CACHE, DATA_CACHE];

const TILE_HOSTS = ["basemaps.cartocdn.com", "unpkg.com"];
const PRECACHE = ["/", "/login", "/manifest.webmanifest", "/ico.png"];

const OFFLINE_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HelpMap — sin conexión</title>
<style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f7f8f9;color:#16191f;text-align:center;padding:24px}
.b{max-width:340px}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#7b818c;line-height:1.5}
a{display:inline-block;margin-top:16px;background:#15181d;color:#fff;text-decoration:none;
padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600}</style></head>
<body><div class="b"><h1>Sin conexión</h1>
<p>No hay conexión y esta página no está en caché todavía. Abre el mapa cuando tengas internet al menos una vez.</p>
<a href="/">Reintentar</a></div></body></html>`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Cache each shell URL independently so one failure doesn't abort the rest.
      Promise.allSettled(PRECACHE.map((u) => cache.add(u))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function shouldCache(res) {
  return res && (res.ok || res.type === "opaque");
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (shouldCache(res)) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request).catch(() => null);
  if (shouldCache(res)) cache.put(request, res.clone());
  return res || Response.error();
}

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    if (shouldCache(fresh)) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match("/")) ||
      new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // App navigations → keep the last working shell available offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstShell(request));
    return;
  }

  // Supabase public reads (PostgREST) → SWR so data renders offline.
  // Never cache the auth endpoints.
  if (url.hostname.endsWith(".supabase.co")) {
    if (url.pathname.startsWith("/rest/v1/")) {
      event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    }
    return;
  }

  // Map basemap tiles and Leaflet from CDN → cache-first.
  if (TILE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h))) {
    event.respondWith(cacheFirst(request, TILE_CACHE));
    return;
  }

  // Everything else same-origin (Next chunks, CSS, icons) → SWR.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});
