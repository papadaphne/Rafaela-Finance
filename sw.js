self.addEventListener("install", (event) => {
  self.skipWaiting();
  console.log("Service Worker installed");
});

self.addEventListener("activate", (event) => {
  clients.claim();
  console.log("Service Worker activated");
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // 🚫 Jangan intercept request ke Firebase / Firestore
  if (url.includes("firestore.googleapis.com") || url.includes("firebase")) {
    return;
  }

  // ✅ Cache-first strategy untuk asset lokal
  event.respondWith(
    caches.open("rafaela-cache").then((cache) =>
      cache.match(event.request).then((response) => {
        return (
          response ||
          fetch(event.request).then((networkResponse) => {
            // hanya cache GET request
            if (event.request.method === "GET" && networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
        );
      })
    )
  );
});
