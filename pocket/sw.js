// StudyHub Pocket's offline part: the app's own files, kept so it opens without a connection. It answers from what it kept at once and
// fetches a fresh copy behind it, so a new version shows at the next start. The student's data is never here: it lives in the page's own
// storage (IndexedDB), and this worker only ever sees the app's files.
const CACHE = "studyhub-pocket-1";
const FILES = ["./", "index.html", "app.css", "app.js", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png",
  "fonts/Inter-Regular.woff2", "fonts/Inter-SemiBold.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const kept = await c.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then((r) => {
      if (r.ok) c.put(e.request, r.clone());
      return r;
    });
    if (kept) {
      e.waitUntil(fresh.catch(() => null));
      return kept;
    }
    return fresh.catch(() => c.match("./"));
  }));
});
