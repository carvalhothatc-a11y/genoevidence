/* GenoEvidence: guarda o site no aparelho para abrir rápido e funcionar sem internet */
const VERSION='genoevidence-2d66c3288f';
const APP=["./", "index.html", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "imagens/clinvar-condicoes.webp", "imagens/clinvar-descricao.webp", "imagens/clinvar-evidencias.webp", "imagens/clinvar-submissoes.webp", "imagens/dynamut2-contatos-normal.webp", "imagens/dynamut2-mutante-his337.webp", "imagens/dynamut2-normal-arg337.webp", "imagens/dynamut2-resultado.webp", "imagens/dynamut2-vista-mutante.webp", "imagens/gnomad-frequencia.webp", "imagens/tp53db-estrutura-3d.webp", "imagens/tp53db-registros.webp", "imagens/tp53db-sitios.webp", "imagens/mini/clinvar-condicoes.webp", "imagens/mini/clinvar-descricao.webp", "imagens/mini/clinvar-evidencias.webp", "imagens/mini/clinvar-submissoes.webp", "imagens/mini/dynamut2-contatos-normal.webp", "imagens/mini/dynamut2-mutante-his337.webp", "imagens/mini/dynamut2-normal-arg337.webp", "imagens/mini/dynamut2-resultado.webp", "imagens/mini/dynamut2-vista-mutante.webp", "imagens/mini/gnomad-frequencia.webp", "imagens/mini/tp53db-estrutura-3d.webp", "imagens/mini/tp53db-registros.webp", "imagens/mini/tp53db-sitios.webp"];
const CDN=['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(VERSION);await c.addAll(APP);
  await Promise.all(CDN.map(u=>fetch(u,{mode:'cors'}).then(r=>r.ok&&c.put(u,r)).catch(()=>{})));self.skipWaiting();})());});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==VERSION)await caches.delete(k);await self.clients.claim();})());});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);
  // página: tenta a versão mais nova; sem internet, abre a guardada
  if(req.mode==='navigate'){e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(VERSION).then(c=>c.put('./',cp));return r;}).catch(()=>caches.match('./').then(r=>r||caches.match('index.html'))));return;}
  // imagens, ícones, bibliotecas e fontes: usa o que está guardado e atualiza em segundo plano
  const same=url.origin===location.origin,cdn=/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if(!same&&!cdn)return;
  e.respondWith(caches.open(VERSION).then(async c=>{const hit=await c.match(req,{ignoreSearch:same});
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r;}).catch(()=>hit);
    return hit||net;}));});
