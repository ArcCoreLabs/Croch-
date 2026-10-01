import { z } from "zod";
import { crochetDataSchema, type CrochetData } from "./schema";
import { validateContentReferences } from "./validate";

export class ContentValidationError extends Error {
  override name = "ContentValidationError";
}

/**
 * Valida el JSON de contenido (forma + referencias) y lo devuelve tipado.
 * Lanza un error legible si algo está mal: el build se detiene con un
 * mensaje que señala la ruta exacta del problema.
 */
export function parseContent(raw: unknown): CrochetData {
  const result = crochetDataSchema.safeParse(raw);
  if (!result.success) {
    throw new ContentValidationError(
      `crochet-data.json no cumple el esquema:\n${z.prettifyError(result.error)}`,
    );
  }
  const issues = validateContentReferences(result.data);
  if (issues.length > 0) {
    const list = issues.map((issue) => `  ✖ ${issue.path}: ${issue.message}`).join("\n");
    throw new ContentValidationError(`crochet-data.json tiene ${issues.length} problema(s):\n${list}`);
  }
  return result.data;
}
