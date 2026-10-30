// @ts-nocheck -- service worker: roda no escopo do worker, sem os tipos do DOM do app (ADR-002)
// Service worker do PWA (#408).
//
// Deixa o app abrir sem rede, que é o que faz o ícone da tela de início do
// iPhone se comportar como app e não como site. Os dados não passam por aqui:
// moram no localStorage e sincronizam pelo WebSocket, que o service worker
// não intercepta.
//
// - Página (navegação): rede primeiro, e a última cópia boa se não houver
//   rede. Assim cada deploy chega na próxima abertura com rede.
// - Bundle, fontes e ícones: cache primeiro. Os nomes levam hash do
//   conteúdo, então o que está guardado nunca fica velho.
// - `/api/` e outras origens: passam direto.
//
// `__VERSAO__` e `__PRECACHE__` são trocados no build pelo
// `scripts/stamp-sw.mjs`: a versão muda a cada deploy, o que reinstala o
// service worker e apaga o cache do deploy anterior.

const VERSAO = "__VERSAO__";
const PRECACHE = /*__PRECACHE__*/ ["/"];
const CACHE = `bot-${VERSAO}`;
const PAGINA = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes
            .filter((n) => n.startsWith("bot-") && n !== CACHE)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const imutavel = (path) =>
  path.startsWith("/_expo/static/") ||
  path.startsWith("/assets/") ||
  path.startsWith("/icons/");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(PAGINA, copia));
          }
          return resp;
        })
        .catch(() => caches.match(PAGINA).then((r) => r ?? Response.error())),
    );
    return;
  }

  if (imutavel(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (guardado) =>
          guardado ??
          fetch(req).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return resp;
          }),
      ),
    );
  }
});
