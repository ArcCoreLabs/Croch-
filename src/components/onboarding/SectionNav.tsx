"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

export interface SectionLink {
  id: string;
  label: string;
}

/**
 * Navegación interna del recorrido (sticky). Resalta la sección visible con
 * IntersectionObserver y se desplaza suavemente sin recargar la página.
 */
export function SectionNav({ sections }: { sections: SectionLink[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  // Mantiene visible el enlace activo dentro de la barra (solo scroll horizontal).
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>(`[data-section-link="${active}"]`);
    if (!list || !link) return;
    const left = link.offsetLeft - list.clientWidth / 2 + link.offsetWidth / 2;
    list.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label="Secciones del recorrido"
      className="sticky top-0 z-30 -mx-4 border-b border-line/70 bg-canvas/85 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6"
    >
      <ol
        ref={listRef}
        className="relative flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((section, index) => {
          const isActive = section.id === active;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                data-section-link={section.id}
                aria-current={isActive ? "location" : undefined}
                className={cx(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-colors",
                  isActive ? "bg-ink text-canvas" : "text-ink-soft hover:bg-surface-muted hover:text-ink",
                )}
              >
                <span className="font-mono text-[11px] opacity-60">{index + 1}</span>
                {section.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
