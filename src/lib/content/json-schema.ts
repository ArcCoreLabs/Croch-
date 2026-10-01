import { z } from "zod";
import { crochetDataSchema } from "./schema";

/** Serializa el esquema Zod como JSON Schema (draft-07, compatible con VS Code). */
export function buildContentJsonSchema(): string {
  const schema = z.toJSONSchema(crochetDataSchema, {
    target: "draft-7",
    io: "input",
    unrepresentable: "any",
    reused: "ref",
  });
  const document = {
    ...schema,
    title: "croché!! · contenido",
    description: "Contenido de la app: niveles, técnicas, herramientas, glosario, proyectos y escenas SVG del reproductor.",
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}
