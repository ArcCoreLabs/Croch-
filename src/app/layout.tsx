import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { Logo, YARN_BALL_SVG } from "@/components/brand/Logo";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "croché!! · Aprende croché y amigurumi desde cero",
    template: "%s · croché!!",
  },
  description:
    "Aprende croché paso a paso con animaciones interactivas: de tu primera cadeneta a diseñar tus propios amigurumis.",
  applicationName: "croché!!",
  icons: {
    icon: [{ url: `data:image/svg+xml,${encodeURIComponent(YARN_BALL_SVG)}`, type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf5ec" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1714" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${fraunces.variable} ${nunito.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-sm font-bold text-canvas focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Saltar al contenido
        </a>
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pb-2 pt-4 sm:px-6">
          <Logo />
          <p className="hidden text-sm font-semibold text-ink-soft sm:block">Croché y amigurumi, de 0 a 100</p>
        </header>
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 py-10 text-center text-sm text-ink-soft sm:px-6">
          Hecho con hilo, paciencia y SVG. Todas las ilustraciones se generan con código.
        </footer>
      </body>
    </html>
  );
}
