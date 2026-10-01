import { cx } from "@/lib/cx";

interface SectionProps {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** Sección del recorrido con encabezado consistente y ancla para la navegación. */
export function Section({ id, eyebrow, title, description, children, className }: SectionProps) {
  const headingId = `${id}-titulo`;
  return (
    <section id={id} aria-labelledby={headingId} className={cx("scroll-mt-24 py-10 sm:py-14", className)}>
      <header className="mb-6 max-w-2xl sm:mb-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-terracotta-600 dark:text-terracotta-300">
          {eyebrow}
        </p>
        <h2 id={headingId} className="mt-2 font-display text-3xl font-semibold leading-tight text-ink text-balance sm:text-4xl">
          {title}
        </h2>
        {description ? <p className="mt-3 text-base leading-relaxed text-ink-soft text-pretty sm:text-lg">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
