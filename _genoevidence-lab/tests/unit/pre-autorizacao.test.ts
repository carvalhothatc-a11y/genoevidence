import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { applyBootstrap, registerAccount, saveAccount } from "@/lib/auth/store";

let dir = "";
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "genolab-pre-"));
  process.env.LAB_DATA_DIR = dir;
  process.env.GENO_LAB_ADMIN_EMAILS = "admin@exemplo.test";
  process.env.LAB_EMAILS_AUTORIZADOS = "patrícia.alves@exemplo.test, outra@exemplo.test";
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("pré-autorização por e-mail", () => {
  it("conta com e-mail da lista nasce autorizada como pesquisador (com ou sem acento)", async () => {
    const r = await registerAccount({ name: "Patrícia", email: "Patricia.Alves@exemplo.test", password: "senha-de-teste-123", privacyVersion: "2026-10-03" });
    expect(r.account).toMatchObject({ status: "autorizado", role: "pesquisador", statusChangedBy: "pre-autorizacao" });
  });
  it("e-mail fora da lista continua pendente", async () => {
    const r = await registerAccount({ name: "Alguém", email: "alguem@exemplo.test", password: "senha-de-teste-123", privacyVersion: "2026-10-03" });
    expect(r.account?.status).toBe("pendente");
  });
  it("conta pendente anterior é liberada ao entrar; suspensa não é reativada", async () => {
    process.env.LAB_EMAILS_AUTORIZADOS = "";
    const r = await registerAccount({ name: "Outra", email: "outra@exemplo.test", password: "senha-de-teste-123", privacyVersion: "2026-10-03" });
    expect(r.account?.status).toBe("pendente");
    process.env.LAB_EMAILS_AUTORIZADOS = "outra@exemplo.test";
    expect((await applyBootstrap(r.account!)).status).toBe("autorizado");
    await saveAccount({ ...r.account!, status: "suspenso" });
    expect((await applyBootstrap({ ...r.account!, status: "suspenso" })).status).toBe("suspenso");
  });
});
