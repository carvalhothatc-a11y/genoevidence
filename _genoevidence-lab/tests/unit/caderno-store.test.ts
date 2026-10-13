import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MAX_VERSOES } from "@/lib/caderno/tipos";

// O armazenamento resolve a pasta a cada chamada, então basta apontar LAB_DATA_DIR antes de importar.
let dir = "";
let store: typeof import("@/lib/caderno/store");

const ANA = "u_aaaaaaaaaaaa";
const BRUNO = "u_bbbbbbbbbbbb";

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "caderno-"));
  process.env.LAB_DATA_DIR = dir;
  store = await import("@/lib/caderno/store");
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("caderno: guardar e reler", () => {
  it("cria um registro sem projeto nenhum", async () => {
    const r = await store.criarRegistro(ANA, { dia: "2026-10-09", texto: "Repeti a PCR do TP53." });
    expect(r.projetoId).toBeUndefined();
    expect(r.versoes).toEqual([]);
    expect(await store.lerRegistro(ANA, r.id)).toMatchObject({ texto: "Repeti a PCR do TP53." });
  });

  it("lista do dia mais recente para o mais antigo", async () => {
    await store.criarRegistro(ANA, { dia: "2026-10-01", texto: "primeiro dia" });
    await store.criarRegistro(ANA, { dia: "2026-10-20", texto: "último dia" });
    const dias = (await store.listarRegistros(ANA)).map((r) => r.dia);
    expect(dias).toEqual([...dias].sort().reverse());
    expect(dias[0]).toBe("2026-10-20");
  });
});

describe("caderno: nada é reescrito em silêncio", () => {
  it("editar guarda a versão anterior", async () => {
    const r = await store.criarRegistro(ANA, { dia: "2026-10-10", texto: "versão original" });
    const e = await store.editarRegistro(ANA, r.id, { dia: "2026-10-10", texto: "versão corrigida" });
    expect(e!.texto).toBe("versão corrigida");
    expect(e!.versoes).toHaveLength(1);
    expect(e!.versoes[0].texto).toBe("versão original");
  });

  it("salvar sem mudar nada não cria versão falsa", async () => {
    const r = await store.criarRegistro(ANA, { dia: "2026-10-11", texto: "igual" });
    const e = await store.editarRegistro(ANA, r.id, { dia: "2026-10-11", texto: "igual" });
    expect(e!.versoes).toHaveLength(0);
  });

  it("mudar só o dia também fica registrado", async () => {
    const r = await store.criarRegistro(ANA, { dia: "2026-10-12", texto: "mesmo texto" });
    const e = await store.editarRegistro(ANA, r.id, { dia: "2026-10-13", texto: "mesmo texto" });
    expect(e!.versoes[0].dia).toBe("2026-10-12");
  });

  it("acima do limite, a versão ORIGINAL nunca é descartada", async () => {
    const r = await store.criarRegistro(ANA, { dia: "2026-10-14", texto: "texto 0" });
    for (let i = 1; i <= MAX_VERSOES + 5; i++) await store.editarRegistro(ANA, r.id, { dia: "2026-10-14", texto: `texto ${i}` });
    const fim = await store.lerRegistro(ANA, r.id);
    expect(fim!.versoes.length).toBeLessThanOrEqual(MAX_VERSOES);
    expect(fim!.versoes[0].texto).toBe("texto 0");
    expect(fim!.texto).toBe(`texto ${MAX_VERSOES + 5}`);
  });
});

describe("caderno: um caderno não enxerga o outro", () => {
  it("o registro de uma pessoa não existe para a outra", async () => {
    const r = await store.criarRegistro(ANA, { dia: "2026-10-15", texto: "anotação particular" });
    expect(await store.lerRegistro(BRUNO, r.id)).toBeNull();
    expect(await store.editarRegistro(BRUNO, r.id, { dia: "2026-10-15", texto: "invadido" })).toBeNull();
    expect(await store.excluirRegistro(BRUNO, r.id)).toBe(false);
    // e continua intacto para a dona
    expect((await store.lerRegistro(ANA, r.id))!.texto).toBe("anotação particular");
  });

  it("identificador de usuário fora do formato é recusado, não vira caminho", async () => {
    await expect(store.listarRegistros("../../etc")).rejects.toThrow();
  });

  it("identificador de registro fora do formato não lê nada", async () => {
    expect(await store.lerRegistro(ANA, "../../../etc/passwd")).toBeNull();
  });
});

describe("caderno: arquivos do dia", () => {
  it("anexa, lê de volta e remove", async () => {
    const r = await store.criarRegistro(ANA, { dia: "2026-10-16", texto: "com foto" });
    const bytes = new TextEncoder().encode("conteudo-de-teste");
    const a = await store.anexarArquivo(ANA, r.id, { nome: "gel.png", mime: "image/png", bytes });
    expect(a!.arquivo.tamanho).toBe(bytes.byteLength);
    const lido = await store.lerAnexo(ANA, r.id, a!.arquivo.id);
    expect(new TextDecoder().decode(lido!.bytes)).toBe("conteudo-de-teste");
    // de outra conta, não existe
    expect(await store.lerAnexo(BRUNO, r.id, a!.arquivo.id)).toBeNull();
    const depois = await store.removerAnexo(ANA, r.id, a!.arquivo.id);
    expect(depois!.arquivos).toHaveLength(0);
  });

  it("nome de arquivo com caminho não vira caminho", async () => {
    const r = await store.criarRegistro(ANA, { dia: "2026-10-17", texto: "nome estranho" });
    const a = await store.anexarArquivo(ANA, r.id, { nome: "../../etc/passwd", mime: "text/plain", bytes: new Uint8Array([1]) });
    // O nome é só rótulo exibido: sem separador e sem começar por ponto (arquivo oculto).
    expect(a!.arquivo.nome).not.toMatch(/[/\\]/);
    expect(a!.arquivo.nome.startsWith(".")).toBe(false);
    // A garantia de verdade: no disco o arquivo é o id aleatório, nunca o nome enviado.
    expect(a!.arquivo.id).toMatch(/^a_[A-Za-z0-9_-]{8,64}$/);
    expect(await store.lerAnexo(ANA, r.id, a!.arquivo.nome)).toBeNull();
  });

  it("excluir o dia leva os arquivos junto", async () => {
    const r = await store.criarRegistro(ANA, { dia: "2026-10-18", texto: "some tudo" });
    const a = await store.anexarArquivo(ANA, r.id, { nome: "tabela.csv", mime: "text/csv", bytes: new Uint8Array([65, 66]) });
    expect(await store.excluirRegistro(ANA, r.id)).toBe(true);
    expect(await store.lerAnexo(ANA, r.id, a!.arquivo.id)).toBeNull();
  });

  it("apagar o caderno da conta não deixa registro para trás", async () => {
    await store.criarRegistro(BRUNO, { dia: "2026-10-19", texto: "do Bruno" });
    expect((await store.listarRegistros(BRUNO)).length).toBeGreaterThan(0);
    await store.apagarCadernoDaConta(BRUNO);
    expect(await store.listarRegistros(BRUNO)).toEqual([]);
    // o caderno da Ana continua lá
    expect((await store.listarRegistros(ANA)).length).toBeGreaterThan(0);
  });
});
