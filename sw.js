/* GenoEvidence · modo offline do aplicativo
   - Páginas, estilos, scripts e dados: sempre busca a versão mais nova quando há internet
     e guarda uma cópia; sem internet, usa a cópia guardada.
   - Imagens, ícones e fontes: usa a cópia guardada (carrega rápido) e atualiza em segundo plano.
   Ao mudar a lista BASICO, aumente a VERSAO. */
const VERSAO = "genoevidence-v3";
const BASICO = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/css/base.css",
  "assets/css/inicio.css",
  "assets/css/artigo.css",
  "assets/js/app.js",
  "assets/js/dna.js",
  "assets/js/inicio.js",
  "assets/js/artigo.js",
  "assets/js/pwa.js",
  "data/estudos.json",
  "data/noticias.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "estudos/r337h/",
  "estudos/r337h/r337h.js",
  "estudos/micrurus-spixii/",
  "estudos/micrurus-spixii/artigo.json"
];
const CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSAO);
    await Promise.all(BASICO.map(u => c.add(u).catch(() => {})));
    await Promise.all(CDN.map(u => fetch(u, { mode: "cors" }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSAO) await caches.delete(k);
    await self.clients.claim();
  })());
});

const ehImagem = url => /\.(webp|png|jpe?g|gif|svg|ico|woff2?)$/i.test(url.pathname);

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const mesmoSite = url.origin === location.origin;
  const externoPermitido = /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (!mesmoSite && !externoPermitido) return; // notícias, revistas etc. vão direto para a internet

  if (mesmoSite && !ehImagem(url)) {
    // rede primeiro: conteúdo sempre atualizado; sem internet, a cópia guardada
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); }
      return r;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) ||
      (req.mode === "navigate" ? caches.match("./") : Response.error())));
    return;
  }
  // imagens, fontes e bibliotecas: cópia guardada primeiro, atualiza em segundo plano
  e.respondWith(caches.open(VERSAO).then(async c => {
    const hit = await c.match(req, { ignoreSearch: mesmoSite });
    const rede = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || rede;
  }));
});
