import type { MaterialView } from "@/lib/content/view-models";
import { MaterialIcon } from "@/components/illustrations/MaterialIcon";
import { cx } from "@/lib/cx";

/** "Tu kit": imprescindibles para empezar y extras para el amigurumi. */
export function MaterialsKit({ materials }: { materials: MaterialView[] }) {
  const groups = [
    { title: "Para empezar hoy", items: materials.filter((m) => m.essential), essential: true },
    { title: "Cuando llegues al amigurumi", items: materials.filter((m) => !m.essential), essential: false },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-soft">{group.title}</h3>
          <ul className="grid gap-2.5">
            {group.items.map((material) => (
              <li key={material.id} className="flex items-start gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-line">
                <span
                  className={cx(
                    "grid size-11 shrink-0 place-items-center rounded-xl",
                    group.essential
                      ? "bg-terracotta-100 text-terracotta-600 dark:bg-terracotta-500/20 dark:text-terracotta-200"
                      : "bg-sage-100 text-sage-700 dark:bg-sage-500/20 dark:text-sage-200",
                  )}
                >
                  <MaterialIcon icon={material.icon} className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-ink">{material.name}</span>
                  <span className="block text-sm leading-snug text-ink-soft">{material.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
