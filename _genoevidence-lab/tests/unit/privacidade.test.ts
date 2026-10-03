import { describe, expect, it } from "vitest";
import { mesMaisAntigo } from "@/lib/audit";

describe("retenção do registro de segurança", () => {
  it("guarda os últimos 12 meses, incluindo o atual", () => {
    expect(mesMaisAntigo(new Date("2026-10-03T00:00:00Z"))).toBe("2025-11");
    expect(mesMaisAntigo(new Date("2026-01-15T00:00:00Z"))).toBe("2025-02");
  });
  it("aceita outro prazo", () => {
    expect(mesMaisAntigo(new Date("2026-10-03T00:00:00Z"), 1)).toBe("2026-10");
  });
});
