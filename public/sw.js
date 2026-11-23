// Service worker mínimo de Hogar: página offline y caché de estáticos.
// Los datos siempre van a la red (son compartidos y en tiempo real).
const VERSION = "hogar-v3"
const OFFLINE_URL = "/offline"
const PRECACHE = [
  OFFLINE_URL,
  "/sprites/michi.svg",
  "/sprites/michi-durmiendo.svg",
  "/sprites/michi-negro.svg",
  "/sprites/michi-negro-durmiendo.svg",
  "/sprites/carita-naranja.svg",
  "/sprites/carita-negro.svg",
  "/sprites/moneda.svg",
  "/sprites/nubes.svg",
  "/sprites/estrellas.svg",
  "/sprites/suelo-dia.svg",
  "/sprites/suelo-noche.svg",
  "/sprites/tierra-dia.svg",
  "/sprites/tierra-noche.svg",
  "/icons/icon-192.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navegación: red primero; sin conexión, la página offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Estáticos versionados, sprites e íconos: caché primero.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/sprites/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(VERSION).then((cache) => cache.put(request, copy))
            }
            return res
          }),
      ),
    )
  }
})
