/*
 * Service worker do GenoLab instalado. Propositalmente mínimo:
 *  - guarda só a página "sem conexão" e o ícone;
 *  - NUNCA guarda páginas, dados de projetos, arquivos ou respostas da API (privacidade);
 *  - sem internet, uma navegação mostra o aviso em vez de uma tela de erro do navegador.
 */
const CACHE = "genolab-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/brand/geno-evidence-simbolo-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // só navegações de página; dados, arquivos e API passam direto, sem cache
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
