/* GenoEvidence · DNA 3D da abertura e fundo animado (usado no início e nos artigos) */
(function(){
"use strict";
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = {arg:'#4D7CFF', his:'#FF5470', amber:'#FFB23F', text:'#E7ECF6', muted:'#8D9AB5', dim:'#5B6883', line:'#1B2742', line2:'#27365A', panel2:'#0F182B', ink:'#060A13'};
const NS='http://www.w3.org/2000/svg';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function el(tag,attrs,parent,text){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!=null)e.textContent=text;if(parent)parent.appendChild(e);return e;}
function onSeen(node,fn,th){if(!('IntersectionObserver' in window)){fn();return;}const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){io.disconnect();fn();}})},{threshold:th||.25});io.observe(node);}
function grow(nodes,delay){if(RM)return;nodes.forEach((n,i)=>n.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:900,delay:(delay||0)+i*60,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));}
const fmt=(n,d)=>n.toLocaleString('pt-BR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});


/* ---------------- WebGL helpers ---------------- */
function mkRenderer(canvas){if(!window.THREE)return null;try{const r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio||1,2));r.setClearColor(0,0);return r;}catch(e){return null;}}
function fit(r,cam,canvas){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;const pr=r.getPixelRatio();if(canvas.width!==Math.round(w*pr)||canvas.height!==Math.round(h*pr)){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}}
function loopWhenVisible(node,frame){let vis=false,raf=0;const run=()=>{raf=0;if(!vis)return;frame();if(!RM)raf=requestAnimationFrame(run);};
  const io=new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis&&!raf)raf=requestAnimationFrame(run);});io.observe(node);
  return ()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;frame();});};}
function glowTex(col){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,col);gr.addColorStop(.25,col+'aa');gr.addColorStop(1,col+'00');g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}


/* ---------------- HERO: DNA helix ---------------- */
(function(){
  const canvas=$('#helix');if(!canvas)return;const r=mkRenderer(canvas);if(!r)return;
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
  const label=$('#mutLabel')||document.createElement('span');let mx=0,my=0,t0=performance.now();
  addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;},{passive:true});
  const v=new THREE.Vector3();
  function layout(){const w=canvas.clientWidth;const mobile=w<980;root.position.set(mobile?1.2:5.2,mobile?-1.5:0,0);root.scale.setScalar(mobile?.72:1);canvas.style.opacity=mobile?.5:1;label.style.display=mobile?'none':'flex';}
  const kick=loopWhenVisible(canvas,()=>{fit(r,cam,canvas);layout();const t=(performance.now()-t0)/1000;
    g.rotation.y=RM?.6:t*.22+scrollY*.002;
    cam.position.x+=(mx*2-cam.position.x)*.04;cam.position.y+=(-my*1.4-cam.position.y)*.04;cam.lookAt(0,0,0);
    const pulse=1+.18*Math.sin(t*2.4);glow.scale.set(4*pulse,4*pulse,1);pts.rotation.y=t*.01;
    r.render(scene,cam);
    glow.getWorldPosition(v);v.project(cam);const x=(v.x*.5+.5)*canvas.clientWidth,y=(-v.y*.5+.5)*canvas.clientHeight;
    label.style.left=x+'px';label.style.top=y+'px';const roEl=document.querySelector('.readout'),ro=roEl?roEl.getBoundingClientRect():{left:1e9,top:1e9,width:0,height:0},hb=canvas.getBoundingClientRect(),rx=ro.left-hb.left,ry=ro.top-hb.top;const hit=x+210>rx&&x<rx+ro.width&&y>ry-24&&y<ry+ro.height+24;label.style.opacity=(v.z<1&&x<canvas.clientWidth-190&&!hit)?1:0;});
  addEventListener('resize',kick);
})();


/* ---------------- fundo animado em todo o site ---------------- */
(function(){
  const cv=$('#bgfx'),grid=$('.bg-grid'),hero=$('.hero');if(!cv||!grid)return;const r=mkRenderer(cv);
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


})();
