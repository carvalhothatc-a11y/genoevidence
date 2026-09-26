/* GenoEvidence · estudo R337H: gráficos, 3D, mapa e interações desta página */
(function(){
"use strict";
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = {arg:'#4D7CFF', his:'#FF5470', amber:'#FFB23F', text:'#E7ECF6', muted:'#8D9AB5', dim:'#5B6883', line:'#1B2742', line2:'#27365A', panel2:'#0F182B', ink:'#060A13'};
const NS='http://www.w3.org/2000/svg';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function el(tag,attrs,parent,text){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!=null)e.textContent=text;if(parent)parent.appendChild(e);return e;}
function onSeen(node,fn,th){if(!('IntersectionObserver' in window)){fn();return;}const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){io.disconnect();fn();}})},{threshold:th||.25});io.observe(node);}
function grow(nodes,delay){if(RM)return;nodes.forEach((n,i)=>n.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:900,delay:(delay||0)+i*60,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));}
/* idiomas: na versão em inglês ou espanhol (r337h/en/, r337h/es/), os textos passam pelo dicionário de r337h-i18n.js */
const GI=window.GE_I18N,LG=GI?GI.lang:'pt',T=s=>(GI&&LG!=='pt')?GI.t(s):s;
const BASE=(document.querySelector('meta[name="r337h-base"]')||{}).content||'';
const fmt=(n,d)=>n.toLocaleString(GI?GI.locale:'pt-BR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});

/* ---------------- Glossário ---------------- */
const GLOSS={
 alelo:['Alelo','Cada uma das duas cópias de um gene que temos (uma vem do pai, outra da mãe). O gnomAD conta cópias, não pessoas.'],
 aminoacido:['Aminoácido','As “peças” que formam uma proteína, encaixadas em fila. A p53 tem 393 delas.'],
 autossomica:['Herança autossômica dominante','Basta herdar uma cópia alterada do gene, de um dos pais, para ter a predisposição. Cada filho de um portador tem 50% de chance de herdá-la.'],
 codon:['Códon','Um trio de letras do DNA que indica qual aminoácido entra na proteína.'],
 ddg:['ΔΔG (delta-delta G)','Número que estima quanto uma mutação muda a estabilidade de uma proteína, em kcal/mol. No DynaMut2, valor negativo significa proteína menos estável.'],
 fundador:['Efeito fundador','Quando uma variante se espalha numa população a partir de antepassados em comum e fica bem mais frequente ali do que no resto do mundo.'],
 gene:['Gene','Um trecho do DNA com as instruções para fabricar uma proteína, como uma receita.'],
 germinativa:['Variante germinativa','Alteração presente desde o nascimento em todas as células do corpo, que pode passar para os filhos. É diferente da somática, que surge só no tumor.'],
 haplotipo:['Haplótipo','Um conjunto de variantes vizinhas no DNA herdadas juntas. Funciona como uma “assinatura” de ancestralidade.'],
 homozigoto:['Homozigoto','Pessoa que herdou a mesma variante do pai e da mãe, ou seja, com as duas cópias do gene alteradas.'],
 insilico:['In silico','Estudo feito no computador, com bancos de dados e programas, sem experimentos de laboratório. O nome vem de “silício”, material dos chips.'],
 missense:['Missense','Troca de uma única letra do DNA que substitui um aminoácido da proteína por outro.'],
 patogenica:['Patogênica','Variante considerada causadora de doença. “Provavelmente patogênica” indica forte suspeita, com um pouco menos de certeza.'],
 penetrancia:['Penetrância','A proporção de portadores que de fato desenvolvem a doença. Penetrância incompleta significa que nem todo portador vai adoecer.'],
 slf:['Síndrome de Li-Fraumeni (SLF)','Condição hereditária rara que aumenta muito o risco de vários tipos de câncer ao longo da vida, causada principalmente por alterações no gene TP53.'],
 tetramerizacao:['Tetrâmero / tetramerização','Tetrâmero é um grupo de quatro cópias da mesma proteína. O domínio de tetramerização (peças 323 a 356, aprox.) é a parte da p53 que une essas quatro cópias.'],
 tp53:['TP53 e p53','TP53 é o nome do gene; p53 é a proteína que ele fabrica. A p53 protege as células contra o câncer e é chamada de “guardiã do genoma”.'],
 variante:['Variante (mutação)','Qualquer diferença no DNA em relação à sequência de referência. Pode ser inofensiva ou causar doença. “Mutação” é o nome popular.'],
 hgvs:['HGVS','Padrão internacional para escrever o nome de uma variante. “c.” indica a posição no DNA; “p.” indica a mudança na proteína.',1],
 mane:['MANE Select','Versão de referência do gene, padronizada internacionalmente, usada para dar nomes consistentes às variantes.',1]
};
for(const k in GLOSS){GLOSS[k][0]=T(GLOSS[k][0]);GLOSS[k][1]=T(GLOSS[k][1]);}
/* glossário */
(function(){const dl=$('#gloss'),inp=$('#glossSearch'),cnt=$('#glossCount');const keys=Object.keys(GLOSS).filter(k=>!GLOSS[k][2]).sort((a,b)=>GLOSS[a][0].localeCompare(GLOSS[b][0],LG));
  keys.forEach(k=>{const d=document.createElement('div');d.id='gl-'+k;d.innerHTML='<dt>'+GLOSS[k][0]+'</dt><dd>'+GLOSS[k][1]+'</dd>';d.dataset.s=(GLOSS[k][0]+' '+GLOSS[k][1]).toLowerCase();dl.appendChild(d);});
  const upd=()=>{const v=inp.value.trim().toLowerCase();let n=0;dl.querySelectorAll('div').forEach(d=>{const ok=!v||d.dataset.s.includes(v);d.hidden=!ok;if(ok)n++;});cnt.textContent=n+' '+T(n===1?'termo':'termos');};inp.addEventListener('input',upd);upd();})();
/* navegação precisa: todo link interno rola até o ponto certo e destaca o destino */
function goTo(id){const t=document.querySelector(id);if(!t)return false;const hud=document.querySelector('.hud').offsetHeight;let off=hud+14;
  if(t.closest('#evidencias')&&t.id!=='evidencias')off+=$('#evTabs').offsetHeight;
  const y=id==='#top'?0:t.getBoundingClientRect().top+scrollY-off;window.scrollTo({top:y,behavior:RM?'auto':'smooth'});
  if(!t.matches('section.s,#top')){t.classList.remove('flash-target');void t.offsetWidth;t.classList.add('flash-target');setTimeout(()=>t.classList.remove('flash-target'),1900);}
  try{history.replaceState(null,'',id==='#top'?location.pathname+location.search:id);}catch(_){}return true;}
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a||a.classList.contains('cite'))return;const id=a.getAttribute('href');if(id.length<2)return;if(goTo(id))e.preventDefault();});
/* resposta ao toque: ondulação em botões e cartões */
document.addEventListener('pointerdown',e=>{if(RM)return;const t=e.target.closest('.menu-btn,.dr-item,.dr-sub,.gal-filter button,.fact[data-href],.gap-chain a,.cta,.nav a,.ev-tabs a,.story-card,a.fact,a.step,a.cg,a.chip,.fig,.swap-btn,.seg button,.site,.datasrc a,.totop,.readout-link,.more');if(!t)return;
  t.classList.add('rpl');const r=t.getBoundingClientRect(),d=Math.max(r.width,r.height)*2.2,sp=document.createElement('span');sp.className='ripple';
  sp.style.cssText='width:'+d+'px;height:'+d+'px;left:'+(e.clientX-r.left-d/2)+'px;top:'+(e.clientY-r.top-d/2)+'px';t.appendChild(sp);setTimeout(()=>sp.remove(),650);});
/* números de referência vizinhos viram um só grupo: 3,10,14 */
(function(){const seen=new Set();$$('a.cite').forEach(a=>{if(seen.has(a))return;const grp=[a];let n=a.nextSibling;
  while(n&&((n.nodeType===1&&n.classList&&n.classList.contains('cite'))||(n.nodeType===3&&!n.textContent.trim()))){if(n.nodeType===1)grp.push(n);n=n.nextSibling;}
  grp.forEach(x=>seen.add(x));const w=document.createElement('sup');w.className='cites';a.before(w);grp.forEach((x,i)=>{if(i)w.append(',');w.appendChild(x);});});})();
$$('.fact[data-href]').forEach(c=>c.addEventListener('click',e=>{if(e.target.closest('a,button'))return;goTo(c.dataset.href);}));
/* imagens da pesquisa (capturas de tela das plataformas) */
const IMGS=[
 {id:'clinvar-submissoes',p:'ClinVar',t:'Figura 1 · As 6 avaliações dos laboratórios',c:'Tabela do ClinVar com as seis avaliações: cinco “Pathogenic” (patogênica) e uma “Likely pathogenic” (provavelmente patogênica), todas de origem germinativa e feitas por testes clínicos.'},
 {id:'clinvar-condicoes',p:'ClinVar',t:'Condições ligadas à variante',c:'Além da Síndrome de Li-Fraumeni (6 avaliações), a R337H aparece ligada à síndrome hereditária de predisposição ao câncer (4), ao carcinoma adrenocortical pediátrico e hereditário, à neoplasia de mama, entre outras.'},
 {id:'clinvar-evidencias',p:'ClinVar',t:'Aba de evidências',c:'Resumo das submissões (origem germinativa, testagem clínica) e artigos científicos citados como evidência pelos laboratórios.'},
 {id:'clinvar-descricao',p:'ClinVar',t:'Justificativa de um laboratório',c:'Texto do laboratório Labcorp explicando a classificação: a variante foi vista em pessoas com vários tipos de câncer, acompanha a doença dentro das famílias e estudos mostram que ela afeta a função da p53.'},
 {id:'gnomad-frequencia',p:'gnomAD',t:'Figura 2 · Frequência na população',c:'Página da variante 17-7670699-C-T no gnomAD v4.1.1: 5 cópias com a variante entre 1.613.858 analisadas, nenhuma pessoa homozigota e maior frequência no grupo Admixed American.'},
 {id:'dynamut2-resultado',p:'DynaMut2',t:'Figura 3 · Resultado do cálculo',c:'Resultado do DynaMut2: variação de estabilidade prevista (ΔΔG) de −0,94 kcal/mol, classificada como desestabilizante. Abaixo, os tipos de ligação que o programa desenha.'},
 {id:'dynamut2-normal-arg337',p:'DynaMut2',t:'Figura 4 · p53 normal (Arg337)',c:'Ligações ao redor da arginina 337 na proteína normal. Cada linha pontilhada colorida é um tipo de ligação com uma peça vizinha.'},
 {id:'dynamut2-mutante-his337',p:'DynaMut2',t:'Figura 5 · p53 mutante (histidina 337)',c:'Ligações ao redor da histidina 337 na proteína mutante. O padrão de ligações muda em relação à versão normal.'},
 {id:'dynamut2-contatos-normal',p:'DynaMut2',t:'Painel de contatos · versão normal',c:'Tela de contatos do DynaMut2 com a estrutura normal (“Wild-type”) e a lista de tipos de ligação que podem ser exibidos.'},
 {id:'dynamut2-vista-mutante',p:'DynaMut2',t:'Vista da hélice · versão mutante',c:'Outra vista da região com a histidina 337, mostrando a hélice inteira e as peças vizinhas ARG335, MET340 e PHE341.'},
 {id:'tp53db-registros',p:'TP53 Database',t:'Figura 6 · Registros germinativos',c:'Resultado da busca no TP53 Database: pessoas com a variante c.1010G>A (p.R337H), com país, local do tumor, tipo de tumor e artigo de origem.'},
 {id:'tp53db-sitios',p:'TP53 Database',t:'Figura 7 · Locais dos tumores',c:'Os 150 registros por local do tumor: glândula adrenal 92 (61,33%), mama 21 (14,00%), cérebro 16 (10,67%) e outros locais com frequências menores.'},
 {id:'tp53db-estrutura-3d',p:'TP53 Database',t:'Estrutura 3D da p53',c:'Visualizador 3D (JSmol) do TP53 Database mostrando a proteína p53 em fitas e, em linhas finas, a molécula de DNA. A legenda indica cores por frequência de mutação: alta, média e baixa.'}];
IMGS.forEach(o=>{o.t=T(o.t);o.c=T(o.c);});
const IMG=Object.fromEntries(IMGS.map(o=>[o.id,o]));
function figBtn(o){const b=document.createElement('button');b.type='button';b.className='fig';b.dataset.cap=o.t+' — '+o.c+' '+T('Fonte:')+' '+o.p+' (2026).';
  b.innerHTML='<img src="'+BASE+'imagens/mini/'+o.id+'.webp" data-full="'+BASE+'imagens/'+o.id+'.webp" alt="'+o.t.replace(/"/g,'')+'" loading="lazy" decoding="async"><span class="fig-p">'+o.p+'</span><span><b>'+o.t+'</b></span>';return b;}
$$('.figs[data-figs]').forEach(box=>{box.setAttribute('data-gallery','');box.dataset.figs.split(',').forEach(id=>{if(IMG[id])box.appendChild(figBtn(IMG[id]));});});
(function(){const gal=$('#gallery'),fl=$('#galFilter');
  IMGS.forEach(o=>{const b=figBtn(o);b.classList.add('gcard');b.dataset.p=o.p;const d=document.createElement('span');d.className='gdesc';d.textContent=o.c;b.appendChild(d);gal.appendChild(b);});
  [T('Todas'),...new Set(IMGS.map(o=>o.p))].forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.textContent=p+' · '+(i?IMGS.filter(o=>o.p===p).length:IMGS.length);b.setAttribute('aria-pressed',String(!i));
    b.addEventListener('click',()=>{fl.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));gal.querySelectorAll('.gcard').forEach(c=>{c.hidden=!!i&&c.dataset.p!==p;});
      if(!RM)gal.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:320,easing:'ease-out'});});fl.appendChild(b);});})();
/* figuras ampliáveis, com setas, teclado e deslizar */
(function(){const lb=$('#lightbox'),im=$('#lbImg'),cap=$('#lbCap'),cnt=$('#lbCount'),x=$('#lbClose'),pv=$('#lbPrev'),nx=$('#lbNext');let last=null,grp=[],k=0;
  function show(i,dir){k=(i+grp.length)%grp.length;const b=grp[k],src=b.querySelector('img'),full=src.dataset.full||src.currentSrc||src.src;im.src=src.currentSrc||src.src;if(full!==im.src){const pre=new Image();pre.onload=()=>{if(grp[k]===b)im.src=full;};pre.src=full;}[grp[(k+1)%grp.length],grp[(k-1+grp.length)%grp.length]].forEach(n=>{const t=n&&n.querySelector('img');if(t&&t.dataset.full){const q=new Image();q.src=t.dataset.full;}});im.alt=src.alt;cap.textContent=b.dataset.cap||'';
    cnt.textContent=grp.length>1?(k+1)+' / '+grp.length:'';pv.hidden=nx.hidden=grp.length<2;
    if(!RM)im.animate([{transform:'translateX('+(dir||0)*28+'px) scale(.96)',opacity:0},{transform:'none',opacity:1}],{duration:300,easing:'cubic-bezier(.2,.8,.2,1)'});}
  document.addEventListener('click',e=>{const b=e.target.closest('.fig');if(!b||lb.contains(b))return;const g=b.closest('[data-gallery]');
    grp=(g&&!b.hasAttribute('data-gallery-solo'))?[...g.querySelectorAll('.fig')].filter(f=>!f.hidden):[b];last=b;lb.hidden=false;document.body.style.overflow='hidden';show(grp.indexOf(b),0);x.focus();});
  const close=()=>{lb.hidden=true;document.body.style.overflow='';if(last)last.focus();};
  x.addEventListener('click',close);pv.addEventListener('click',e=>{e.stopPropagation();show(k-1,-1);});nx.addEventListener('click',e=>{e.stopPropagation();show(k+1,1);});
  lb.addEventListener('click',e=>{if(e.target===lb)close();});
  addEventListener('keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')close();else if(grp.length>1&&e.key==='ArrowLeft')show(k-1,-1);else if(grp.length>1&&e.key==='ArrowRight')show(k+1,1);});
  let sx=null;lb.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;},{passive:true});
  lb.addEventListener('touchend',e=>{if(sx==null||grp.length<2)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>50)show(k+(dx<0?1:-1),dx<0?1:-1);});})();
const tip=$('#tip');let tipFor=null;
function showTip(b){const g=GLOSS[b.dataset.t];if(!g)return;tip.innerHTML='<b>'+g[0]+'</b>'+g[1];tip.classList.add('on');tipFor=b;
  const r=b.getBoundingClientRect(),tw=Math.min(300,innerWidth-32);tip.style.maxWidth=tw+'px';
  const th=tip.offsetHeight;let x=Math.max(16,Math.min(r.left,innerWidth-tw-16));let y=r.top-th-10;if(y<70)y=r.bottom+10;tip.style.left=x+'px';tip.style.top=y+'px';}
function hideTip(){tip.classList.remove('on');tipFor=null;}
$$('.term').forEach(b=>{b.setAttribute('type','button');b.addEventListener('mouseenter',()=>showTip(b));b.addEventListener('mouseleave',hideTip);b.addEventListener('focus',()=>showTip(b));b.addEventListener('blur',hideTip);b.addEventListener('click',e=>{e.preventDefault();tipFor===b?hideTip():showTip(b);});});
addEventListener('scroll',()=>{if(tipFor)hideTip();},{passive:true});

/* ---------------- HUD: progress + active nav ---------------- */
const prog=$('#progress'),navLinks=$$('#nav a');
const secs=navLinks.map(a=>document.querySelector(a.getAttribute('href')));
function onScroll(){const h=document.documentElement;const p=h.scrollTop/(h.scrollHeight-h.clientHeight||1);prog.style.transform='scaleX('+p+')';$('#totop').classList.toggle('show',h.scrollTop>700);
  let cur=-1;secs.forEach((s,i)=>{if(s&&s.getBoundingClientRect().top<innerHeight*.35)cur=i;});
  navLinks.forEach((a,i)=>a.classList.toggle('on',i===cur));
  if(cur>=0){const a=navLinks[cur];const nav=$('#nav');const want=a.offsetLeft-nav.clientWidth/2+a.clientWidth/2;if(Math.abs(nav.scrollLeft-want)>40)nav.scrollTo({left:want,behavior:RM?'auto':'smooth'});}
  const evs=['#ev-clinvar','#ev-gnomad','#ev-dynamut','#ev-tp53db'].map(q=>$(q));let ce=-1;evs.forEach((s,i)=>{if(s.getBoundingClientRect().top<innerHeight*.45)ce=i;});
  $$('#evTabs a').forEach((a,i)=>a.classList.toggle('on',i===ce));}
addEventListener('scroll',onScroll,{passive:true});onScroll();

/* ---------------- menu lateral de tópicos ---------------- */
(function(){
  const TOPICS=[
    ['#resumo','Resumo em 1 minuto',[]],
    ['#sindrome','A síndrome',[['#risco','Idade e risco de câncer'],['#penetrancia','Penetrância por sexo']]],
    ['#mutacao','A mutação',[['#brasil','Por que é comum no Brasil'],['#origem','Ter a variante não é sentença']]],
    ['#proteina','A proteína p53',[['#lab','Laboratório 3D']]],
    ['#lacuna','Lacuna científica',[]],
    ['#metodo','Método',[]],
    ['#evidencias','Resultados',[['#ev-clinvar','ClinVar'],['#ev-gnomad','gnomAD'],['#ev-dynamut','DynaMut2'],['#ev-tp53db','TP53 Database']]],
    ['#integracao','Discussão',[]],
    ['#conclusao','Conclusão',[]],
    ['#imagens','Imagens da pesquisa',[]],
    ['#glossario','Glossário',[]],
    ['#referencias','Referências',[]]];
  TOPICS.forEach(t=>{t[1]=T(t[1]);t[2].forEach(x=>{x[1]=T(x[1]);});});
  const btn=$('#menuBtn'),dr=$('#drawer'),scrim=$('#drawerScrim'),nav=$('#drawerNav'),q=$('#drawerSearch'),x=$('#drawerClose');
  const norm=t=>t.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  TOPICS.forEach(([h,l,subs],i)=>{const g=document.createElement('div');g.className='dr-group';g.dataset.s=norm(l+' '+subs.map(x=>x[1]).join(' '));
    g.innerHTML='<a class="dr-item" href="'+h+'"><span class="dr-n">'+String(i+1).padStart(2,'0')+'</span><span>'+l+'</span></a>'+
      subs.map(([sh,sl])=>'<a class="dr-sub" href="'+sh+'" data-s="'+norm(sl)+'">'+sl+'</a>').join('');nav.appendChild(g);});
  const empty=document.createElement('p');empty.className='dr-empty';empty.textContent=T('Nenhum tópico encontrado.');empty.hidden=true;nav.appendChild(empty);
  let open=false,t=0;dr.inert=true;
  function setOpen(v){if(v===open)return;open=v;clearTimeout(t);btn.setAttribute('aria-expanded',String(v));btn.setAttribute('aria-label',T(v?'Fechar menu de tópicos':'Abrir menu de tópicos'));
    dr.classList.toggle('open',v);dr.inert=!v;document.body.style.overflow=v?'hidden':'';
    if(v){scrim.hidden=false;requestAnimationFrame(()=>scrim.classList.add('show'));mark();setTimeout(()=>{(innerWidth>600?q:x).focus();const on=nav.querySelector('.dr-item.on');if(on)on.scrollIntoView({block:'nearest'});},60);}
    else{scrim.classList.remove('show');t=setTimeout(()=>{scrim.hidden=true;if(q.value){q.value='';q.dispatchEvent(new Event('input'));}},320);btn.focus({preventScroll:true});}}
  btn.addEventListener('click',()=>setOpen(!open));x.addEventListener('click',()=>setOpen(false));scrim.addEventListener('click',()=>setOpen(false));
  addEventListener('keydown',e=>{if(open&&e.key==='Escape')setOpen(false);});
  // fecha antes de rolar, para a página poder se mover até o tópico
  nav.addEventListener('click',e=>{if(e.target.closest('a'))setOpen(false);});
  q.addEventListener('input',()=>{const v=norm(q.value.trim());let n=0;nav.querySelectorAll('.dr-group').forEach(g=>{const hit=!v||g.dataset.s.includes(v);g.hidden=!hit;if(hit)n++;
    g.querySelectorAll('.dr-sub').forEach(s=>{s.hidden=!!v&&!s.dataset.s.includes(v)&&!norm(g.querySelector('.dr-item').textContent).includes(v);});});empty.hidden=n>0;});
  q.addEventListener('keydown',e=>{if(e.key==='Enter'){const f=[...nav.querySelectorAll('a')].find(a=>!a.hidden&&!a.closest('[hidden]'));if(f){e.preventDefault();f.click();}}});
  const links=[...nav.querySelectorAll('a')].map(a=>[a,document.querySelector(a.getAttribute('href'))]).filter(p=>p[1]);
  function mark(){let top=null,sub=null;const lim=innerHeight*.35;links.forEach(([a,el])=>{if(el.getBoundingClientRect().top<lim){if(a.classList.contains('dr-item')){top=a;sub=null;}else sub=a;}});
    links.forEach(([a])=>a.classList.toggle('on',a===top||a===sub));}
  let raf=0;addEventListener('scroll',()=>{if(!open&&raf)return;cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=0;mark();});},{passive:true});mark();
})();

/* ---------------- fundo animado em todo o site ---------------- */
(function(){
  const cv=$('#bgfx'),grid=$('.bg-grid'),hero=$('.hero'),r=mkRenderer(cv);
  if(!r){grid.style.opacity=.6;return;}
  r.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x060a13,18,48);
  const cam=new THREE.PerspectiveCamera(40,1,.1,140);cam.position.set(0,0,22);
  scene.add(new THREE.AmbientLight(0x8899cc,.65));const dl=new THREE.DirectionalLight(0xffffff,.9);dl.position.set(5,8,10);scene.add(dl);
  const SEG=7,GAP=24,m4=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),col=new THREE.Color();
  function helix(k){const g=new THREE.Group(),N=30,rise=.52,R=1.9,tw=Math.PI*2/10.5,hot=8+(k*5)%14;
    const bb=new THREE.InstancedMesh(new THREE.SphereGeometry(.17,10,8),new THREE.MeshStandardMaterial({metalness:.3,roughness:.4,transparent:true,opacity:.6}),N*2);
    const rung=new THREE.InstancedMesh(new THREE.CylinderGeometry(.06,.06,1,6),new THREE.MeshStandardMaterial({roughness:.5,transparent:true,opacity:.5}),N);
    const s1=[],s2=[];
    for(let i=0;i<N;i++){const a=i*tw,y=(i-N/2)*rise,p1=new THREE.Vector3(R*Math.cos(a),y,R*Math.sin(a)),p2=new THREE.Vector3(R*Math.cos(a+Math.PI*.8),y,R*Math.sin(a+Math.PI*.8));s1.push(p1);s2.push(p2);
      m4.makeTranslation(p1.x,p1.y,p1.z);bb.setMatrixAt(i*2,m4);m4.makeTranslation(p2.x,p2.y,p2.z);bb.setMatrixAt(i*2+1,m4);
      col.set(i===hot?'#ff5470':'#9fb3e6');bb.setColorAt(i*2,col);bb.setColorAt(i*2+1,col);
      const d=p2.clone().sub(p1),len=d.length();q.setFromUnitVectors(up,d.normalize());m4.compose(p1.clone().add(p2).multiplyScalar(.5),q,new THREE.Vector3(1,len*.92,1));rung.setMatrixAt(i,m4);
      col.set(i===hot?'#ff5470':['#3456b8','#5b7fe0','#7d9cf0','#2d4590'][(i*7+k)%4]);rung.setColorAt(i,col);}
    const tm=new THREE.MeshStandardMaterial({color:0x3a5bb8,transparent:true,opacity:.35,metalness:.4,roughness:.3});
    g.add(bb,rung,new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s1),N*5,.045,5),tm),new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s2),N*5,.045,5),tm));
    return g;}
  const hs=[];for(let k=0;k<SEG;k++){const g=helix(k);g.userData={side:k%2?1:-1,y:-k*GAP,z:-4-(k%3)*2.5,tilt:(k%2?.55:-.55),spin:.12+(k%3)*.05};scene.add(g);hs.push(g);}
  const P=innerWidth<700?700:1400,pg=new THREE.BufferGeometry(),pos=new Float32Array(P*3),span=SEG*GAP+30;
  for(let i=0;i<P;i++){pos[i*3]=(Math.random()-.5)*56;pos[i*3+1]=12-Math.random()*span;pos[i*3+2]=(Math.random()-.5)*30-6;}
  pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0x6d8cff,size:.07,transparent:true,opacity:.6,depthWrite:false}));scene.add(pts);
  const H=90,hg=new THREE.BufferGeometry(),hp=new Float32Array(H*3);for(let i=0;i<H;i++){hp[i*3]=(Math.random()-.5)*50;hp[i*3+1]=12-Math.random()*span;hp[i*3+2]=(Math.random()-.5)*20-4;}
  hg.setAttribute('position',new THREE.BufferAttribute(hp,3));const hot=new THREE.Points(hg,new THREE.PointsMaterial({color:0xff5470,size:.11,transparent:true,opacity:.7,depthWrite:false}));scene.add(hot);
  let mx=0,my=0,camY=0,vis=0,raf=0;const t0=performance.now();
  addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;},{passive:true});
  function fade(){const hh=hero?hero.offsetHeight:600;vis=Math.max(0,Math.min(1,(scrollY-hh*.35)/(hh*.55)));cv.style.opacity=(vis*.85).toFixed(3);grid.style.opacity=(vis*.55).toFixed(3);}
  function frame(){raf=0;fit(r,cam,canvas2size());if(vis<=0||document.hidden)return;const t=(performance.now()-t0)/1000;
    const halfW=Math.tan(20*Math.PI/180)*26*cam.aspect,xo=Math.max(3,halfW*.8);
    const prog=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);camY+=((-prog*(SEG-1)*GAP)-camY)*(RM?1:.08);
    cam.position.set(cam.position.x+((mx*1.6)-cam.position.x)*.04,camY+(-my*1.2),22);cam.lookAt(0,camY,0);
    hs.forEach(g=>{const u=g.userData;g.position.set(u.side*xo,u.y,u.z);g.rotation.set(0,RM?.6:t*u.spin,u.tilt);});
    pts.rotation.y=RM?0:t*.008;hot.rotation.y=pts.rotation.y;
    r.render(scene,cam);if(!RM)raf=requestAnimationFrame(frame);}
  function canvas2size(){return cv;}
  function kick(){fade();if(!raf&&vis>0)raf=requestAnimationFrame(frame);}
  addEventListener('scroll',kick,{passive:true});addEventListener('resize',kick);document.addEventListener('visibilitychange',kick);kick();
})();

/* ---------------- Hero intro ---------------- */
if(window.gsap&&!RM){
  const _intro=[gsap.from('.hero h1 span',{yPercent:60,opacity:0,duration:1.1,ease:'expo.out',stagger:.08,delay:.15,clearProps:'all'}),
  gsap.from(['.hero .eyebrow','.hero .sub','.authors','.cta'],{y:18,opacity:0,duration:.9,ease:'power3.out',stagger:.08,delay:.45,clearProps:'all'}),
  gsap.from('.readout .row',{x:24,opacity:0,duration:.7,ease:'power3.out',stagger:.06,delay:.7,clearProps:'all'})];setTimeout(()=>_intro.forEach(t=>t.progress(1)),3500);
}
/* counters */
$$('[data-count]').forEach(n=>{const to=+n.dataset.count,pre=n.dataset.prefix?n.dataset.prefix.replace('&gt;','>'):'',suf=n.dataset.suffix||'';
  onSeen(n,()=>{if(RM||!window.gsap)return;const o={v:0};gsap.to(o,{v:to,duration:1.6,ease:'power2.out',onUpdate:()=>{n.textContent=pre+Math.round(o.v)+suf;}});});});

/* ---------------- WebGL helpers ---------------- */
function mkRenderer(canvas){if(!window.THREE)return null;try{const r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio||1,2));r.setClearColor(0,0);return r;}catch(e){return null;}}
function fit(r,cam,canvas){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;const pr=r.getPixelRatio();if(canvas.width!==Math.round(w*pr)||canvas.height!==Math.round(h*pr)){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}}
function loopWhenVisible(node,frame){let vis=false,raf=0;const run=()=>{raf=0;if(!vis)return;frame();if(!RM)raf=requestAnimationFrame(run);};
  const io=new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis&&!raf)raf=requestAnimationFrame(run);});io.observe(node);
  return ()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;frame();});};}
function glowTex(col){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,col);gr.addColorStop(.25,col+'aa');gr.addColorStop(1,col+'00');g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}

/* ---------------- HERO: DNA helix ---------------- */
(function(){
  const canvas=$('#helix'),r=mkRenderer(canvas);if(!r)return;
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(38,1,.1,200);cam.position.set(0,0,22);
  scene.add(new THREE.AmbientLight(0x8899cc,.55));
  const dl=new THREE.DirectionalLight(0xffffff,1.1);dl.position.set(5,8,10);scene.add(dl);
  const pl=new THREE.PointLight(0xff5470,2.2,14);scene.add(pl);
  const root=new THREE.Group(),g=new THREE.Group();root.add(g);scene.add(root);
  const N=56,rise=.5,R=2.1,tw=Math.PI*2/10.5,M=Math.floor(N/2);
  const bb=new THREE.InstancedMesh(new THREE.SphereGeometry(.2,18,14),new THREE.MeshStandardMaterial({metalness:.3,roughness:.35}),N*2);
  const rung=new THREE.InstancedMesh(new THREE.CylinderGeometry(.075,.075,1,10),new THREE.MeshStandardMaterial({metalness:.2,roughness:.5}),N*2);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),col=new THREE.Color();
  const seqCols=['#3456b8','#5b7fe0','#7d9cf0','#2d4590'];
  const s1=[],s2=[];let mid=new THREE.Vector3();
  for(let i=0;i<N;i++){const a=i*tw,y=(i-N/2)*rise;
    const p1=new THREE.Vector3(R*Math.cos(a),y,R*Math.sin(a)),p2=new THREE.Vector3(R*Math.cos(a+Math.PI*.8),y,R*Math.sin(a+Math.PI*.8));
    s1.push(p1);s2.push(p2);
    m4.makeTranslation(p1.x,p1.y,p1.z);bb.setMatrixAt(i*2,m4);m4.makeTranslation(p2.x,p2.y,p2.z);bb.setMatrixAt(i*2+1,m4);
    const hot=i===M;col.set(hot?C.his:'#9fb3e6');bb.setColorAt(i*2,col);bb.setColorAt(i*2+1,col);
    const c=p1.clone().add(p2).multiplyScalar(.5);if(hot)mid=c.clone();
    [[p1,c],[p2,c]].forEach(([a0,b0],k)=>{const d=b0.clone().sub(a0),len=d.length();q.setFromUnitVectors(up,d.clone().normalize());
      m4.compose(a0.clone().add(b0).multiplyScalar(.5),q,new THREE.Vector3(hot?1.6:1,len*.94,hot?1.6:1));rung.setMatrixAt(i*2+k,m4);
      col.set(hot?(k?'#ff8aa0':C.his):seqCols[(i*7+k*3)%4]);rung.setColorAt(i*2+k,col);});
  }
  g.add(bb,rung);
  const tubeMat=new THREE.MeshStandardMaterial({color:0x3a5bb8,transparent:true,opacity:.55,metalness:.4,roughness:.3});
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s1),N*6,.05,6),tubeMat));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s2),N*6,.05,6),tubeMat));
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('#ff5470'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));glow.scale.set(4,4,1);glow.position.copy(mid);g.add(glow);
  pl.position.copy(mid);g.add(pl);
  // particles
  const P=700,pg=new THREE.BufferGeometry(),pos=new Float32Array(P*3);for(let i=0;i<P;i++){pos[i*3]=(Math.random()-.5)*50;pos[i*3+1]=(Math.random()-.5)*34;pos[i*3+2]=(Math.random()-.5)*30-6;}
  pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0x6d8cff,size:.06,transparent:true,opacity:.55}));scene.add(pts);
  root.rotation.z=-.62;
  const label=$('#mutLabel');let mx=0,my=0,t0=performance.now();
  addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;},{passive:true});
  const v=new THREE.Vector3();
  function layout(){const w=canvas.clientWidth;const mobile=w<980;root.position.set(mobile?1.2:5.2,mobile?-1.5:0,0);root.scale.setScalar(mobile?.72:1);canvas.style.opacity=mobile?.5:1;label.style.display=mobile?'none':'flex';}
  const kick=loopWhenVisible(canvas,()=>{fit(r,cam,canvas);layout();const t=(performance.now()-t0)/1000;
    g.rotation.y=RM?.6:t*.22+scrollY*.002;
    cam.position.x+=(mx*2-cam.position.x)*.04;cam.position.y+=(-my*1.4-cam.position.y)*.04;cam.lookAt(0,0,0);
    const pulse=1+.18*Math.sin(t*2.4);glow.scale.set(4*pulse,4*pulse,1);pts.rotation.y=t*.01;
    r.render(scene,cam);
    glow.getWorldPosition(v);v.project(cam);const x=(v.x*.5+.5)*canvas.clientWidth,y=(-v.y*.5+.5)*canvas.clientHeight;
    label.style.left=x+'px';label.style.top=y+'px';const ro=document.querySelector('.readout').getBoundingClientRect(),hb=canvas.getBoundingClientRect(),rx=ro.left-hb.left,ry=ro.top-hb.top;const hit=x+210>rx&&x<rx+ro.width&&y>ry-24&&y<ry+ro.height+24;label.style.opacity=(v.z<1&&x<canvas.clientWidth-190&&!hit)?1:0;});
  addEventListener('resize',kick);
})();

/* ---------------- Risk chart ---------------- */
(function(){const s=$('#riskChart');const L=46,Rr=500,T=46,B=262;const X=a=>L+(a/80)*(Rr-L),Y=p=>B-(p/100)*(B-T);
  // peak bands
  [[0,10,'infância'],[30,50,'vida adulta']].forEach(([a,b,t])=>{el('rect',{x:X(a),y:T,width:X(b)-X(a),height:B-T,fill:'rgba(255,84,112,.08)'},s);el('text',{x:(X(a)+X(b))/2,y:T-12,'text-anchor':'middle',class:'lbl',style:'fill:'+C.his+';font-weight:500'},s,t);});
  [0,25,50,75,100].forEach(p=>{el('line',{x1:L,x2:Rr,y1:Y(p),y2:Y(p),class:'gridl'},s);el('text',{x:L-8,y:Y(p)+4,'text-anchor':'end',class:'lbl'},s,p+'%');});
  [0,10,20,30,40,50,60,70,80].forEach(a=>el('text',{x:X(a),y:B+18,'text-anchor':'middle',class:'lbl'},s,a));
  el('text',{x:(L+Rr)/2,y:B+40,'text-anchor':'middle',class:'lbl'},s,'idade (anos)');
  el('line',{x1:L,x2:Rr,y1:B,y2:B,class:'axis'},s);
  const pts=[[0,0],[10,18],[20,34],[30,50],[40,67],[50,81],[60,91]];
  let d='M'+pts.map(p=>X(p[0])+' '+Y(p[1])).join(' L');
  const area=el('path',{d:d+' L'+X(60)+' '+B+' L'+X(0)+' '+B+' Z',fill:'url(#rg)'},s);
  const defs=el('defs',{},s);const lg=el('linearGradient',{id:'rg',x1:0,x2:0,y1:0,y2:1},defs);el('stop',{offset:0,'stop-color':C.arg,'stop-opacity':.35},lg);el('stop',{offset:1,'stop-color':C.arg,'stop-opacity':0},lg);
  const line=el('path',{d,fill:'none',stroke:C.arg,'stroke-width':2.5,'stroke-linecap':'round'},s);
  el('path',{d:'M'+X(60)+' '+Y(91)+' L'+X(80)+' '+Y(96),fill:'none',stroke:C.arg,'stroke-width':2,'stroke-dasharray':'3 5',opacity:.6},s);
  [[30,50,'≈50% aos 30',-12,-12,'end'],[60,91,'>90% aos 60',12,24,'start']].forEach(([a,p,t,dx,dy,an])=>{el('circle',{cx:X(a),cy:Y(p),r:5.5,fill:C.ink,stroke:C.amber,'stroke-width':2.5},s);el('text',{x:X(a)+dx,y:Y(p)+dy,'text-anchor':an,class:'lbl-strong',style:'paint-order:stroke;stroke:#0B1221;stroke-width:5px;stroke-linejoin:round'},s,t);});
  onSeen(s,()=>{if(RM)return;const len=line.getTotalLength();line.style.strokeDasharray=len;line.animate([{strokeDashoffset:len},{strokeDashoffset:0}],{duration:1600,easing:'cubic-bezier(.3,.7,.2,1)'});area.animate([{opacity:0},{opacity:1}],{duration:1600});});
})();
/* penetrance rings */
(function(){const w=$('#pen');[['Homens',73,C.arg,'73%','cerca de'],['Mulheres',97,C.his,'100%','quase']].forEach(([n,v,c,t,pre])=>{
  const f=document.createElement('figure');const s=el('svg',{viewBox:'0 0 150 150'},f);const R=60,circ=2*Math.PI*R;
  el('circle',{cx:75,cy:75,r:R,fill:'none',stroke:C.line2,'stroke-width':12},s);
  const a=el('circle',{cx:75,cy:75,r:R,fill:'none',stroke:c,'stroke-width':12,'stroke-linecap':'round','stroke-dasharray':circ,'stroke-dashoffset':circ*(1-v/100),transform:'rotate(-90 75 75)'},s);
  el('text',{x:75,y:63,'text-anchor':'middle',style:'font:500 12px var(--mono);fill:'+C.muted},s,pre);el('text',{x:75,y:92,'text-anchor':'middle',style:'font:600 26px var(--display);fill:'+C.text},s,t);
  const fc=document.createElement('figcaption');fc.textContent=n;f.appendChild(fc);w.appendChild(f);
  onSeen(s,()=>{if(!RM)a.animate([{strokeDashoffset:circ},{strokeDashoffset:circ*(1-v/100)}],{duration:1400,easing:'cubic-bezier(.3,.7,.2,1)'});});});})();

/* ---------------- Sequence 332–341 ---------------- */
(function(){const seq=[['I',332],['R',333],['G',334],['R',335],['E',336],['R',337],['F',338],['E',339],['M',340],['F',341]];
  const box=$('#seq');let mut=true;
  function draw(){box.innerHTML='';seq.forEach(([a,n])=>{const d=document.createElement('div');d.className='res'+(n===337?' hot':'');const l=n===337?(mut?'H':'R'):a;d.innerHTML='<span class="aa-l" style="'+(n===337?'color:'+(mut?C.his:C.arg):'')+'">'+l+'</span><small>'+n+'</small>';box.appendChild(d);});}
  draw();const b=$('#swapSeq');
  b.addEventListener('click',()=>{mut=!mut;b.setAttribute('aria-pressed',String(!mut));b.textContent=T(mut?'↺ Ver versão normal':'↺ Ver versão mutante');draw();
    const bm=$('#bMut');if(!RM)bm.animate([{transform:'rotateY(90deg)'},{transform:'rotateY(0)'}],{duration:400});
    if(!RM)box.querySelector('.hot').animate([{transform:'scale(1.25)'},{transform:'scale(1)'}],{duration:450,easing:'cubic-bezier(.3,1.6,.5,1)'});});
  onSeen($('#bMut'),()=>{if(RM)return;$('#bMut').animate([{transform:'translateY(-40px) rotateX(90deg)',opacity:0},{transform:'none',opacity:1}],{duration:900,delay:300,easing:'cubic-bezier(.3,1.4,.5,1)',fill:'backwards'});});
})();

/* ---------------- Domain map ---------------- */
(function(){const D=[['TAD',1,61,'#5B6883','Liga e desliga outros genes'],['PRD',62,94,'#46557a','Região de apoio'],['DBD',95,292,C.arg,'Encaixa no DNA · onde está a maioria das alterações da SLF'],['NLS',293,322,'#3a4a70','Leva a p53 para o núcleo'],['TD',323,356,C.amber,'Une as 4 cópias · onde está a R337H'],['CTD',357,393,'#5B6883','Controle da atividade']];
  D.forEach(x=>{x[4]=T(x[4]);});
  const bar=$('#domBar'),leg=$('#domLeg');const pct=v=>((v-1)/392*100);
  D.forEach(([k,a,b,c,t])=>{const d=document.createElement('div');d.className='dom';d.style.left=pct(a)+'%';d.style.width=(pct(b)-pct(a))+'%';d.style.background=c;d.textContent=(b-a)>30?k:'';d.title=t+' ('+a+'–'+b+')';bar.appendChild(d);
    const l=document.createElement('span');l.innerHTML='<i style="background:'+c+'"></i>'+k+' · '+t+' <span class="mono" style="color:var(--dim)">'+a+'–'+b+'</span>';leg.appendChild(l);});
  const pin=document.createElement('div');pin.className='pin';pin.style.left=pct(337)+'%';pin.innerHTML='<span>R337H</span>';bar.appendChild(pin);
  onSeen(bar,()=>{if(RM)return;grow([...bar.querySelectorAll('.dom')]);pin.animate([{transform:'translate(-1px,-30px)',opacity:0},{transform:'translate(-1px,0)',opacity:1}],{duration:700,delay:700,easing:'cubic-bezier(.3,1.4,.5,1)',fill:'backwards'});});
})();

/* ---------------- 3D tetramer lab ---------------- */
(function(){
  const view=$('#labView'),canvas=$('#tetra'),r=mkRenderer(canvas);
  const state=$('#labState'),ph=$('#ph'),segBtns=$$('.seg button[data-m]'),real=$('#labReal'),hint=$('#labHint'),vBtns=$$('.seg button[data-v]');
  let mode='mut',kick=null,inst=0,target=0,vmode='real';
  function update(){const p=ph.value/100;target=mode==='mut'?Math.max(0,Math.min(1,(p-.4)/.45)):p*.04;
    const unstable=target>.35;state.textContent=mode==='wt'?'p53 normal · equipe de 4 estável':unstable?'p53 mutante · a equipe se desfaz':'p53 mutante · equipe formada';
    state.style.color=unstable?C.his:mode==='wt'?'#9DB6FF':C.amber;state.style.borderColor=unstable?'rgba(255,84,112,.5)':C.line2;if(vmode==='real'){state.textContent=mode==='wt'?'p53 normal · Arginina 337':'p53 mutante · Histidina 337';state.style.color=mode==='wt'?'#9DB6FF':C.his;state.style.borderColor=mode==='wt'?'rgba(77,124,255,.55)':'rgba(255,84,112,.55)';}}
  function setMode(m){mode=m;real.dataset.m=m;if(!RM&&vmode==='real'){const im=real.querySelector('.fig.'+m+' img');im.animate([{transform:'scale(1.05)',filter:'blur(3px)'},{transform:'none',filter:'none'}],{duration:650,easing:'cubic-bezier(.2,.8,.2,1)'});}segBtns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===m)));update();if(kick)kick();}
  segBtns.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.m)));
  ph.addEventListener('input',()=>{update();if(kick)kick();});function setView(v){vmode=v;vBtns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v)));view.classList.toggle('is-real',v==='real');real.hidden=v!=='real';canvas.hidden=v==='real';$$('.lab-ctrl [data-show]').forEach(e=>{e.hidden=e.dataset.show!==v;});hint.textContent=v==='real'?'Clique na imagem para ampliar · imagem real do DynaMut2':'Arraste para girar · ilustração';if(!RM)view.animate([{opacity:.4},{opacity:1}],{duration:400,easing:'ease-out'});update();if(kick)kick();}vBtns.forEach(b=>b.addEventListener('click',()=>setView(b.dataset.v)));setView('real');
  if(!r){vBtns.forEach(b=>{if(b.dataset.v==='3d'){b.disabled=true;b.title='Modelo 3D indisponível neste navegador';}});return;}
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(34,1,.1,100);cam.position.set(0,2.6,13);cam.lookAt(0,0,0);
  scene.add(new THREE.AmbientLight(0x8899cc,.62));const dl=new THREE.DirectionalLight(0xffffff,1.05);dl.position.set(4,7,8);scene.add(dl);
  const dl2=new THREE.DirectionalLight(0x6d8cff,.5);dl2.position.set(-6,-4,-5);scene.add(dl2);
  const world=new THREE.Group();scene.add(world);
  // geometria de uma cópia (coordenadas locais): fita-β em cima, virada, hélice-α embaixo
  const HY=.5,HZ=.62,HR=.24,X0=2.0,X1=-2.3;
  const hp=[];for(let i=0;i<=180;i++){const t=i/180,x=X0+(X1-X0)*t,a=t*Math.PI*2*5.2;hp.push(new THREE.Vector3(x,HY+HR*Math.cos(a),HZ+HR*Math.sin(a)));}
  const helixGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp),540,.085,10);
  const SY=1.55,SZ=.34;
  const turnGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(1.45,SY,SZ),new THREE.Vector3(2.15,SY-.1,SZ+.08),new THREE.Vector3(2.45,(SY+HY)/2+.1,(SZ+HZ)/2),hp[0].clone()]),48,.06,8);
  const sh=new THREE.Shape();sh.moveTo(-1.9,-.19);sh.lineTo(1.05,-.19);sh.lineTo(1.05,-.34);sh.lineTo(1.5,0);sh.lineTo(1.05,.34);sh.lineTo(1.05,.19);sh.lineTo(-1.9,.19);sh.closePath();
  const strandGeo=new THREE.ExtrudeGeometry(sh,{depth:.07,bevelEnabled:false});strandGeo.rotateX(-Math.PI/2);strandGeo.translate(0,SY-.035,SZ);
  const resPos=hp[18].clone();resPos.add(new THREE.Vector3(0,resPos.y-HY,resPos.z-HZ).normalize().multiplyScalar(.2));
  const gR=glowTex('#ff5470'),gB=glowTex('#4d7cff');
  const resMats=[],sprites=[],monos=[];
  function monomer(color,dir){const m=new THREE.Group();const mat=new THREE.MeshStandardMaterial({color,metalness:.2,roughness:.42});
    m.add(new THREE.Mesh(helixGeo,mat),new THREE.Mesh(turnGeo,mat),new THREE.Mesh(strandGeo,mat));
    const rm=new THREE.MeshStandardMaterial({color:0xff5470,emissive:0xff5470,emissiveIntensity:.85});resMats.push(rm);
    const res=new THREE.Mesh(new THREE.SphereGeometry(.2,20,16),rm);res.position.copy(resPos);m.add(res);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:gR,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));sp.position.copy(resPos);sp.scale.set(1.2,1.2,1);m.add(sp);sprites.push(sp);
    m.userData={dir:dir.clone().normalize(),ph:monos.length*1.7};monos.push(m);return m;}
  // 1º par: duas cópias antiparalelas (a segunda girada 180°) — fitas formam uma folha, molas lado a lado
  function pair(c1,c2){const g=new THREE.Group();const a=monomer(c1,new THREE.Vector3(0,.75,.65));const b=monomer(c2,new THREE.Vector3(0,.75,.65));b.rotation.y=Math.PI;g.add(a,b);return g;}
  const pA=pair(0x4d7cff,0x9db6ff),pB=pair(0x8a7cff,0xc9bdff);
  // 2º par: virado de cabeça para baixo e cruzado a 90°, encaixando as molas no centro
  pB.rotation.set(Math.PI,Math.PI/2,0);
  world.add(pA,pB);
  let rotY=.7,rotX=.18,drag=null;
  view.addEventListener('pointerdown',e=>{if(vmode!=='3d')return;drag={x:e.clientX,y:e.clientY,ry:rotY,rx:rotX};view.setPointerCapture(e.pointerId);});
  view.addEventListener('pointermove',e=>{if(!drag)return;rotY=drag.ry+(e.clientX-drag.x)*.01;rotX=Math.max(-.9,Math.min(.9,drag.rx+(e.clientY-drag.y)*.006));kick();});
  view.addEventListener('pointerup',()=>drag=null);view.addEventListener('pointercancel',()=>drag=null);
  const t0=performance.now();
  kick=loopWhenVisible(canvas,()=>{fit(r,cam,canvas);const t=(performance.now()-t0)/1000;
    inst+=(target-inst)*(RM?1:.06);cam.position.set(0,2.6+inst*.5,13+inst*3.4);cam.lookAt(0,0,0);if(!drag&&!RM)rotY+=.0028;world.rotation.set(rotX,rotY,0);
    const his=mode==='mut';
    monos.forEach((m,i)=>{const u=m.userData,off=inst*2.1;m.position.copy(u.dir).multiplyScalar(off);
      const j=RM?0:inst*.28;m.rotation.x=Math.sin(t*1.2+u.ph)*j;m.rotation.z=Math.cos(t*1.05+u.ph)*j;
      resMats[i].color.set(his?0xff5470:0x9db6ff);resMats[i].emissive.set(his?0xff5470:0x4d7cff);
      sprites[i].material.map=his?gR:gB;const s=1.1+(RM?0:.22*Math.sin(t*3+i));sprites[i].scale.set(s,s,1);});
    r.render(scene,cam);});
  addEventListener('resize',kick);
  setMode('mut');
})();

/* ---------------- ClinVar timeline ---------------- */
(function(){const s=$('#cvChart');const subs=[
  ['LMM · Mass General Brigham','2019-10-17','P'],['Cancer Variant Interp. Group UK','2020-03-06','LP'],['All of Us · NIH','2023-12-18','P'],
  ['Peter MacCallum Cancer Centre','2024-05-01','P'],['Labcorp Genetics (ex-Invitae)','2026-01-28','P'],["Women's Health & Genetics / LabCorp",'2026-05-28','P']];
  const L=24,Rr=500,y0=280;const t=d=>{const [y,m,dd]=d.split('-').map(Number);return y+(m-1)/12+dd/365;};const X=v=>L+(v-2019)/(2027-2019)*(Rr-L);
  el('line',{x1:L,x2:Rr,y1:y0,y2:y0,class:'axis'},s);
  for(let y=2019;y<=2027;y++){el('line',{x1:X(y),x2:X(y),y1:y0-4,y2:y0+4,class:'axis'},s);if(y<2027)el('text',{x:X(y),y:y0+20,'text-anchor':'middle',class:'lbl'},s,y);}
  const g=el('g',{},s);
  subs.forEach(([n,d,c],i)=>{const x=X(t(d)),y=30+i*40;const col=['#4D7CFF','#FFB23F','#3FC1C9','#A58CFF','#FF5470','#5FD39A'][i];
    const row=el('g',{},g);
    el('line',{x1:x,x2:x,y1:y+6,y2:y0,stroke:col,'stroke-opacity':.35,'stroke-dasharray':'2 3'},row);
    el('circle',{cx:x,cy:y,r:7,fill:col},row);el('circle',{cx:x,cy:y,r:11,fill:'none',stroke:col,'stroke-opacity':.35},row);
    const right=x<300;const [yy,mm]=d.split('-');
    el('text',{x:right?x+18:x-18,y:y-2,'text-anchor':right?'start':'end',class:'lbl-strong'},row,n);
    el('text',{x:right?x+18:x-18,y:y+13,'text-anchor':right?'start':'end',class:'lbl'},row,T(c==='P'?'Patogênica':'Provavelmente patogênica')+' · '+mm+'/'+yy);
    row.style.transformBox='fill-box';
  });
  onSeen(s,()=>{if(RM)return;[...g.children].forEach((row,i)=>row.animate([{opacity:0,transform:'translateY(-10px)'},{opacity:1,transform:'none'}],{duration:600,delay:i*120,easing:'ease-out',fill:'backwards'}));});
})();

/* ---------------- gnomAD: palheiro sobre o mapa-múndi ---------------- */
(function(){const cv=$('#hay'),ctx=cv.getContext('2d'),wrap=cv.parentElement,TOTAL=16139,LAT0=84,LATS=142;
  const MB=atob('AAAAAAAAAAAAAAAAAAAAAAAH/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADf//8AAf///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB////D//////n/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/gf/x////////wAAAAAbgAAB4AAAAAAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAf//8A///////+AAAAB/ngAAAAAAAAAAH8AAAAAAAAAAAAAAAAAAAAAAAAcH3Hv/5////////8AAAAA/gAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAAcIAAQP/AH///////+AAAAAPCAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAADwDAc+f+AP///////4AAAAAAAAAAAAAB4AAAAB/8AAAAAAAAAAAAAAAAAAAAAH9wc374AAAf/////8AAAAAAAAAAAAH4AAAA////AAAB/gAAAAAAAAAAAAAAAAwAAA/QAAAH/////8AAAAAAAAAAAAOAAAAP///wAAAAAAAAAAAAAAAAAAAAP8AYe+c3AAAD/////4AAAAAAAAAAAA4AAAH////++HgAOAAAAAAAAAAAAAAAfv+4+w/4gAAB/////wAAAAAAAAAAADwAHgH///////4AfgAAAAAgAAAAAAAAPf/4O4//9AAB/////wAAAAAAAAAAADwAPb////////4m//gAAAAAAAf+AAAAAA/+A8f//4AB////8gAAAAAAA/gAAAAAfv/////////////8AAAAAB///+H//H/+PeDwf+AA3////AAAAAAA//4AAAA8fv///////////////P8gAf////////A4CPz4H8AAP///wAAAAAAD///wADH/n3/////////////////8AD////////////34Z/wA///4AAAAAAAP///+M////n/////////////////+4E/////////////gD/8Af//gAAAAAAAf//5+P////f/////////////////fw/////////////6AD8YAf/wAAf8AAAA/8f+D///////////////////////AgEf///////////zw7/AAP/gAAP4AAAB/4/+f//////////////////////8AMAf//////////+DIA/gAH/gAAAAAAAH/z/////////////////////////+AAH///////////8AwgOAAD+AAAAAAAA//H/////////////////////////6AAP///////////wAA/AAAB+AAAAAAAB/+H//////////////////////nP+AAAH//z////////wAA/wAAAOAAAAAAAB//D/////////////////////+A/4AAAA/zAD///////gAA/4wAAAAAAAAAAB//Ab///////////////////+eDgAAAAABwAA///////4AA/94AAAAAAAAAYA5+A///////////////////4AAHAAAAAADcAAD//////4AAf/8AAAAAAAAA8AC+C///////////////////wAAfgAAAAAMAAAA///////wAf/8AAAAAAAAA4AO8H///////////////////AAA/gAAAABgAAAA///////8A///AAAAAAAAA8ANwH//////////////////8AAB/AAAAAEAAAAAf///////z///4AAAAAAAHOAEDv//////////////////+AAA+AAAAAAAAAABH///////x///8AAAAAAAHHAf/////////////////////6AA8AAAAAAAAAAAD///////x///8AAAAAAAGPz//////////////////////6AAwAAAAAAAAAAAD///////9///6AAAAAAAAPj//////////////////////6AAQAAAAAAAAAAAC///////////EAAAAAAAAYf//////////////////////7AAAAAAAAAAAAAABv////////+MNAAAAAAAAD///////////////////////zAAAAAAAAAAAAAAAH////////7gfgAAAAAAAf///////////////////////yAAAAAAAAAAAAAAAL/////////gCgAAAAAAAH///////////////////////iAAAAAAAAAAAAAAAP/////////pAAAAAAAAAD/////uP/x//////////////DAAAAAAAAAAAAAAAP/////////+AAAAAAAAAB//v//Gf/B/////////////+AAAAAAAAAAAAAAAAP////////8wAAAAAAAAAB//H/+AP+P/////////////8CAAAAAAAAAAAAAAAP////////wAAAAAAAAADj/jz/8AD/H/////////////4HgAAAAAAAAAAAAAAP////////gAAAAAAAAAH/4Bw/8AA/B////////////+APAAAAAAAAAAAAAAAP////////gAAAAAAAAAH/wA8f8Ph/g////////////8AAAAAAAAAAAAAAAAAP///////8AAAAAAAAAAH/gMHfJ///x///////////v4AMAAAAAAAAAAAAAAAP///////8AAAAAAAAAAH/AMCOP///h//////////+JwAMAAAAAAAAAAAAAAAH///////4AAAAAAAAAAH/AAAHH///g//////////8BwAIAAAAAAAAAAAAAAAH///////wAAAAAAAAAAH+AAYGH///w//////////+w4A4AAAAAAAAAAAAAAAD///////wAAAAAAAAAAAgf+ACBs//////////////g4D4AAAAAAAAAAAAAAAB///////wAAAAAAAAAAAj/+AAAA//////////////AYf4AAAAAAAAAAAAAAAA///////gAAAAAAAAAAB//8AAAA//////////////Ah2AAAAAAAAAAAAAAAAAP/////+AAAAAAAAAAAD//+AAAB//////////////gDwAAAAAAAAAAAAAAAAAH/////8AAAAAAAAAAAH///4GAB//////////////gDAAAAAAAAAAAAAAAAAAG/////4AAAAAAAAAAAP///8P4h//////////////wCAAAAAAAAAAAAAAAAAACf////4AAAAAAAAAAAP////v////////////////gAAAAAAAAAAAAAAAAAAABP//hgYAAAAAAAAAAAP//////3//P///////////wAAAAAAAAAAAAAAAAAAAAv//AAYAAAAAAAAAAAf//////9//H///////////wAAAAAAAAAAAAAAAAAAAB3/+AAcAAAAAAAAAAB///////4//h///////////gAAAAAAAAAAAAAAAAAAAAR/+AANAAAAAAAAAAD///////8//wH//////////AAAAAAAAAAAAAAAAAAAAAJ/+AAEAAAAAAAAAAH///////+f/0B/////////+AAAAAAAAAAAAAAAAAAAAAI/8AAAAAAAAAAAAAH///////+f/44Af///////+QAAAAAAAAAAAAAAAAAAAAAf8AAAAAAAAAAAAAP////////H//+AP///////4gAAAAAAAAAAAAAAAAAAAAAP8AAuAAAAAAAAAAP////////H///AD///v///ggAAAAAAAAAAAAAAAAAAAAAH+AABgAAAAAAAAAf////////n//+AD//4P//YAAAAAAAAAAAAAAAAAAAAAAAP+A4AYAAAAAAAAAP////////j//+AAf/4H/+AAAAAAAAAAAAAAAAgAAAAAAAH/B4ABwAAAAAAAAP////////h//8AAf/gD/8YAAAAAAAAAAAAAAAAAAAAAAAD/nwAD9AAAAAAAAP////////x//4AAf/AD/8QAAAAAAAAAAAAAAAAAAAAAAAAf/wAAAAAAAAAAAP////////4//gAAf+AD/+AAwAAAAAAAAAAAAAAAAAAAAAAH/wAAAAAAAAAAAf////////4f+AAAf8AD//AAwAAAAAAAAAAAAAAAAAAAAAAAH/AAAAAAAAAAAf////////8f8AAAPwAAP/gAwAAAAAAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAf////////+fgAAAPwAAP/gAwAAAAAAAAAAAAAAAAAAAAAAAA/AAAAAAAAAAAf/////////eAAAAHwAAP/gAMAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAf/////////gAAAAHwAAM/gACAAAAAAAAAAAAAAAAAAAAAAAADABAAAAAAAAAP/////////gYAAADwAAEfgAJAAAAAAAAAAAAAAAAAAAAAAAADgPfOAAAAAAAH/////////34AAADwAAIOABAAAAAAAAAAAAAAAAAAAAAAAAAAyPf+AAAAAAAD//////////4AAADoAAIEACBAAAAAAAAAAAAAAAAAAAAAAAAA8///AAAAAAAB//////////wAAABIAAMAAAFAAAAAAAAAAAAAAAAAAAAAAAAAE///gAAAAAAB//////////wAAAAMAAEAAALgAAAAAAAAAAAAAAAAAAAAAAAAAf//wAAAAAAAf/////////gAAAAMAADAAMCAAAAAAAAAAAAAAAAAAAAAAAAAA////gAAAAAAP/B///////gAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAf///wAAAAAACAA///////AAAAAAAAxgA+AAAAAAAAAAAAAAAAAAAAAAAAAAAf///4AAAAAAAAAD/////+AAAAAAAAZgB4AAAAAAAAAAAAAAAAAAAAAAAAAAB////4AAAAAAAAAD/////8AAAAAAAAMwH8AAAAAAAAAAAAAAAAAAAAAAAAAAB////8AAAAAAAAAH/////4AAAAAAAAHQf8AIAAAAAAAAAAAAAAAAAAAAAAAAD////8AAAAAAAAAH/////gAAAAAAAAHgf88IAAAAAAAAAAAAAAAAAAAAAAAAD////+AAAAAAAAAH/////AAAAAAAAADwf8AAgAAAAAAAAAAAAAAAAAAAAAAAH/////4AAAAAAAAH/////AAAAAAAAABwP5wBwAAAAAAAAAAAAAAAAAAAAAAAH/////6AAAAAAAAD////+AAAAAAAAAB8P5wATwAAAAAAAAAAAAAAAAAAAAAAD//////4AAAAAAAB////8AAAAAAAAAA8AxQif+AAAAAAAAAAAAAAAAAAAAAAH//////8AAAAAAAB////4AAAAAAAAAAcAAIAD/gAAAAAAAAAAAAAAAAAAAAAH///////gAAAAAAA////4AAAAAAAAAAMAAIAI/ywAAAAAAAAAAAAAAAAAAAAH///////gAAAAAAA////4AAAAAAAAAADgAAAI/8BAAAAAAAAAAAAAAAAAAAAD///////gAAAAAAAf///4AAAAAAAAAAB+AAAA/4AIAAAAAAAAAAAAAAAAAAAB///////gAAAAAAAf///4AAAAAAAAAAAAmogAOMAAAAAAAAAAAAAAAAAAAAAB///////AAAAAAAAf///8AAAAAAAAAAAABCAAAGADAAAAAAAAAAAAAAAAAAAA///////AAAAAAAAf///8AAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAf/////+AAAAAAAAP///8AAAAAAAAAAAAAAAgCAAAAAAAAAAAAAAAAAAAAAAAf/////8AAAAAAAAf///+AQAAAAAAAAAAAAB+CAAAAAAAAAAAAAAAAAAAAAAAP/////4AAAAAAAAf///+AQAAAAAAAAAAAAD8DAAAAAAAAAAAAAAAAAAAAAAAP/////4AAAAAAAA////+AwAAAAAAAAAAAA38DgAAAAAAAAAAAAAAAAAAAAAAH/////4AAAAAAAA////8BwAAAAAAAAAAAD/8DgAAAAAAAAAAAAAAAAAAAAAAB/////4AAAAAAAA////8PwAAAAAAAAAAAD//HwAABABAAAAAAAAAAAAAAAAAAf////4AAAAAAAA////wPgAAAAAAAAAAAP//3wAAAACAAAAAAAAAAAAAAAAAAP////wAAAAAAAA////APgAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAAf//+APgAAAAAAAAAAAf///4AAAAAAAAAAAAAAAAAAAAAAAP////wAAAAAAAAf//+APgAAAAAAAAAAD////+AAIAAAAAAAAAAAAAAAAAAAAP////gAAAAAAAAP//+AfAAAAAAAAAAAf////+AAEAAAAAAAAAAAAAAAAAAAAP////AAAAAAAAAP///AfAAAAAAAAAAA//////AAAAAAAAAAAAAAAAAAAAAAAP///4AAAAAAAAAP//+APAAAAAAAAAAA//////gAAAAAAAAAAAAAAAAAAAAAAf///gAAAAAAAAAH//+AOAAAAAAAAAAB//////wAAAAAAAAAAAAAAAAAAAAAAf///AAAAAAAAAAH//4AEAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf//+AAAAAAAAAAH//4AAAAAAAAAAAAB//////4AAAAAAAAAAAAAAAAAAAAAAf//+AAAAAAAAAAH//4AAAAAAAAAAAAA//////4AAAAAAAAAAAAAAAAAAAAAAf//+AAAAAAAAAAD//wAAAAAAAAAAAAAf/////8AAAAAAAAAAAAAAAAAAAAAAf//8AAAAAAAAAAB//gAAAAAAAAAAAAAf/////4AAAAAAAAAAAAAAAAAAAAAA///8AAAAAAAAAAB//gAAAAAAAAAAAAAf/////4AAAAAAAAAAAAAAAAAAAAAA///4AAAAAAAAAAA//AAAAAAAAAAAAAAP/////4AAAAAAAAAAAAAAAAAAAAAAf//wAAAAAAAAAAA/+AAAAAAAAAAAAAAP/AP//wAAAAAAAAAAAAAAAAAAAAAA///gAAAAAAAAAAA/4AAAAAAAAAAAAAAf8AG//gAAAAAAAAAAAAAAAAAAAAAA//3AAAAAAAAAAAAYAAAAAAAAAAAAAAAOAAF//gAAAAAAAAAAAAAAAAAAAAAB//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAABAAAAAAAAAAAAAAAAAAB//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/AAAAgAAAAAAAAAAAAAAAAAD//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/AAAAQAAAAAAAAAAAAAAAAAB//gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYAAAAcAAAAAAAAAAAAAAAAAB/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAADQAAAAAAAAAAAAAAAAAD/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAHAAAAAAAAAAAAAAAAAAB/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAOAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAH+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAH+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');const land=(lon,lat)=>{const r=Math.floor(LAT0-lat),c=Math.floor(lon+180);if(r<0||r>=LATS||c<0||c>=360)return 0;const i=r*360+c;return (MB.charCodeAt(i>>3)>>(7-(i&7)))&1;};
  // grupos do gnomAD com a variante: 3 Admixed American (Américas) + 1 europeu não finlandês; o 5º ("Remaining") não tem região
  const HITS=[[-80,6],[-68,-6],[-58,2],[10,49]],BR=[-47,-22],IB=[-6,40];
  const TAGS=[{k:'am',ll:[-128,-4],html:'<b>Admixed American</b> · 3 cópias',cls:'r'},{k:'eu',ll:[14,68],html:'<b>Europeu (não finlandês)</b> · 1 cópia',cls:'r'},
    {k:'br',ll:[-66,-45],html:'<b>Sul e Sudeste do Brasil</b> · ~0,3%',cls:'a'},{k:'arc',ll:[-50,34],html:'origem lusitana/hispânica',cls:'a opt'}];
  const tagEls=TAGS.map(t=>{const e=document.createElement('span');e.className='hay-tag '+t.cls;e.innerHTML=t.html;wrap.appendChild(e);return e;});
  let g,dots,hits,pings=[0,0,0,0],prevScan=0,t0=performance.now();
  function build(){const w=wrap.clientWidth,pr=Math.min(devicePixelRatio||1,2),sp=w/Math.sqrt(2.54*TOTAL),cols=Math.floor(w/sp),rows=Math.ceil(TOTAL/cols),h=rows*sp;
    cv.width=Math.round(w*pr);cv.height=Math.round(h*pr);cv.style.height=h+'px';ctx.setTransform(pr,0,0,pr,0,0);
    const P=(lon,lat)=>[(lon+180)/360*w,(LAT0-lat)/LATS*h];
    dots=new Float32Array(TOTAL*3);for(let i=0;i<TOTAL;i++){const x=(i%cols)*sp+sp/2,y=Math.floor(i/cols)*sp+sp/2;dots[i*3]=x;dots[i*3+1]=y;dots[i*3+2]=land(x/w*360-180,LAT0-y/h*LATS);}
    const snap=([x,y])=>[Math.floor(x/sp)*sp+sp/2,Math.floor(y/sp)*sp+sp/2];
    hits=HITS.map(p=>snap(P(...p)));g={w,h,sp,br:P(...BR),ib:P(...IB)};
    TAGS.forEach((t,i)=>{const [x,y]=P(...t.ll);tagEls[i].style.left=(x/w*100)+'%';tagEls[i].style.top=(y/h*100)+'%';});}
  function draw(now){const {w,h,sp}=g,t=(now-t0)/1000,rr=Math.max(.5,sp*.28);ctx.clearRect(0,0,w,h);
    const reveal=RM?w:Math.min(1,t/1.8)*w, scan=RM?-999:((t*.12)%1.3)*w-.15*w;
    // oceano, depois continentes, depois a faixa da "busca"
    for(let pass=0;pass<3;pass++){ctx.fillStyle=pass===0?'#1C2748':pass===1?'#4B66B0':'#A9C0FF';
      for(let i=0;i<TOTAL;i++){const x=dots[i*3];if(x>reveal)continue;const L=dots[i*3+2];
        if(pass===0&&L)continue;if(pass===1&&!L)continue;if(pass===2){const d=scan-x;if(!(d>0&&d<(L?46:18)))continue;}
        const y=dots[i*3+1];ctx.fillRect(x-rr,y-rr,rr*2,rr*2);}}
    if(!RM&&scan>-50){const gr=ctx.createLinearGradient(scan-60,0,scan,0);gr.addColorStop(0,'rgba(109,140,255,0)');gr.addColorStop(1,'rgba(109,140,255,.22)');ctx.fillStyle=gr;ctx.fillRect(scan-60,0,60,h);
      ctx.fillStyle='rgba(169,192,255,.55)';ctx.fillRect(scan,0,1,h);}
    // Brasil (âmbar) e arco da origem lusitana/hispânica
    if(reveal>=g.br[0]){const [bx,by]=g.br,p=RM?.5:(Math.sin(t*1.8)+1)/2,R=sp*(5+p*3);
      const rg=ctx.createRadialGradient(bx,by,0,bx,by,R*2.4);rg.addColorStop(0,'rgba(255,178,63,.35)');rg.addColorStop(1,'rgba(255,178,63,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(bx,by,R*2.4,0,7);ctx.fill();
      ctx.beginPath();ctx.arc(bx,by,R,0,7);ctx.strokeStyle='rgba(255,178,63,.9)';ctx.lineWidth=1.6;ctx.stroke();
      const [ix,iy]=g.ib;ctx.save();ctx.setLineDash([5,5]);ctx.lineDashOffset=RM?0:-t*18;ctx.strokeStyle='rgba(255,178,63,.8)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(ix,iy);
      ctx.quadraticCurveTo((ix+bx)/2-w*.07,Math.min(iy,by)-h*.02,bx,by);ctx.stroke();ctx.restore();ctx.fillStyle='#FFB23F';ctx.beginPath();ctx.arc(ix,iy,Math.max(2,sp*.7),0,7);ctx.fill();}
    // as "agulhas": cópias com a variante; a faixa de busca faz cada uma "piscar" ao passar
    hits.forEach(([x,y],i)=>{if(x>reveal)return;if(!RM&&prevScan<x&&scan>=x)pings[i]=t;
      const p=RM?0:(Math.sin(t*2.6+i)+1)/2;ctx.beginPath();ctx.arc(x,y,Math.max(2.2,sp*.95),0,7);ctx.fillStyle='#FF5470';ctx.fill();
      ctx.beginPath();ctx.arc(x,y,sp*(2.2+p*2),0,7);ctx.strokeStyle='rgba(255,84,112,'+(.75-p*.5)+')';ctx.lineWidth=1.4;ctx.stroke();
      const e=t-pings[i];if(pings[i]&&e>=0&&e<1.4){ctx.beginPath();ctx.arc(x,y,sp*(3+e*16),0,7);ctx.strokeStyle='rgba(255,84,112,'+(1-e/1.4)*.8+')';ctx.lineWidth=2;ctx.stroke();}});
    prevScan=scan;}
  build();draw(t0+2000);
  let running=false;function frame(now){if(!running)return;try{draw(now);}catch(err){}requestAnimationFrame(frame);}
  if(!RM){new IntersectionObserver(es=>{const v=es[0].isIntersecting;if(v&&!running){running=true;t0=performance.now();pings=[0,0,0,0];prevScan=-1e9;requestAnimationFrame(frame);}if(!v)running=false;},{threshold:.15}).observe(cv);}
  addEventListener('resize',()=>{build();draw(performance.now());});
})();
/* ancestry + brazil bars */
(function(){const A=[['Admixed American',3,59966],['Outros (“Remaining”)',1,62486],['Europeu (não finlandês)',1,1179976],['Todos os demais grupos',0,311430]];
  const box=$('#ancestry');const max=3/59966;const fills=[];
  A.forEach(([n,c,t])=>{const af=c/t;const row=document.createElement('div');row.className='cmp-row';
    row.innerHTML='<span>'+n+'<br><span class="mono" style="font-size:11.5px;color:var(--dim)">'+c+' / '+fmt(t)+'</span></span><div class="tr"><div class="fl" style="width:'+Math.max(af/max*100,c?1.2:0)+'%;background:'+(c?C.arg:C.line2)+'"></div></div><span class="val">'+(c?fmt(af*1e5,2):'0')+'<small style="color:var(--dim);font-weight:400"> /100 mil</small></span>';
    box.appendChild(row);fills.push(row.querySelector('.fl'));});
  onSeen(box,()=>grow(fills));
  const B=[['Mundo (gnomAD)',0.00031,C.arg,'0,00031%'],['Sul e Sudeste do Brasil',0.3,C.his,'~0,3%']];
  const bx=$('#brazil');const lo=Math.log10(0.0001),hi=Math.log10(1);const f2=[];
  B.forEach(([n,v,c,t])=>{const row=document.createElement('div');row.className='cmp-row';const w=(Math.log10(v)-lo)/(hi-lo)*100;
    row.innerHTML='<span>'+n+'</span><div class="tr" style="height:22px"><div class="fl" style="width:'+w+'%;background:'+c+'"></div></div><span class="val" style="color:'+c+'">'+t+'</span>';bx.appendChild(row);f2.push(row.querySelector('.fl'));});
  const ax=document.createElement('div');ax.className='cmp-row';ax.innerHTML='<span></span><div class="mono" style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--dim)"><span>0,0001%</span><span>0,01%</span><span>1%</span></div><span></span>';bx.appendChild(ax);
  const x=document.createElement('p');x.style.cssText='font:600 clamp(22px,2.6vw,30px)/1.1 var(--display);margin-top:8px';x.innerHTML='≈ <span style="color:var(--his)">1.000×</span> <span style="font:400 14px var(--sans);color:var(--muted)">mais frequente no Sul/Sudeste</span>';bx.appendChild(x);
  onSeen(bx,()=>grow(f2));
})();

/* ---------------- DynaMut2 gauge ---------------- */
(function(){const s=$('#gauge');const cx=210,cy=200,R=150,mn=-2,mx=2;const ang=v=>Math.PI-(v-mn)/(mx-mn)*Math.PI;
  const pt=(v,r)=>[cx+r*Math.cos(ang(v)),cy-r*Math.sin(ang(v))];
  function arc(a,b,r){const [x1,y1]=pt(a,r),[x2,y2]=pt(b,r);return 'M'+x1+' '+y1+' A'+r+' '+r+' 0 0 1 '+x2+' '+y2;}
  el('path',{d:arc(mn,0,R),fill:'none',stroke:C.his,'stroke-opacity':.85,'stroke-width':16},s);
  el('path',{d:arc(0,mx,R),fill:'none',stroke:C.arg,'stroke-opacity':.85,'stroke-width':16},s);
  for(let v=mn;v<=mx+1e-9;v+=.5){const [a,b]=pt(v,R-14),[c,d]=pt(v,R-(Number.isInteger(v)?26:20));el('line',{x1:a,y1:b,x2:c,y2:d,stroke:C.muted,'stroke-width':Number.isInteger(v)?1.5:1},s);
    if(Number.isInteger(v)){const [tx,ty]=pt(v,R-42);el('text',{x:tx,y:ty+4,'text-anchor':'middle',class:'lbl'},s,(v>0?'+':v<0?'−':'')+Math.abs(v));}}
  el('text',{x:cx-R,y:cy+26,'text-anchor':'middle',class:'lbl',style:'fill:'+C.his},s,'menos estável');
  el('text',{x:cx+R,y:cy+26,'text-anchor':'middle',class:'lbl',style:'fill:#9DB6FF'},s,'mais estável');
  const needle=el('g',{},s);el('line',{x1:cx,y1:cy,x2:cx,y2:cy-R+30,stroke:C.amber,'stroke-width':3,'stroke-linecap':'round'},needle);el('circle',{cx,cy,r:9,fill:C.amber},needle);el('circle',{cx,cy,r:4,fill:C.ink},needle);
  const val=el('text',{x:cx,y:cy-54,'text-anchor':'middle',style:'font:800 34px var(--display);fill:'+C.amber},s,'−0,94');
  el('text',{x:cx,y:cy-32,'text-anchor':'middle',class:'lbl'},s,'kcal/mol');
  const deg=v=>-(v-mn)/(mx-mn)*180+90;
  const setN=v=>needle.setAttribute('transform','rotate('+(-deg(v))+' '+cx+' '+cy+')');
  setN(-.94);
  onSeen(s,()=>{if(RM||!window.gsap)return;const o={v:0};gsap.fromTo(o,{v:0},{v:-.94,duration:2,ease:'elastic.out(1,.45)',onUpdate:()=>{setN(o.v);val.textContent=(o.v<0?'−':'')+fmt(Math.abs(o.v),2);}});});
})();
/* ---------------- TP53 Database ---------------- */
(function(){const S=[['Glândula adrenal',92,C.arg],['Mama',21,C.his],['Cérebro',16,C.amber],['Tecidos moles',5,'#8A7CFF'],['Rim',2,'#3FC1C9'],['Tireoide',2,'#5FD39A'],['Pulmão',2,'#C57BFF'],['Estômago',2,'#E88D5A'],
  ['Coração/mediastino/pleura',1,'#7A8BB0'],['Pele',1,'#7A8BB0'],['Peritônio',1,'#7A8BB0'],['Ossos – outros',1,'#7A8BB0'],['Sistema hematopoiético',1,'#7A8BB0'],['Glândula parótida',1,'#7A8BB0'],['Colo uterino',1,'#7A8BB0'],['Outros órgãos genitais femininos',1,'#7A8BB0']];
  S.forEach(x=>{x[0]=T(x[0]);});
  const wf=$('#waffle'),list=$('#sites'),info=$('#wInfo'),DEF=info.innerHTML,cells=[],btns=[],fills=[];let sel=null;
  S.forEach((s,si)=>{for(let k=0;k<s[1];k++){const i=document.createElement('i');i.style.setProperty('--c',s[2]);i.dataset.s=si;wf.appendChild(i);cells.push(i);}});
  function waves(){const n=getComputedStyle(wf).gridTemplateColumns.split(' ').length||25;cells.forEach((c,i)=>c.style.setProperty('--d',((i%n)+Math.floor(i/n))*90+'ms'));}
  waves();addEventListener('resize',waves);
  const txt=si=>{const s=S[si];return '<b style="color:'+s[2]+'">'+s[0]+'</b> · '+s[1]+' '+T(s[1]>1?'registros':'registro')+' ('+fmt(s[1]/150*100,2)+'%)';};
  function paint(si){wf.classList.toggle('dim',si!==null);cells.forEach(c=>c.classList.toggle('hl',si!==null&&+c.dataset.s===si));info.innerHTML=si===null?DEF:txt(si);}
  function choose(si){sel=sel===si?null:si;btns.forEach((x,j)=>x.classList.toggle('on',j===sel));paint(sel);
    if(sel!==null&&!RM)cells.filter(c=>+c.dataset.s===sel).forEach((c,k)=>c.animate([{transform:'scale(1)'},{transform:'scale(1.6)'},{transform:'scale(1.12)'}],{duration:520,delay:k*10,easing:'cubic-bezier(.3,1.6,.5,1)'}));}
  S.forEach((s,si)=>{const b=document.createElement('button');b.className='site';b.type='button';const p=s[1]/150*100;
    b.innerHTML='<span class="sw" style="background:'+s[2]+'"></span><span>'+s[0]+'</span><span class="tr"><span class="fl" style="width:'+(s[1]/92*100)+'%;background:'+s[2]+'"></span></span><span class="v tnum">'+s[1]+' <small>'+fmt(p,2)+'%</small></span>';
    b.addEventListener('click',()=>choose(si));b.addEventListener('mouseenter',()=>{if(sel===null)paint(si);});b.addEventListener('mouseleave',()=>{if(sel===null)paint(null);});
    list.appendChild(b);btns.push(b);fills.push(b.querySelector('.fl'));});
  wf.addEventListener('pointerover',e=>{const c=e.target.closest('i');if(c&&sel===null)paint(+c.dataset.s);});
  wf.addEventListener('pointerleave',()=>{if(sel===null)paint(null);});
  wf.addEventListener('click',e=>{const c=e.target.closest('i');if(c)choose(+c.dataset.s);});
  onSeen(wf,()=>{if(RM)return;cells.forEach((c,i)=>{const an=Math.random()*Math.PI*2,r=40+Math.random()*70;
    c.animate([{transform:'translate('+(Math.cos(an)*r).toFixed(1)+'px,'+(Math.sin(an)*r).toFixed(1)+'px) scale(.2) rotate('+(Math.random()*180-90).toFixed(0)+'deg)',opacity:0},{transform:'none',opacity:1}],{duration:900,delay:i*7,easing:'cubic-bezier(.2,1.3,.4,1)',fill:'backwards'});});grow(fills,200);});
})();

/* ---------------- Integration ---------------- */
(function(){const N=[
  {k:'ClinVar',d:'Clínica',href:'#ev-clinvar',x:110,y:95,c:C.his,show:'Seis laboratórios classificam a variante como patogênica ou provavelmente patogênica para a SLF, sem conflitos.',lit:'Concorda com estudos que associam a R337H à predisposição hereditária e à SLF.',refs:[2,3,8,12,14],lim:'Baseia-se em interpretações depositadas e não substitui avaliação clínica individual.'},
  {k:'gnomAD',d:'População',href:'#ev-gnomad',x:370,y:95,c:C.arg,show:'Apenas 5 em 1.613.858 cópias do gene (0,00031%), sem homozigotos; mais frequente no grupo Admixed American.',lit:'Estudos brasileiros descrevem ~0,3% no Sul e Sudeste, pelo efeito fundador.',refs:[4,10,13,19,20],lim:'Reflete apenas a população analisada e não representa todas as populações.'},
  {k:'DynaMut2',d:'Estrutura',href:'#ev-dynamut',x:110,y:325,c:C.amber,show:'ΔΔG de −0,94 kcal/mol: a p53 fica menos estável, e as ligações ao redor da peça 337 mudam.',lit:'Concorda com estudos que mostram redução da estabilidade do tetrâmero e alteração da oligomerização.',refs:[4,9,13],lim:'Realiza predição estrutural e não substitui testes experimentais.'},
  {k:'TP53 DB',d:'Tumores',href:'#ev-tp53db',x:370,y:325,c:'#8A7CFF',show:'150 tumores registrados: adrenal 61,33%, mama 14,00%, cérebro 10,67%.',lit:'A literatura associa a R337H a sarcomas, mama, adrenocortical, SNC e outras neoplasias do espectro da SLF.',refs:[2,3,17,18,19,20,21],lim:'Apresenta registros disponíveis e não estima risco individual de câncer.'}];
  N.forEach(n=>{n.d=T(n.d);n.show=T(n.show);n.lit=T(n.lit);n.lim=T(n.lim);});
  const s=$('#integSvg'),card=$('#intCard'),cx=240,cy=210;
  N.forEach(n=>{el('line',{x1:n.x,y1:n.y,x2:cx,y2:cy,stroke:n.c,'stroke-opacity':.25,'stroke-width':1},s);el('line',{x1:n.x,y1:n.y,x2:cx,y2:cy,stroke:n.c,'stroke-width':2,class:RM?'':'flow'},s);});
  el('circle',{cx,cy,r:70,fill:'rgba(255,84,112,.06)',stroke:C.line2},s);
  el('circle',{cx,cy,r:52,fill:C.panel2,stroke:C.his,'stroke-width':1.5},s);
  el('text',{x:cx,y:cy-4,'text-anchor':'middle',style:'font:800 20px var(--display);fill:'+C.text},s,'R337H');
  el('text',{x:cx,y:cy+16,'text-anchor':'middle',class:'lbl'},s,'↔ SLF');
  const cite=a=>'<sup class="cites">'+a.map(n=>'<a class="cite" href="#ref-'+n+'">'+n+'</a>').join(',')+'</sup>';
  const nodes=[];
  function pick(i){const n=N[i];nodes.forEach((g,j)=>{g.querySelector('.ring').setAttribute('stroke-width',j===i?3:1.5);g.querySelector('.core').setAttribute('fill',j===i?n.c:C.panel2);g.setAttribute('aria-pressed',String(j===i));});
    card.innerHTML='<span class="eyebrow" style="color:'+n.c+'">'+n.d+'</span><h3>'+n.k+(n.k==='TP53 DB'?'':'')+'</h3>'+
    '<div class="blk"><b style="color:var(--muted)">'+T('O que mostrou')+'</b><p>'+n.show+'</p></div>'+
    '<div class="blk"><b style="color:var(--muted)">'+T('Literatura')+'</b><p>'+n.lit+cite(n.refs)+'</p></div>'+
    '<div class="blk"><b style="color:var(--his)">'+T('Cuidado ao interpretar')+'</b><p>'+n.lim+'</p></div><a class="more" href="'+n.href+'">'+T('Ver resultado completo →')+'</a>';}
  N.forEach((n,i)=>{const g=el('g',{class:'node',tabindex:0,role:'button','aria-label':n.k+' — '+n.d},s);
    el('circle',{class:'ring',cx:n.x,cy:n.y,r:44,fill:'none',stroke:n.c,'stroke-width':1.5},g);
    el('circle',{class:'core',cx:n.x,cy:n.y,r:36,fill:C.panel2},g);
    el('text',{x:n.x,y:n.y+2,'text-anchor':'middle',style:'font:600 12.5px var(--display);fill:'+C.text},g,n.k);
    el('text',{x:n.x,y:n.y+(n.y<200?-54:64),'text-anchor':'middle',class:'lbl'},g,n.d.toUpperCase());
    g.addEventListener('click',()=>{pick(i);if(!RM)g.animate([{transform:'scale(.9)'},{transform:'scale(1)'}],{duration:350,easing:'cubic-bezier(.3,1.6,.5,1)'});});g.style.transformBox='fill-box';g.style.transformOrigin='center';g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(i);}});nodes.push(g);});
  pick(0);
  const tb=$('#limBody');N.forEach(n=>{const tr=document.createElement('tr');tr.innerHTML='<td style="color:'+n.c+'">'+(n.k==='TP53 DB'?'TP53 Database':n.k)+'</td><td>'+n.show+'</td><td>'+n.lim+'</td>';tb.appendChild(tr);});
})();

/* ---------------- References ---------------- */
const REFS=[
 ['Schneider K, Zelley K, Nichols KE, Levine AS, Garber J.','Li-Fraumeni Syndrome.','1999 Jan 19 [Updated 2025 May 1]. In: Adam MP, Feldman J, Mirzaa GM, et al., editors. GeneReviews [Internet]. Seattle (WA): University of Washington, Seattle; 1993-2025.'],
 ['Volc SM, Ramos CRN, Galvão HCR, Felicio PS, Coelho AS, Berardineli GN, et al.','The Brazilian TP53 mutation (R337H) and sarcomas.','PLoS One. 2020;15(1):e0227260.'],
 ['Galante PAF, Guardia GDA, Pisani J, Sandoval RL, Barros-Filho MC, Gifoni ACLVC, et al.','Personalized screening strategies for TP53 R337H carriers: a retrospective cohort study of tumor spectrum in Li-Fraumeni syndrome adult carriers.','Lancet Reg Health Am. 2025;42:100982.'],
 ['Giacomazzi J, Selistre S, Duarte J, Ribeiro JP, Vieira PJC, Macedo GS, et al.','TP53 p.R337H is a conditional cancer-predisposing mutation: further evidence from a homozygous patient.','BMC Cancer. 2013;13:187.'],
 ['Giacomazzi CR, Giacomazzi J, Netto CBO, Santos-Silva P, Selistre SG, Maia AL, et al.','Pediatric cancer and Li-Fraumeni/Li-Fraumeni-like syndromes: a review for the pediatrician.','Rev Assoc Med Bras. 2015;61(3):282-9.'],
 ['de Andrade KC, Khincha PP, Hatton JN, Frone MN, Wegman-Ostrosky T, Mai PL, et al.','Cancer incidence, patterns, and genotype-phenotype associations in individuals with pathogenic or likely pathogenic germline TP53 variants: an observational cohort study.','Lancet Oncol. 2021;22(12):1787-98.'],
 ['Ray Das S, Delahunt B, Lasham A, Li K, Wright D, Print C, et al.','Combining TP53 mutation and isoform has the potential to improve clinical practice.','Pathology. 2024;56(4):473-83.'],
 ['Bittar CM, Rocha YMA, Vieira IA, Rosset C, Andreis TF, Sartor ITS, et al.','Clinical and molecular characterization of patients fulfilling Chompret criteria for Li-Fraumeni syndrome in Southern Brazil.','PLoS One. 2021;16(9):e0251639.'],
 ['Meneghetti BV, Wilson R, Dias CK, Cadore NA, Klamt F, Zaha A, et al.','p53 mutants G245S and R337H associated with the Li-Fraumeni syndrome regulate distinct metabolic pathways.','Biochimie. 2022;198:141-54.'],
 ['Pinto EM, Fridman C, Figueiredo BC, Salvador H, Teixeira MR, Pinto C, et al.','Multiple TP53 p.R337H haplotypes and implications for tumor susceptibility.','HGG Adv. 2024;5(1):100244.'],
 ['Frankenthal IA, Alves MC, Tak C, Achatz MI.','Cancer surveillance for patients with Li-Fraumeni Syndrome in Brazil: a cost-effectiveness analysis.','Lancet Reg Health Am. 2022;12:100265.'],
 ['Sandoval RL, Masotti C, Macedo MP, Ribeiro MFS, Leite ACR, Meireles SI, et al.','Identification of the TP53 p.R337H variant in tumor genomic profiling should prompt consideration of germline testing for Li-Fraumeni syndrome.','JCO Glob Oncol. 2021;7:1141-1150.'],
 ['Mathias C, Bortoletto S, Centa A, Komechen H, Lima RS, Fonseca AS, et al.','Frequency of the TP53 R337H variant in sporadic breast cancer and its impact on genomic instability.','Sci Rep. 2020;10:16614.'],
 ["Rocca V, Blandino G, D'Antona L, Iuliano R, Di Agostino S.",'Li-Fraumeni Syndrome: mutation of TP53 is a biomarker of hereditary predisposition to tumor: new insights and advances in the treatment.','Cancers (Basel). 2022;14(15):3664.'],
 ['Hosseini MS.','Current insights and future directions of Li-Fraumeni syndrome.','Discover Oncol. 2024;15:561.'],
 ['Lee JW.','Li-Fraumeni Syndrome: current strategies and future perspectives.','J Korean Neurosurg Soc. 2025;68(3):305-310.'],
 ['Sandoval RL, Polidorio N, Leite ACR, Cartaxo M, Pisani JP, Quirino CV, et al.','Breast cancer phenotype associated with Li-Fraumeni syndrome: a Brazilian cohort enriched by TP53 p.R337H carriers.','Front Oncol. 2022;12:836937.'],
 ['Lopes CDH, Antonacio FF, Moraes PMG, Asprino PF, Galante PAF, Jardim DL, et al.','The clinical and molecular profile of lung cancer patients harboring the TP53 R337H germline variant in a Brazilian cancer center: the possible mechanism of carcinogenesis.','Int J Mol Sci. 2023;24(20):15035.'],
 ['Corrêa TS, Asprino PF, Oliveira ESC, Leite ACR, Weis L, Achatz MI, et al.','TP53 p.R337H germline variant among women at risk of hereditary breast cancer in a public health system of Midwest Brazil.','Genes (Basel). 2024;15(7):928.'],
 ['Pinto EM, Muzzi JCD, Yunes JA, Figueiredo BC, Ribeiro RC, Zambetti GP.','Reconstructing the origin and demographic expansion of the TP53 p.R337H founder variant in Brazil.','Cancer Epidemiol Biomarkers Prev. 2026;35(2):210-216.'],
 ['Formiga MNDC, de Andrade KC, Kowalski LP, Achatz MI.','Frequency of thyroid carcinoma in Brazilian TP53 p.R337H carriers with Li Fraumeni syndrome.','JAMA Oncol. 2017;3(10):1400-1402.']];
(function(){const ol=$('#refs');REFS.forEach((r,i)=>{const li=document.createElement('li');li.id='ref-'+(i+1);
  const q=encodeURIComponent(r[1].replace(/\.$/,''));
  li.innerHTML='<span class="n">'+(i+1)+'</span><div><p>'+r[0]+' <span class="t">'+r[1]+'</span> '+r[2]+'</p><a class="pm" href="https://pubmed.ncbi.nlm.nih.gov/?term='+q+'" target="_blank" rel="noopener">'+T('Buscar no PubMed ↗')+'</a></div>';
  li.dataset.s=(r.join(' ')).toLowerCase();ol.appendChild(li);});
  const inp=$('#refSearch'),cnt=$('#refCount');inp.addEventListener('input',()=>{const v=inp.value.trim().toLowerCase();let n=0;ol.querySelectorAll('li').forEach(li=>{const ok=!v||li.dataset.s.includes(v);li.hidden=!ok;if(ok)n++;});cnt.textContent=n+' '+T(n===1?'referência':'referências');});
  document.addEventListener('click',e=>{const a=e.target.closest('a.cite');if(!a)return;const li=document.querySelector(a.getAttribute('href'));if(!li)return;e.preventDefault();inp.value='';inp.dispatchEvent(new Event('input'));
    li.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'});li.classList.add('flash');setTimeout(()=>li.classList.remove('flash'),1600);});
})();
})();
