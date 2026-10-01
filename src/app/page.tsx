import { notFound } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { FirstLesson } from "@/components/onboarding/FirstLesson";
import { GlossaryExplorer } from "@/components/onboarding/GlossaryExplorer";
import { Hero } from "@/components/onboarding/Hero";
import { HookAnatomy } from "@/components/onboarding/HookAnatomy";
import { LearningPath } from "@/components/onboarding/LearningPath";
import { MaterialsKit } from "@/components/onboarding/MaterialsKit";
import { SectionNav, type SectionLink } from "@/components/onboarding/SectionNav";
import { YarnWeightGuide } from "@/components/onboarding/YarnWeightGuide";
import {
  getGlossary,
  getHookGuide,
  getLearningPath,
  getMaterials,
  getTechniqueLesson,
  getYarnWeights,
} from "@/lib/content";

/** Técnica que se enseña en el Onboarding. */
const FIRST_TECHNIQUE = "cadeneta";
const LESSON_ANCHOR = "primera-puntada";

const SECTIONS: SectionLink[] = [
  { id: "ruta", label: "Tu ruta" },
  { id: "aguja", label: "La aguja" },
  { id: "hilo", label: "El hilo" },
  { id: "kit", label: "Tu kit" },
  { id: LESSON_ANCHOR, label: "Primera puntada" },
  { id: "vocabulario", label: "Vocabulario" },
];

/**
 * Onboarding: todo lo que necesita alguien que nunca ha tocado una aguja,
 * en una sola página fluida (navegación interna sin recargas).
 */
export default function OnboardingPage() {
  const levels = getLearningPath();
  const lesson = getTechniqueLesson(FIRST_TECHNIQUE);
  if (!lesson) notFound();

  const stats = {
    levels: levels.length,
    techniques: levels.reduce((sum, level) => sum + level.techniques.length, 0),
    lessonSteps: lesson.steps.length,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <Hero levels={levels} stats={stats} />
      <SectionNav sections={SECTIONS} />

      <Section
        id="ruta"
        eyebrow="Paso 1 · Tu ruta"
        title="De 0 a 100, nivel a nivel"
        description="Cinco niveles que te llevan de no haber tocado nunca una aguja a diseñar tus propios amigurumis. Cada técnica que domines suma puntos."
      >
        <LearningPath levels={levels} lessonAnchors={{ [FIRST_TECHNIQUE]: `#${LESSON_ANCHOR}` }} />
      </Section>

      <Section
        id="aguja"
        eyebrow="Paso 2 · Herramientas"
        title="Conoce tu aguja"
        description="Toca cada parte para ver para qué sirve y cambia de tipo de aguja para comparar cabezas y mangos."
      >
        <HookAnatomy guide={getHookGuide()} />
      </Section>

      <Section
        id="hilo"
        eyebrow="Paso 3 · Materiales"
        title="El grosor del hilo"
        description="El sistema estándar numera los hilos del 0 (encaje) al 7 (jumbo). Cada grosor pide un tamaño de aguja; en amigurumi se usa una más fina para que el tejido quede compacto."
      >
        <YarnWeightGuide weights={getYarnWeights()} />
      </Section>

      <Section
        id="kit"
        eyebrow="Paso 4 · Preparación"
        title="Tu kit para empezar"
        description="No necesitas mucho: con una aguja, un ovillo y unas tijeras ya puedes practicar hoy."
      >
        <MaterialsKit materials={getMaterials()} />
      </Section>

      <Section
        id={LESSON_ANCHOR}
        eyebrow="Paso 5 · Primera lección"
        title={`Tu primera puntada: la ${lesson.technique.name.toLowerCase()}`}
        description="Reproduce cada micro-movimiento, páusalo o arrastra el control para avanzar la hebra a tu ritmo. Teclado: espacio para reproducir y flechas para cambiar de paso."
      >
        <FirstLesson lesson={lesson} />
      </Section>

      <Section
        id="vocabulario"
        eyebrow="Paso 6 · Leer patrones"
        title="Habla croché"
        description="Los patrones usan abreviaturas. Cambia de sistema para ver cómo se escriben en español y en inglés."
      >
        <GlossaryExplorer terms={getGlossary()} />
      </Section>
    </div>
  );
}
