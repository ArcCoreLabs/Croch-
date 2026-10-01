/**
 * Utilidades puras para trabajar con datos de trazado SVG (`d`).
 * No dependen del DOM: se usan tanto en el compilador de contenido (build)
 * como en los tests.
 */

const COMMAND_RE = /[MmLlHhVvCcSsQqTtAaZz]/g;
const NUMBER_RE = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const VALID_PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]+$/;

/** Redondea a 2 decimales para generar trazados compactos y estables. */
export function fmt(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/** Comprueba que el texto solo contiene comandos y números de trazado SVG. */
export function isValidPathData(d: string): boolean {
  return d.trim().length > 0 && VALID_PATH_RE.test(d) && /^[\s]*[Mm]/.test(d);
}

/**
 * Firma estructural de un trazado: secuencia de comandos + cantidad de números.
 * Dos trazados solo pueden interpolarse (morphing) si su firma coincide.
 */
export function pathSignature(d: string): string {
  const commands = (d.match(COMMAND_RE) ?? []).join("");
  const numbers = d.match(NUMBER_RE)?.length ?? 0;
  return `${commands}#${numbers}`;
}

export function areMorphCompatible(paths: readonly string[]): boolean {
  if (paths.length < 2) return true;
  const first = pathSignature(paths[0]);
  return paths.every((p) => pathSignature(p) === first);
}
