"use client";
import { PluginContext } from "molstar/lib/mol-plugin/context";
import { DefaultPluginSpec } from "molstar/lib/mol-plugin/spec";
import { PluginBehaviors } from "molstar/lib/mol-plugin/behavior";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import type { Expression } from "molstar/lib/mol-script/language/expression";
import { Script } from "molstar/lib/mol-script/script";
import { StructureElement, StructureProperties as SP, StructureSelection, type Structure } from "molstar/lib/mol-model/structure";
import { Color } from "molstar/lib/mol-util/color";
import { ResidueNameColors } from "molstar/lib/mol-theme/color/residue-name";
import { Mat4 } from "molstar/lib/mol-math/linear-algebra/3d/mat4";
import { Vec3 } from "molstar/lib/mol-math/linear-algebra/3d/vec3";
import { Vec4 } from "molstar/lib/mol-math/linear-algebra/3d/vec4";
import { setSubtreeVisibility } from "molstar/lib/mol-plugin/behavior/static/state";
import { Loci } from "molstar/lib/mol-model/loci";
import { changeCameraRotation, structureLayingTransform } from "molstar/lib/mol-plugin-state/manager/focus-camera/orient-axes";

/**
 * Motor do visualizador molecular da BioMol, sobre o Mol* (Sehnal et al., NAR 2021).
 *
 * Mostra a UNIDADE ASSIMÉTRICA DEPOSITADA, modelo 1 — exatamente o que os cálculos do GenoLab leem
 * do mesmo arquivo (superposição, pares de bases, sequência). Assim o que se mede é o que se vê.
 *
 * O clique é tratado aqui, não pelos comportamentos padrão do Mol* (que dão zoom a cada clique e
 * atrapalham medir): explorar = identificar e focar; medir = juntar átomos.
 */

export type Representacao = "cartoon" | "bastoes" | "bola-bastao" | "superficie" | "esferas";
export type Coloracao = "cadeia" | "estrutura-secundaria" | "residuo" | "elemento" | "hidrofobicidade" | "uniforme";

export type AtomoInfo = {
  /** Índice da estrutura carregada (0, 1…). */
  estrutura: number;
  cadeia: string;
  numero: number;
  insercao: string;
  residuo: string;
  atomo: string;
  elemento: string;
  x: number;
  y: number;
  z: number;
  b: number;
  tipo: "proteina" | "acido-nucleico" | "agua" | "ligante" | "outro";
};

export type RegiaoRef = { estrutura: number; cadeia: string; de?: number; ate?: number };

const COR_TEMA: Record<Coloracao, string> = {
  cadeia: "chain-id",
  "estrutura-secundaria": "secondary-structure",
  residuo: "residue-name",
  elemento: "element-symbol",
  hidrofobicidade: "hydrophobicity",
  uniforme: "uniform",
};

const FUNDO = Color(0x0b1221);

/** Lê um token de cor do tema (hex) como número, para o Mol*. */
function token(nome: string, reserva: number): number {
  if (typeof window === "undefined") return reserva;
  const v = getComputedStyle(document.querySelector(".ge-dark") ?? document.documentElement).getPropertyValue(`--${nome}`).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  return m ? parseInt(m[1], 16) : reserva;
}

/**
 * Cores das bases iguais às do resto da BioMol (A, T/U, G, C), no lugar da paleta padrão do Mol*
 * — que pinta A de vermelho e T de azul, o contrário do que a pessoa vê no texto ao lado.
 */
function coresDasBases() {
  const A = Color(token("ok", 0x5fd4dd));
  const T = Color(token("danger", 0xff5470));
  const G = Color(token("warn", 0xffb23f));
  const C = Color(token("accent", 0x4d7cff));
  return { ...ResidueNameColors, A, DA: A, T, DT: T, U: T, DU: T, G, DG: G, C, DC: C };
}

type Carregada = {
  rotulo: string;
  estruturaRef: string;
  /** Nó de transformação (superposição), quando existe. */
  transformRef?: string;
  componentes: string[];
  cor?: number;
};

function expressaoRegiao(r: RegiaoRef): Expression {
  const testes: Expression[] = [];
  if (r.de !== undefined) testes.push(MS.core.rel.gre([MS.struct.atomProperty.macromolecular.auth_seq_id(), r.de]));
  if (r.ate !== undefined) testes.push(MS.core.rel.lte([MS.struct.atomProperty.macromolecular.auth_seq_id(), r.ate]));
  return MS.struct.generator.atomGroups({
    "chain-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), r.cadeia]),
    ...(testes.length ? { "residue-test": testes.length > 1 ? MS.core.logic.and(testes) : testes[0] } : {}),
  });
}

function expressaoResiduo(cadeia: string, numero: number, insercao = ""): Expression {
  const t: Expression[] = [MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_seq_id(), numero])];
  if (insercao) t.push(MS.core.rel.eq([MS.struct.atomProperty.macromolecular.pdbx_PDB_ins_code(), insercao]));
  return MS.struct.generator.atomGroups({
    "chain-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), cadeia]),
    "residue-test": t.length > 1 ? MS.core.logic.and(t) : t[0],
  });
}

function expressaoAtomo(cadeia: string, numero: number, insercao: string, atomo: string): Expression {
  const t: Expression[] = [MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_seq_id(), numero])];
  if (insercao) t.push(MS.core.rel.eq([MS.struct.atomProperty.macromolecular.pdbx_PDB_ins_code(), insercao]));
  return MS.struct.generator.atomGroups({
    "chain-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), cadeia]),
    "residue-test": t.length > 1 ? MS.core.logic.and(t) : t[0],
    "atom-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_atom_id(), atomo]),
  });
}

export class MotorMolecular {
  readonly p: PluginContext;
  private carregadas: Carregada[] = [];
  private destaqueRefs: string[] = [];
  private isoladaRefs: string[] = [];
  private medidas: string[] = [];
  private rep: Representacao = "cartoon";
  private cor: Coloracao = "cadeia";
  modo: "explorar" | "medir" = "explorar";
  movimentoReduzido = false;
  /** Raio da esfera que envolve tudo o que está carregado (Å), calculado em `enquadrar`. */
  private raioCena = 0;

  private constructor(p: PluginContext) {
    this.p = p;
  }

  static async criar(canvas: HTMLCanvasElement, container: HTMLDivElement): Promise<MotorMolecular> {
    const spec = DefaultPluginSpec();
    // Sem o zoom-ao-clicar e a seleção-ao-clicar padrões: o clique é nosso (ver aoClicar).
    const fora = new Set<unknown>([PluginBehaviors.Camera.FocusLoci, PluginBehaviors.Representation.FocusLoci, PluginBehaviors.Representation.SelectLoci]);
    spec.behaviors = spec.behaviors.filter((b) => !fora.has(b.transformer));
    const p = new PluginContext(spec);
    await p.init();
    const ok = await p.initViewerAsync(canvas, container);
    if (!ok) {
      p.dispose();
      throw new Error("WebGL indisponível: este navegador não consegue desenhar em 3D.");
    }
    // manualReset: o Mol* não mexe na câmera sozinho ao receber dados novos (nem ao trocar a
    // representação); quem enquadra é `enquadrar`, depois de cada carga.
    p.canvas3d?.setProps({ renderer: { backgroundColor: FUNDO }, cameraFog: { name: "off", params: {} }, camera: { manualReset: true } });
    return new MotorMolecular(p);
  }

  destruir() {
    this.p.dispose();
  }

  get quantas() {
    return this.carregadas.length;
  }

  private estruturaCell(i: number) {
    return this.p.state.data.cells.get(this.carregadas[i]?.estruturaRef);
  }
  private estrutura(i: number): Structure | undefined {
    const ref = this.carregadas[i]?.transformRef ?? this.carregadas[i]?.estruturaRef;
    return this.p.state.data.cells.get(ref)?.obj?.data as Structure | undefined;
  }
  /** O nó a partir do qual os componentes são criados (o transformado, quando há superposição). */
  private raiz(i: number): string {
    return this.carregadas[i].transformRef ?? this.carregadas[i].estruturaRef;
  }

  /** Carrega um arquivo (texto) e devolve o índice da estrutura. `cor` fixa uma cor única (para comparar). */
  async carregar(texto: string, formato: "mmcif" | "pdb", rotulo: string, cor?: number): Promise<number> {
    const p = this.p;
    const data = await p.builders.data.rawData({ data: texto, label: rotulo });
    const traj = await p.builders.structure.parseTrajectory(data, formato);
    const model = await p.builders.structure.createModel(traj, { modelIndex: 0 });
    const st = await p.builders.structure.createStructure(model, { name: "model", params: {} });
    this.carregadas.push({ rotulo, estruturaRef: st.ref, componentes: [], cor });
    const i = this.carregadas.length - 1;
    await this.montar(i);
    return i;
  }

  /** Tira tudo (para trocar de estrutura sem recriar o visualizador). */
  async limpar() {
    const b = this.p.build();
    for (const c of this.carregadas) {
      const cell = this.p.state.data.cells.get(c.estruturaRef);
      // apaga a partir dos dados brutos (o nó mais acima desta estrutura)
      let ref = c.estruturaRef;
      let atual = cell;
      while (atual && atual.transform.parent && atual.transform.parent !== this.p.state.data.tree.root.ref) {
        ref = atual.transform.parent;
        atual = this.p.state.data.cells.get(ref);
      }
      b.delete(ref);
    }
    await b.commit();
    this.carregadas = [];
    this.destaqueRefs = [];
    this.isoladaRefs = [];
    this.medidas = [];
  }

  private async montar(i: number) {
    const p = this.p;
    const c = this.carregadas[i];
    if (c.componentes.length) {
      const b = p.build();
      for (const r of c.componentes) b.delete(r);
      await b.commit();
      c.componentes = [];
    }
    const cell = p.state.data.cells.get(this.raiz(i));
    if (!cell) return;
    const cor = c.cor !== undefined ? "uniform" : COR_TEMA[this.cor];
    const colorParams =
      c.cor !== undefined
        ? { value: Color(c.cor) }
        : this.cor === "uniforme"
          ? { value: Color(0x7d9dff) }
          : this.cor === "residuo"
            ? { colors: { name: "custom", params: coresDasBases() } }
            : undefined;
    const add = async (tipo: "polymer" | "ligand" | "all-sem-agua", rep: string, typeParams?: Record<string, unknown>) => {
      const comp =
        tipo === "all-sem-agua"
          ? await p.builders.structure.tryCreateComponentFromExpression(cell, MS.struct.modifier.exceptBy({ 0: MS.struct.generator.all(), by: MS.struct.generator.atomGroups({ "entity-test": MS.core.rel.eq([MS.ammp("entityType"), "water"]) }) }), `todos-${Date.now()}-${Math.random()}`, { label: "Tudo (sem água)" })
          : await p.builders.structure.tryCreateComponentStatic(cell, tipo);
      if (!comp) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await p.builders.structure.representation.addRepresentation(comp, { type: rep as any, color: cor as any, colorParams, typeParams } as any);
      c.componentes.push(comp.ref);
    };
    switch (this.rep) {
      case "cartoon":
        await add("polymer", "cartoon");
        await add("ligand", "ball-and-stick");
        break;
      case "bastoes":
        await add("all-sem-agua", "ball-and-stick", { sizeFactor: 0.18, sizeAspectRatio: 1 });
        break;
      case "bola-bastao":
        await add("all-sem-agua", "ball-and-stick");
        break;
      case "superficie":
        await add("polymer", "molecular-surface");
        await add("ligand", "ball-and-stick");
        break;
      case "esferas":
        await add("all-sem-agua", "spacefill");
        break;
    }
  }

  async representar(rep: Representacao, cor: Coloracao) {
    this.rep = rep;
    this.cor = cor;
    for (let i = 0; i < this.carregadas.length; i++) await this.montar(i);
    if (this.isoladaRefs.length) this.visibilidadeBase(false);
  }

  // ------------------------------------------------------------ câmera

  /**
   * Enquadra tudo, alinhado pelos eixos principais da molécula: o eixo mais comprido fica na
   * horizontal (uma dupla-hélice aparece de lado, não vista pela ponta).
   *
   * Calcula a esfera que envolve TODAS as estruturas carregadas e põe a câmera para caber nela; só
   * então gira. (O orientAxes do Mol* só gira a câmera onde ela está — e logo depois de carregar ela
   * ainda não está ajustada ao tamanho da molécula.)
   */
  enquadrar() {
    const c = this.p.canvas3d;
    const estruturas = this.carregadas.map((_, i) => this.estrutura(i)).filter((x): x is Structure => Boolean(x));
    if (!c || !estruturas.length) {
      this.p.managers.camera.reset(undefined, this.movimentoReduzido ? 0 : 500);
      return;
    }
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    for (const st of estruturas) {
      const { center, radius } = st.boundary.sphere;
      min = min.map((v, k) => Math.min(v, center[k] - radius));
      max = max.map((v, k) => Math.max(v, center[k] + radius));
    }
    const centro = Vec3.create((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    const raio = Math.max(...estruturas.map((st) => Vec3.distance(centro, st.boundary.sphere.center) + st.boundary.sphere.radius));
    const { rotation } = structureLayingTransform(estruturas);
    this.raioCena = raio;
    const alvo = { ...c.camera.getSnapshot(), ...c.camera.getFocus(centro, raio) };
    alvo.radius = raio;
    alvo.radiusMax = raio;
    c.camera.setState(changeCameraRotation(alvo, rotation), this.movimentoReduzido ? 0 : 500);
  }

  girar(ligado: boolean, velocidade = 0.6) {
    this.p.canvas3d?.setProps({ trackball: { animate: ligado && !this.movimentoReduzido ? { name: "spin", params: { speed: velocidade } } : { name: "off", params: {} } } });
  }

  private loci(i: number, expr: Expression): StructureElement.Loci | null {
    const st = this.estrutura(i);
    if (!st) return null;
    const l = StructureSelection.toLociWithSourceUnits(Script.getStructureSelection(expr, st));
    return StructureElement.Loci.isEmpty(l) ? null : l;
  }

  /**
   * Aproxima a câmera de um trecho SEM fatiar a cena. O foco padrão do Mol* aproxima também o plano
   * de corte, e tudo o que fica entre a câmera e o ponto focado some — numa dupla-hélice isso parece
   * uma molécula quebrada. Aqui a distância vem do trecho focado, mas o corte continua o da cena toda.
   */
  private focar(l: StructureElement.Loci) {
    const c = this.p.canvas3d;
    const esfera = Loci.getBoundingSphere(l);
    if (!c || !esfera) return;
    const raio = Math.max(esfera.radius + 5, 8);
    const alvo = c.camera.getFocus(esfera.center, raio);
    alvo.radius = Math.max(this.raioCena, c.camera.state.radiusMax, raio);
    c.camera.setState(alvo, this.movimentoReduzido ? 0 : 600);
  }

  /** Foca um resíduo: aproxima a câmera, marca e mostra o entorno em bastões. */
  focarResiduo(i: number, cadeia: string, numero: number, insercao = ""): boolean {
    const l = this.loci(i, expressaoResiduo(cadeia, numero, insercao));
    if (!l) return false;
    this.p.managers.interactivity.lociSelects.selectOnly({ loci: l });
    this.p.managers.structure.focus.setFromLoci(l);
    this.focar(l);
    return true;
  }

  focarRegiao(r: RegiaoRef): boolean {
    const l = this.loci(r.estrutura, expressaoRegiao(r));
    if (!l) return false;
    this.focar(l);
    return true;
  }

  limparFoco() {
    this.p.managers.structure.focus.clear();
    this.p.managers.interactivity.lociSelects.deselectAll();
  }

  // ------------------------------------------------------------ destacar e isolar

  /** Destaca regiões em bastões coloridos (por cima da representação atual). */
  async destacar(regioes: RegiaoRef[], cor = 0x4d7cff) {
    const p = this.p;
    if (this.destaqueRefs.length) {
      const b = p.build();
      for (const r of this.destaqueRefs) b.delete(r);
      await b.commit();
      this.destaqueRefs = [];
    }
    for (const r of regioes) {
      const cell = p.state.data.cells.get(this.raiz(r.estrutura));
      if (!cell) continue;
      const comp = await p.builders.structure.tryCreateComponentFromExpression(cell, expressaoRegiao(r), `destaque-${Date.now()}-${Math.random()}`, { label: "Destaque" });
      if (!comp) continue;
      await p.builders.structure.representation.addRepresentation(comp, { type: "ball-and-stick", color: "uniform", colorParams: { value: Color(cor) }, typeParams: { sizeFactor: 0.28 } });
      this.destaqueRefs.push(comp.ref);
    }
  }

  private visibilidadeBase(visivel: boolean) {
    for (const c of this.carregadas) for (const r of c.componentes) setSubtreeVisibility(this.p.state.data, r, !visivel);
  }

  /** Mostra só a região (null = mostrar tudo de novo). */
  async isolar(r: RegiaoRef | null) {
    const p = this.p;
    if (this.isoladaRefs.length) {
      const b = p.build();
      for (const x of this.isoladaRefs) b.delete(x);
      await b.commit();
      this.isoladaRefs = [];
    }
    if (!r) {
      this.visibilidadeBase(true);
      this.enquadrar();
      return;
    }
    const cell = p.state.data.cells.get(this.raiz(r.estrutura));
    if (!cell) return;
    const comp = await p.builders.structure.tryCreateComponentFromExpression(cell, expressaoRegiao(r), `isolada-${Date.now()}`, { label: "Região isolada" });
    if (!comp) return;
    const tipo = this.rep === "cartoon" ? "cartoon" : this.rep === "superficie" ? "molecular-surface" : this.rep === "esferas" ? "spacefill" : "ball-and-stick";
    const c = this.carregadas[r.estrutura];
    await p.builders.structure.representation.addRepresentation(comp, {
      type: tipo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      color: (c.cor !== undefined ? "uniform" : COR_TEMA[this.cor]) as any,
      colorParams: c.cor !== undefined ? { value: Color(c.cor) } : this.cor === "residuo" ? { colors: { name: "custom", params: coresDasBases() } } : undefined,
    });
    this.isoladaRefs.push(comp.ref);
    this.visibilidadeBase(false);
    this.focarRegiao(r);
  }

  // ------------------------------------------------------------ medir

  private lociDoAtomo(a: AtomoInfo) {
    return this.loci(a.estrutura, expressaoAtomo(a.cadeia, a.numero, a.insercao, a.atomo));
  }

  /** Desenha a medida no 3D (2 átomos = distância, 3 = ângulo, 4 = diedro). O valor exibido é calculado à parte. */
  async desenharMedida(atomos: AtomoInfo[]) {
    const l = atomos.map((a) => this.lociDoAtomo(a));
    if (l.some((x) => !x)) return;
    const m = this.p.managers.structure.measurement;
    const [a, b, c, d] = l as StructureElement.Loci[];
    const r = atomos.length === 2 ? await m.addDistance(a, b) : atomos.length === 3 ? await m.addAngle(a, b, c) : atomos.length === 4 ? await m.addDihedral(a, b, c, d) : null;
    if (r?.selection) this.medidas.push(r.selection.ref);
  }

  async limparMedidas() {
    if (!this.medidas.length) return;
    const b = this.p.build();
    for (const r of this.medidas) b.delete(r);
    await b.commit();
    this.medidas = [];
  }

  marcar(atomos: AtomoInfo[]) {
    const s = this.p.managers.interactivity.lociSelects;
    s.deselectAll();
    for (const a of atomos) {
      const l = this.lociDoAtomo(a);
      if (l) s.select({ loci: l });
    }
  }

  // ------------------------------------------------------------ superposição

  /** Aplica uma matriz 4×4 (colunas) à estrutura i, mantendo a representação. */
  async transformar(i: number, matriz: number[]) {
    const p = this.p;
    const c = this.carregadas[i];
    const params = { transform: { name: "matrix" as const, params: { data: Mat4.fromArray(Mat4(), matriz, 0), transpose: false } } };
    if (c.transformRef) await p.build().to(c.transformRef).update(params).commit();
    else {
      const sel = await p.build().to(c.estruturaRef).insert(StateTransforms.Model.TransformStructureConformation, params).commit();
      c.transformRef = sel.ref;
    }
    await this.montar(i);
  }

  // ------------------------------------------------------------ eventos

  private info(loci: Loci): AtomoInfo | null {
    if (!StructureElement.Loci.is(loci) || StructureElement.Loci.isEmpty(loci)) return null;
    const estrutura = this.carregadas.findIndex((_, i) => {
      const st = this.estrutura(i);
      return st && (st === loci.structure || st.root === loci.structure.root);
    });
    if (estrutura < 0) return null;
    const l = StructureElement.Loci.getFirstLocation(loci);
    if (!l) return null;
    const tipoEntidade = SP.entity.type(l);
    const subtipo = SP.entity.subtype(l);
    const tipo: AtomoInfo["tipo"] =
      tipoEntidade === "water" ? "agua" : tipoEntidade === "polymer" ? (/peptide/i.test(subtipo) ? "proteina" : /nucleotide/i.test(subtipo) ? "acido-nucleico" : "outro") : "ligante";
    return {
      estrutura,
      cadeia: SP.chain.auth_asym_id(l),
      numero: SP.residue.auth_seq_id(l),
      insercao: SP.residue.pdbx_PDB_ins_code(l) || "",
      residuo: SP.atom.auth_comp_id(l),
      atomo: SP.atom.auth_atom_id(l),
      elemento: SP.atom.type_symbol(l),
      x: SP.atom.x(l),
      y: SP.atom.y(l),
      z: SP.atom.z(l),
      b: SP.atom.B_iso_or_equiv(l),
      tipo,
    };
  }

  /** Informações de um átomo pelo nome — com as coordenadas ATUAIS (já transformadas, se houver superposição). */
  atomo(i: number, cadeia: string, numero: number, insercao: string, atomo: string): AtomoInfo | null {
    const l = this.loci(i, expressaoAtomo(cadeia, numero, insercao, atomo));
    return l ? this.info(l) : null;
  }

  aoClicar(cb: (a: AtomoInfo | null) => void) {
    const s = this.p.behaviors.interaction.click.subscribe(({ current }) => cb(this.info(current.loci)));
    return () => s.unsubscribe();
  }

  aoPassar(cb: (a: AtomoInfo | null) => void) {
    const s = this.p.behaviors.interaction.hover.subscribe(({ current }) => cb(this.info(current.loci)));
    return () => s.unsubscribe();
  }

  /** Granularidade do clique: o átomo (para medir) ou o resíduo inteiro (para explorar). */
  granularidade(g: "element" | "residue") {
    this.p.managers.interactivity.setProps({ granularity: g });
  }

  // ------------------------------------------------------------ rótulos na tela e imagem

  private tmp = Vec4();
  /**
   * Posição na tela (px do elemento) de um ponto 3D; null quando está atrás da câmera ou fora do
   * quadro. Não usamos a profundidade relativa aos planos de corte: ao focar um resíduo, o Mol*
   * aproxima esses planos e a conta descartaria pontos que continuam visíveis.
   */
  projetar(x: number, y: number, z: number): { x: number; y: number } | null {
    const c3 = this.p.canvas3d;
    const el = this.p.canvas3d?.webgl.gl.canvas as HTMLCanvasElement | undefined;
    if (!c3 || !el) return null;
    const vp = c3.camera.viewport;
    c3.camera.project(this.tmp, Vec3.create(x, y, z));
    if (!(this.tmp[3] > 0)) return null; // 1/w ≤ 0: atrás da câmera
    const k = el.clientWidth / Math.max(vp.width, 1);
    const px = (this.tmp[0] - vp.x) * k;
    const py = (vp.height - (this.tmp[1] - vp.y)) * k;
    if (px < 0 || py < 0 || px > el.clientWidth || py > el.clientHeight) return null;
    return { x: px, y: py };
  }

  aoDesenhar(cb: () => void) {
    const s = this.p.canvas3d?.didDraw.subscribe(cb);
    return () => s?.unsubscribe();
  }

  async imagem(): Promise<string> {
    const h = this.p.helpers.viewportScreenshot;
    if (!h) throw new Error("Captura indisponível.");
    return h.getImageDataUri();
  }
}
