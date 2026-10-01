import "server-only";

import rawContent from "@/data/crochet-data.json";
import { parseContent } from "./load";
import {
  selectGlossary,
  selectHookGuide,
  selectLearningPath,
  selectMaterials,
  selectTechniqueLesson,
  selectYarnWeights,
} from "./selectors";

/**
 * Punto de entrada del contenido (solo servidor / build).
 *
 * El JSON se valida una única vez al cargar el módulo. Los componentes de
 * servidor piden aquí los datos ya preparados y los pasan como props a los
 * componentes cliente, de modo que ni el JSON completo ni Zod viajan al
 * navegador.
 */
export const content = parseContent(rawContent);

export const getLearningPath = () => selectLearningPath(content);
export const getHookGuide = () => selectHookGuide(content);
export const getYarnWeights = () => selectYarnWeights(content);
export const getMaterials = () => selectMaterials(content);
export const getGlossary = () => selectGlossary(content);
export const getTechniqueLesson = (id: string) => selectTechniqueLesson(content, id);
