import { z } from "zod";

/**
 * Zod sem compilação JIT. No navegador, o Zod testa `Function("")` para decidir se compila
 * validadores; a CSP (sem 'unsafe-eval') bloqueia e reporta esse teste. Os módulos que rodam no
 * cliente importam `z` daqui para que a configuração valha antes de qualquer esquema.
 */
z.config({ jitless: true });

export { z };
