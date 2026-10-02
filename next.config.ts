import type { NextConfig } from "next";

/**
 * Ruta base opcional para publicar en un subdirectorio, p. ej. GitHub Pages
 * (`https://<usuario>.github.io/<repo>/`). En local queda vacía.
 */
const basePath = process.env.NEXT_BASE_PATH?.replace(/\/$/, "") || undefined;

const nextConfig: NextConfig = {
  // SPA estática: todo el contenido sale del JSON en build, sin servidor.
  // `npm run build` genera la carpeta `out/`, desplegable en cualquier hosting estático.
  output: "export",
  basePath,
  // Las rutas exportadas como carpetas (/tecnicas/cadeneta/) funcionan en cualquier servidor estático.
  trailingSlash: true,
  poweredByHeader: false,
};

export default nextConfig;
