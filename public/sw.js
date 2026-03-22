const CACHE = 'warm-fuzzies-v2'
const API_CACHE = 'warm-fuzzies-api-v2'

// On install: cache the app shell (index.html)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.add('/'))
      .then(() => self.skipWaiting())
  )
})

// On activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== API_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle http(s) requests from same origin or API
  if (!url.protocol.startsWith('http')) return

  // API write requests — pass through, don't cache
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') return

  // API GET requests — network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(API_CACHE).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' },
          })
        })
    )
    return
  }

  // Navigation requests — network first, fall back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request) || await caches.match('/')
          return cached || fetch(request)
        })
    )
    return
  }

  // Static assets — cache first, network fallback
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request)
        .then(response => {
          if (response.ok && request.method === 'GET') {
            const clone = response.clone()
            caches.open(CACHE).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          // Return empty 204 rather than undefined to avoid Safari errors
          return new Response('', { status: 204 })
        })
    })
  )
})
