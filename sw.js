/* GenoEvidence · modo offline do aplicativo
   - Páginas, estilos, scripts e dados: sempre busca a versão mais nova quando há internet
     e guarda uma cópia; sem internet, usa a cópia guardada.
   - Imagens, ícones e fontes: usa a cópia guardada (carrega rápido) e atualiza em segundo plano.
   Ao mudar a lista BASICO, aumente a VERSAO. */
const VERSAO = "genoevidence-v12";
const BASICO = [
  "./",
  "index.html",
  "noticias/",
  "artigos/",
  "revistas/",
  "sobre/",
  "manifest.webmanifest",
  "assets/css/shell.css",
  "assets/css/base.css",
  "assets/css/artigo.css",
  "assets/js/shell.js",
  "assets/js/app.js",
  "assets/js/dna.js",
  "assets/js/artigo.js",
  "assets/js/pwa.js",
  "assets/js/hero3d.js",
  "data/artigos.json",
  "data/noticias.json",
  "data/frases.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "icons/logo-128.png",
  "r337h/",
  "r337h/r337h.js",
  "artigos/micrurus-spixii/",
  "artigos/micrurus-spixii/artigo.json",
  "artigos/ibrutinibe-leucemia/",
  "artigos/ibrutinibe-leucemia/artigo.json",
  "artigos/curativo-celulose-nisina/",
  "artigos/curativo-celulose-nisina/artigo.json",
  "artigos/sintese-qualitativa-ats/",
  "artigos/sintese-qualitativa-ats/artigo.json",
  "artigos/cosmeticos-antienvelhecimento/",
  "artigos/cosmeticos-antienvelhecimento/artigo.json",
  "artigos/erlotinibe-gefitinibe/",
  "artigos/erlotinibe-gefitinibe/artigo.json",
  "artigos/bacteria-metais-pesados/",
  "artigos/bacteria-metais-pesados/artigo.json",
  "artigos/arcabouco-osso/",
  "artigos/arcabouco-osso/artigo.json",
  "artigos/juca-nanocelulose/",
  "artigos/juca-nanocelulose/artigo.json",
  "artigos/ia-conitec/",
  "artigos/ia-conitec/artigo.json",
  "artigos/celulose-remedios-agua/",
  "artigos/celulose-remedios-agua/artigo.json",
  "artigos/tp53-egfr-pulmao/",
  "artigos/tp53-egfr-pulmao/artigo.json"
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
