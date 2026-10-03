@AGENTS.md

# croché!! — notas del proyecto

- App para aprender croché/amigurumi. Next.js 16 (App Router, `output: "export"`), React 19, Tailwind 4, Framer Motion 13, Lucide, Zod 4, Vitest.
- **Sin archivos visuales externos**: todo gráfico se genera en código (SVG; el hilo 3D, con WebGL). No añadas imágenes a `public/`.
- **Contenido** en `src/data/crochet-data.json`; esquema en `src/lib/content/schema.ts` (tras cambiarlo: `npm run content:schema`). Guía: `docs/DATA_SCHEMA.md`.
- `src/lib/content/index.ts` es `server-only`: los componentes cliente reciben datos ya compilados por props.
- El reproductor (`src/components/player`) anima un único `MotionValue` de progreso 0–1; las capas derivan todo de él con `useTrack`.
- El hilo de cada lección es UNO solo (`scene.strands`, puntos 3D `[x, y, z]` de la cola al ovillo, `z` hacia quien mira). Nunca representes el hilo con piezas sueltas. Se pinta como tubo 3D con WebGL2 (`src/lib/yarn`, `YarnCanvas.tsx`): la profundidad resuelve los cruces; la aguja sigue siendo SVG. Los tramos amarillos (`tone`) barren en el sentido del hilo.
- La geometría de la cadeneta sale de `scripts/authoring/` (`npx tsx scripts/authoring/cadeneta.ts`): rigs del nudo corredizo, la cadena y el tirón; el generador exige continuidad entre pasos.
- Verificación: `npm run check` y `npm run build`.
- Plan por fases: 1–3 hechas; Fase 4 = galería de amigurumis, navegación, `/tecnicas/[slug]`, checklist de requisitos.
