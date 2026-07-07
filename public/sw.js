const CACHE_NAME = "finanzas-v1"
const API_PATTERN = /\/api\//

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME))
})

self.addEventListener("fetch", (event) => {
  if (API_PATTERN.test(event.request.url)) {
    return
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        if (fetchResponse.ok && event.request.method === "GET") {
          const copy = fetchResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return fetchResponse
      })
    })
  )
})