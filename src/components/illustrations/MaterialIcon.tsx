import { Bookmark, Cloud, Eye, Pin, Scissors, type LucideProps } from "lucide-react";
import type { MaterialView } from "@/lib/content/view-models";

/**
 * Iconos de materiales. Los genéricos vienen de Lucide; los propios del
 * croché (aguja, ovillo, aguja lanera) se dibujan aquí con el mismo trazo.
 */
function CrochetHookIcon(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 19 L17.5 6.5" />
      <path d="M17.5 6.5 C18.5 5.5 20.5 5.6 20.4 7.2 C20.3 8.3 19 8.4 18.4 7.8" />
      <path d="M8.5 15.5 L6 18" strokeWidth={3.4} />
    </svg>
  );
}

function YarnBallIcon(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="12" r="8" />
      <path d="M5 8.5 C9 7.5 14 9 17.5 13" />
      <path d="M3.6 12.6 C8 11 13 13.5 15.5 18" />
      <path d="M8.5 4.5 C11 7 12.5 11 12.5 19.8" />
      <path d="M18.5 15.5 C20 17.5 21 18.5 22 18.5" />
    </svg>
  );
}

function TapestryNeedleIcon(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20 L16.5 7.5" />
      <path d="M16.5 7.5 C17 5 19 3.5 20.3 4.2 C21 5.5 19.5 7.5 16.5 7.5 Z" />
      <path d="M18.4 5.6 L19 5" />
      <path d="M9 13 C6 10 4 11 3 9" strokeDasharray="1 2.5" />
    </svg>
  );
}

const ICONS: Record<MaterialView["icon"], (props: LucideProps) => React.ReactNode> = {
  hook: CrochetHookIcon,
  yarn: YarnBallIcon,
  needle: TapestryNeedleIcon,
  scissors: Scissors,
  marker: Bookmark,
  stuffing: Cloud,
  eyes: Eye,
  pins: Pin,
};

export function MaterialIcon({ icon, ...props }: { icon: MaterialView["icon"] } & LucideProps) {
  const Icon = ICONS[icon];
  return <Icon aria-hidden="true" {...props} />;
}
