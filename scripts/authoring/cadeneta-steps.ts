/**
 * Guion de la lección: pasos, textos, fotogramas del esqueleto, tramos
 * activos y etiquetas.
 */
import { restState, REST_POSE } from "./cadeneta-rig";
import { chainPullState, chainSettleState, chainYOState } from "./chain-rig";
import type { StepDef, ToneDef } from "./cadeneta";
import { curlState, M_X, ringOnHookState, slipPullState, slipSettleState, WAIT_POSE } from "./slipknot-rig";
import { M_TAIL } from "./cadeneta-rig";

const TAIL_TIP = curlState(0.03).waypoints[0].p;

export const VIEWBOX: [number, number, number, number] = [40, 16, 230, 184];

export const STEPS: StepDef[] = [
  {
    id: "cola",
    phase: "hold",
    title: "Deja una cola",
    instruction:
      "Toma el hilo y deja libre unos 15 cm desde la punta. Esa punta (la cola) es la que vas a mover para hacer el nudo; el otro extremo va al ovillo.",
    tip: "Una cola larga se puede esconder al final; una corta se escapa.",
    durationMs: 4200,
    keys: [
      { at: 0, state: curlState(0) },
      { at: 1, state: curlState(0.03) },
    ],
    tone: [{ from: 0, to: M_TAIL - 4, feather: 2, value: [[0, 0], [0.25, 1, "easeOut"]] }],
    callouts: [
      { id: "punta", text: "Punta libre (cola)", at: [TAIL_TIP[0] + 7, TAIL_TIP[1]], placement: "right", tone: "warning", show: { from: 0.2 } },
      { id: "ovillo", text: "Hacia el ovillo", at: [74, 30], placement: "right", show: { from: 0.45 } },
    ],
  },
  {
    id: "aro",
    phase: "hold",
    title: "Forma un aro con la cola",
    instruction:
      "Lleva la cola hacia arriba y dale la vuelta hasta cerrar un aro. Al cerrarlo, la cola pasa POR ENCIMA del hilo que va al ovillo.",
    durationMs: 6200,
    keys: [
      { at: 0, state: curlState(0.03) },
      { at: 0.28, state: curlState(0.28), ease: "easeIn" },
      { at: 0.5, state: curlState(0.52), ease: "linear" },
      { at: 0.72, state: curlState(0.78), ease: "linear" },
      { at: 0.92, state: curlState(1), ease: "easeOut" },
    ],
    tone: [
      { from: 0, to: M_TAIL - 4, feather: 2, value: [[0, 1], [0.3, 0, "easeInOut"]] },
      { from: M_TAIL - 4, to: M_X + 4, feather: 2, value: [[0, 0], [0.18, 1, "easeOut"]] },
    ],
    callouts: [{ id: "encima", text: "La cola cruza POR ENCIMA", at: [168, 86], placement: "right", tone: "warning", show: { from: 0.86 } }],
  },
  {
    id: "meter-aguja",
    phase: "insert",
    title: "Mete la aguja en el aro",
    instruction: "Gira un poco el aro para verlo de canto y mete la aguja por dentro, de derecha a izquierda.",
    durationMs: 5600,
    keys: [
      { at: 0, state: ringOnHookState(0, WAIT_POSE) },
      { at: 0.32, state: ringOnHookState(0.6, { tx: 80, ty: 0, rot: 0 }), ease: "easeInOut" },
      { at: 0.46, state: ringOnHookState(1, { tx: 60, ty: 0, rot: 0 }), ease: "easeIn" },
      { at: 0.74, state: ringOnHookState(1, { tx: 18, ty: 0, rot: 0 }), ease: "linear" },
      { at: 0.95, state: ringOnHookState(1, REST_POSE), ease: "easeOut" },
    ],
    tone: [{ from: M_TAIL - 4, to: M_X + 4, feather: 2, value: 1 }],
    callouts: [{ id: "dentro", text: "La aguja pasa por dentro del aro", at: [172, 84], placement: "right", show: { from: 0.7 } }],
  },
  {
    id: "lazada-nudo",
    phase: "yarn-over",
    title: "Lazada: engancha el hilo",
    instruction:
      "Con el hilo que va al ovillo, pasa por encima de la aguja de atrás hacia delante y déjalo caer en la garganta.",
    durationMs: 5200,
    keys: [
      { at: 0, state: ringOnHookState(1, REST_POSE, 0) },
      { at: 0.3, state: ringOnHookState(1, REST_POSE, 0.4), ease: "easeInOut" },
      { at: 0.5, state: ringOnHookState(1, REST_POSE, 0.6), ease: "linear" },
      { at: 0.7, state: ringOnHookState(1, REST_POSE, 0.8), ease: "linear" },
      { at: 0.9, state: ringOnHookState(1, REST_POSE, 1), ease: "easeOut" },
    ],
    tone: [
      { from: M_TAIL - 4, to: M_X + 4, feather: 2, value: [[0, 1], [0.25, 0, "easeInOut"]] },
      { fromTag: "seat", toTag: "wrap-end", pad: [16, 10], feather: 2.5, value: [[0, 0], [0.2, 1, "easeOut"]] },
    ],
    callouts: [{ id: "garganta", text: "Queda en la garganta", at: [104, 50], placement: "top", tone: "success", show: { from: 0.85 } }],
  },
  {
    id: "sacar-nudo",
    phase: "pull-through",
    title: "Saca la lazada por el aro",
    instruction:
      "Lleva la aguja hacia atrás: la garganta arrastra la lazada a través del aro. El aro resbala por la punta y se cierra debajo, abrazando la lazada, que ya es un bucle en la aguja.",
    durationMs: 6400,
    keys: [
      { at: 0, state: slipPullState(0) },
      { at: 0.18, state: slipPullState(16), ease: "easeIn" },
      { at: 0.34, state: slipPullState(30), ease: "linear" },
      { at: 0.5, state: slipPullState(44), ease: "linear" },
      { at: 0.66, state: slipPullState(58), ease: "linear" },
      { at: 0.76, state: slipPullState(64), ease: "easeOut" },
      { at: 0.88, state: slipPullState(64, 0.5), ease: "easeInOut" },
      { at: 1, state: slipPullState(64, 1), ease: "easeOut" },
    ],
    tone: [{ fromTag: "seat", toTag: "wrap-end", pad: [16, 10], feather: 2.5, value: 1 }],
    callouts: [{ id: "resbala", text: "El aro resbala por la punta", at: [172, 92], placement: "right", show: { from: 0.55, to: 0.9 } }],
  },
  {
    id: "ajustar",
    phase: "hold",
    title: "Ajusta el nudo corredizo",
    instruction:
      "Empuja la aguja hacia delante para que el bucle pase de la garganta al cuerpo y tira con suavidad de la cola: el aro queda cerrado en un nudo, sin apretar el bucle.",
    tip: "El bucle debe deslizarse por la aguja: si no se mueve, está demasiado apretado.",
    durationMs: 6200,
    keys: [
      { at: 0, state: slipSettleState(0) },
      { at: 0.35, state: slipSettleState(0.35), ease: "easeInOut" },
      { at: 0.7, state: slipSettleState(0.7), ease: "linear" },
      { at: 0.95, state: slipSettleState(1), ease: "easeOut" },
    ],
    tone: [
      { fromTag: "loop", toTag: "loop", pad: [24, 64], feather: 2.5, value: [[0, 1], [0.5, 0, "easeInOut"]] },
      { from: M_TAIL - 4, to: M_X + 4, feather: 2, value: [[0.25, 0], [0.55, 1, "easeOut"], [0.82, 1], [1, 0, "easeIn"]] },
    ],
    callouts: [{ id: "nudo", text: "¡Nudo corredizo!", at: [168, 104], placement: "right", tone: "success", show: { from: 0.78 } }],
  },
  ...chainStitch(0),
  ...chainStitch(1),
  {
    id: "contar",
    phase: "hold",
    title: "Cuenta tus cadenetas",
    instruction:
      "Cada «V» de la cadena es una cadeneta. El bucle que está en la aguja y el nudo del principio no se cuentan.",
    tip: "Cuenta siempre de abajo hacia arriba, empezando justo encima del nudo.",
    durationMs: 5600,
    keys: [{ at: 0, state: restState(2) }],
    tone: [
      { fromTag: "link-1", toTag: "link-2", feather: 2, value: [[0, 1], [0.12, 0, "easeIn"], [0.42, 0], [0.5, 1, "easeOut"]] },
      { fromTag: "link-0", toTag: "link-1", feather: 2, value: [[0.12, 0], [0.2, 1, "easeOut"]] },
    ],
    callouts: [
      { id: "uno", text: "1", at: [164, 120], placement: "right", tone: "success", show: { from: 0.15 } },
      { id: "dos", text: "2", at: [164, 96], placement: "right", tone: "success", show: { from: 0.4 } },
      { id: "bucle", text: "En la aguja: no se cuenta", at: [168, 54], placement: "right", tone: "warning", show: { from: 0.62 } },
      { id: "nudo", text: "Nudo: no se cuenta", at: [164, 150], placement: "right", tone: "warning", show: { from: 0.78 } },
    ],
  },
];

/** Pasos de una cadeneta (lazada + tirar) partiendo de `n` cadenetas hechas. */
function chainStitch(n: number): StepDef[] {
  const ordinal = n === 0 ? "primera" : "segunda";
  return [
    {
      id: `lazada-${n + 1}`,
      phase: "yarn-over",
      title: n === 0 ? "Haz una lazada" : "Otra lazada",
      instruction:
        n === 0
          ? "Pasa el hilo del ovillo por encima de la aguja, de atrás hacia delante, y deja que la garganta lo atrape."
          : "Repite la lazada: hilo por encima de la aguja, de atrás hacia delante, hasta la garganta.",
      durationMs: n === 0 ? 4800 : 4000,
      keys: [
        { at: 0, state: chainYOState(n, 0) },
        { at: 0.3, state: chainYOState(n, 0.4), ease: "easeInOut" },
        { at: 0.5, state: chainYOState(n, 0.6), ease: "linear" },
        { at: 0.7, state: chainYOState(n, 0.8), ease: "linear" },
        { at: 0.9, state: chainYOState(n, 1), ease: "easeOut" },
      ],
      tone: [
        ...(n > 0 ? [{ fromTag: `link-${n - 1}`, toTag: `link-${n}`, feather: 2, value: [[0, 1], [0.25, 0, "easeInOut"]] } as ToneDef] : []),
        { fromTag: "seat", toTag: "wrap-end", pad: [16, 10], feather: 2.5, value: [[0, 0], [0.2, 1, "easeOut"]] },
      ],
      callouts:
        n === 0 ? [{ id: "garganta", text: "Lazada en la garganta", at: [104, 50], placement: "top", tone: "success", show: { from: 0.85 } }] : [],
    },
    {
      id: `tirar-${n + 1}`,
      phase: "pull-through",
      title: n === 0 ? "Tira a través del bucle" : "Tira otra vez",
      instruction:
        n === 0
          ? "Retrocede con la aguja: la lazada atraviesa el bucle que había en la aguja. Ese bucle resbala por la punta y se cierra debajo, abrazando la lazada: ¡tu primera cadeneta! Luego lleva el bucle nuevo al cuerpo de la aguja."
          : "La lazada atraviesa el bucle de la aguja, que se cierra debajo como una nueva «V». ¡Segunda cadeneta!",
      tip: n === 0 ? "No aprietes: el bucle nuevo debe quedar del mismo tamaño que el anterior." : undefined,
      durationMs: n === 0 ? 7600 : 6600,
      keys: [
        { at: 0, state: chainPullState(n, 0) },
        { at: 0.13, state: chainPullState(n, 16), ease: "easeIn" },
        { at: 0.24, state: chainPullState(n, 30), ease: "linear" },
        { at: 0.35, state: chainPullState(n, 44), ease: "linear" },
        { at: 0.46, state: chainPullState(n, 58), ease: "linear" },
        { at: 0.53, state: chainPullState(n, 64), ease: "easeOut" },
        { at: 0.62, state: chainPullState(n, 64, 0.5), ease: "easeInOut" },
        { at: 0.7, state: chainPullState(n, 64, 1), ease: "easeOut" },
        { at: 0.85, state: chainSettleState(n, 0.5), ease: "easeInOut" },
        { at: 0.97, state: chainSettleState(n, 1), ease: "easeOut" },
      ],
      tone: [
        { fromTag: "seat", toTag: "wrap-end", pad: [16, 10], feather: 2.5, value: [[0, 1], [0.62, 1], [0.8, 0, "easeInOut"]] },
        { fromTag: `link-${n}`, toTag: `link-${n + 1}`, feather: 2, value: [[0.6, 0], [0.75, 1, "easeOut"]] },
      ],
      callouts: [
        { id: "resbala", text: "El bucle viejo resbala por la punta", at: [172, 92], placement: "right", show: { from: 0.36, to: 0.6 } },
        { id: "nueva", text: `¡${ordinal[0].toUpperCase()}${ordinal.slice(1)} cadeneta!`, at: [164, 96], placement: "right", tone: "success", show: { from: 0.8 } },
      ],
    },
  ];
}
