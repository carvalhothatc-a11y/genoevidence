import "server-only";
import path from "node:path";
import { LocalRepository } from "./local";
import type { Repository } from "./types";

let instance: Repository | null = null;

export function dataRoot(): string {
  return path.resolve(process.cwd(), process.env.LAB_DATA_DIR || ".lab-data");
}

/**
 * Seleciona o backend de persistência. Nesta versão somente o backend local está implementado;
 * não há esquema nem adaptador do Supabase.
 */
export function getRepository(): Repository {
  if (!instance) instance = new LocalRepository(dataRoot());
  return instance;
}

export type { Repository } from "./types";
