/* GenoEvidence · DNA em 3D
   Dupla hélice girando devagar, com um “degrau” em destaque (a mutação) que pulsa.
   Usado em dois lugares do Início:
   - a tela de abertura (#splash), que aparece por 2 segundos quando a pessoa entra no app;
   - a abertura da página (#dna3d), ao lado do título.
   Se o 3D não estiver disponível, a página segue normal. */
(function () {
  "use strict";
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Desenha o DNA num <canvas>. Devolve { parar } para desligar a animação, ou null se não houver 3D.
  function criarDNA(cv, opcoes) {
    if (!cv || !window.THREE) return null;
    const op = Object.assign({ seguirMouse: true, inclinacao: -0.38, aoDesenhar: null }, opcoes);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 15);
    cena.add(new THREE.AmbientLight(0xffffff, 0.75));
    const luz = new THREE.DirectionalLight(0xffffff, 0.7); luz.position.set(4, 6, 8); cena.add(luz);

    const helice = new THREE.Group();
    cena.add(helice);
    const PARES = 26, PASSO = 0.42, RAIO = 1.9, GIRO = 0.46, MUTADO = 15;
    const esfera = new THREE.SphereGeometry(0.26, 24, 16);
    const matA = new THREE.MeshStandardMaterial({ color: 0x2f5bea, roughness: 0.35, metalness: 0.1 });
    const matB = new THREE.MeshStandardMaterial({ color: 0x7b4de0, roughness: 0.35, metalness: 0.1 });
    const matDegrauA = new THREE.MeshStandardMaterial({ color: 0x9db6ff, roughness: 0.5 });
    const matDegrauB = new THREE.MeshStandardMaterial({ color: 0xc9b8ff, roughness: 0.5 });
    const matMut = new THREE.MeshStandardMaterial({ color: 0xe0385a, emissive: 0xe0385a, emissiveIntensity: 0.35, roughness: 0.3 });
    const cima = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < PARES; i++) {
      const ang = i * GIRO, y = (i - PARES / 2) * PASSO;
      const pA = new THREE.Vector3(Math.cos(ang) * RAIO, y, Math.sin(ang) * RAIO);
      const pB = new THREE.Vector3(-pA.x, y, -pA.z);
      const a = new THREE.Mesh(esfera, matA); a.position.copy(pA); helice.add(a);
      const b = new THREE.Mesh(esfera, matB); b.position.copy(pB); helice.add(b);
      // o “degrau” (par de bases) em duas metades, cada uma com a cor de um lado
      const meio = pA.clone().add(pB).multiplyScalar(0.5);
      [[pA, i === MUTADO ? matMut : matDegrauA], [pB, i === MUTADO ? matMut : matDegrauB]].forEach(([p, m]) => {
        const dir = meio.clone().sub(p), len = dir.length();
        const cil = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 10), m);
        cil.position.copy(p.clone().add(meio).multiplyScalar(0.5));
        cil.quaternion.setFromUnitVectors(cima, dir.normalize());
        helice.add(cil);
      });
    }
    // a mutação ganha um brilho em volta
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), new THREE.MeshBasicMaterial({ color: 0xe0385a, transparent: true, opacity: 0.16 }));
    halo.position.set(0, (MUTADO - PARES / 2) * PASSO, 0);
    helice.add(halo);
    helice.rotation.z = op.inclinacao;

    function medir() {
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.position.z = r.width < 520 ? 17 : 15;
      camera.updateProjectionMatrix();
    }
    medir();
    addEventListener("resize", medir);

    let alvoX = 0, alvoY = 0, visivel = true, raf = 0, ativo = true, primeiro = true;
    const mouse = e => { alvoX = (e.clientX / innerWidth - 0.5) * 0.5; alvoY = (e.clientY / innerHeight - 0.5) * 0.3; };
    if (op.seguirMouse) addEventListener("pointermove", mouse, { passive: true });
    const t0 = performance.now();
    function quadro(agora) {
      raf = 0;
      if (!ativo) return;
      const t = (agora - t0) / 1000;
      helice.rotation.y = RM ? 0.6 : t * (op.velocidade || 0.35);
      helice.rotation.x += ((RM ? 0 : alvoY) - helice.rotation.x) * 0.05;
      helice.position.x += ((RM ? 0 : alvoX) - helice.position.x) * 0.05;
      if (!RM) {
        const p = 0.5 + 0.5 * Math.sin(t * 2.4);
        matMut.emissiveIntensity = 0.2 + p * 0.5;
        halo.scale.setScalar(1 + p * 0.35);
        halo.material.opacity = 0.1 + p * 0.12;
      }
      renderer.render(cena, camera);
      if (primeiro) { primeiro = false; if (op.aoDesenhar) op.aoDesenhar(); }
      if (!RM && visivel) raf = requestAnimationFrame(quadro);
    }
    const io = new IntersectionObserver(es => { visivel = es[0].isIntersecting; if (visivel && !raf && !RM && ativo) raf = requestAnimationFrame(quadro); });
    io.observe(cv);
    quadro(performance.now());
    return {
      parar() {
        ativo = false; io.disconnect();
        removeEventListener("resize", medir); removeEventListener("pointermove", mouse);
        if (raf) cancelAnimationFrame(raf);
        renderer.dispose();
      }
    };
  }

  // ---------- tela de abertura: o DNA aparece, gira 2 segundos e some ----------
  const splash = document.getElementById("splash");
  if (splash) {
    let saiu = false;
    const sair = () => {
      if (saiu) return; saiu = true;
      splash.classList.add("saindo");
      setTimeout(() => { if (dnaSplash) dnaSplash.parar(); splash.remove(); }, 380);
    };
    const dnaSplash = criarDNA(document.getElementById("dnaSplash"), {
      seguirMouse: false, velocidade: 1.1,
      aoDesenhar: () => setTimeout(sair, 2000)  // 2 segundos com o DNA girando
    });
    if (!dnaSplash) setTimeout(sair, 2000);
    setTimeout(sair, 4500);                      // nunca prende a pessoa, mesmo se a internet estiver lenta
  }

  // ---------- DNA ao lado do título ----------
  criarDNA(document.getElementById("dna3d"));
})();
