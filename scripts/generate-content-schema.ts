/**
 * Genera `src/data/crochet-data.schema.json` a partir del esquema Zod.
 * El JSON de contenido lo referencia con `"$schema"`, así VS Code (y otros
 * editores) ofrecen autocompletado y validación mientras escribes pasos.
 *
 * Uso: npm run content:schema
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildContentJsonSchema } from "../src/lib/content/json-schema";

const target = fileURLToPath(new URL("../src/data/crochet-data.schema.json", import.meta.url));
writeFileSync(target, buildContentJsonSchema());
console.log(`✓ Esquema escrito en ${target}`);
