import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SPA estática: todo el contenido sale del JSON en build, sin servidor.
  // `npm run build` genera la carpeta `out/`, desplegable en cualquier hosting estático.
  output: "export",
  // Las rutas exportadas como carpetas (/tecnicas/cadeneta/) funcionan en cualquier servidor estático.
  trailingSlash: true,
  poweredByHeader: false,
};

export default nextConfig;
