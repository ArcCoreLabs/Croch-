import { cx } from "@/lib/cx";

/**
 * Ovillo con aguja, dibujado 100 % con código. `YARN_BALL_SVG` se reutiliza
 * como favicon (data URI), así la app no depende de ningún archivo de imagen.
 */
const BALL_PATHS = [
  "M 9 22 C 13 13, 23 9, 30 12",
  "M 8 28 C 15 17, 28 13, 35 19",
  "M 11 34 C 18 23, 31 20, 37 27",
  "M 17 38 C 22 30, 31 28, 36 33",
];

export function YarnBallMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cx("shrink-0", className)} aria-hidden="true">
      <circle cx="23" cy="25" r="17" fill="#c8664a" />
      <circle cx="23" cy="25" r="17" fill="none" stroke="#84402f" strokeWidth="1.5" />
      {BALL_PATHS.map((d) => (
        <path key={d} d={d} fill="none" stroke="#f1c3ae" strokeWidth="1.8" strokeLinecap="round" />
      ))}
      <path d="M 36 35 C 40 39, 43 41, 46 40" fill="none" stroke="#c8664a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 30 6 L 44 2" stroke="#3a2e28" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M 30 6 C 28 7, 28 10, 30.5 10" fill="none" stroke="#3a2e28" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export const YARN_BALL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="23" cy="25" r="17" fill="#c8664a" stroke="#84402f" stroke-width="1.5"/>${BALL_PATHS.map(
  (d) => `<path d="${d}" fill="none" stroke="#f1c3ae" stroke-width="2" stroke-linecap="round"/>`,
).join("")}<path d="M 30 6 L 44 2" stroke="#3a2e28" stroke-width="3.2" stroke-linecap="round"/></svg>`;

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <YarnBallMark className="size-9" />
      <span className="font-display text-2xl font-semibold tracking-tight text-ink">
        croché<span className="text-terracotta-500">!!</span>
      </span>
    </span>
  );
}
