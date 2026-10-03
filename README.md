# croché!!

App web para aprender croché y amigurumi **desde cero hasta experto**, con tutoriales SVG interactivos. Cada punto se divide en micro-movimientos (**posición → introducir → lazada → tirar**) que puedes reproducir, pausar o recorrer a mano con un slider.

Sin imágenes, vídeos ni modelos 3D en archivos: agujas, hilos, manos, iconos y logo se generan **100 % con código** (SVG + Framer Motion; el hilo del reproductor, como tubo 3D con WebGL).

## Inicio rápido

```bash
npm install
npm run dev        # http://localhost:3000
```

Requiere Node.js ≥ 22.12. Más detalles en [docs/SETUP.md](docs/SETUP.md).

## Qué incluye (Fases 1–3)

- **`<SvgStepPlayer />`:** motor de animación alimentado por JSON. El hilo es un único tubo 3D (de la punta de la cola al ovillo) con hebras torcidas, sombras y contorno en cada cruce, así se ve qué tramo pasa por encima y cómo se forma cada nudo. Hilo base azul, tramo activo amarillo que recorre el hilo en el sentido del flujo y aguja metálica semitransparente. Controles: paso anterior, reproducir/pausar, siguiente, slider 0–100 %, velocidad y avance automático. Atajos de teclado y soporte de movimiento reducido.
- **Lección completa de la cadeneta:** 7 pasos (sujetar, introducir, lazada, tirar, repetir y contar).
- **Onboarding:**
  - ruta de 0 a 100 con progreso guardado;
  - anatomía interactiva de la aguja con 5 tipos generados por código;
  - guía de grosores de hilo (0–7);
  - kit de materiales;
  - glosario ES / US / UK.
- **Contenido escalable:** se añaden técnicas, pasos y coordenadas en [`src/data/crochet-data.json`](src/data/crochet-data.json) sin tocar React. Hay validación en build y autocompletado en el editor.

## Documentación

- [Arquitectura y estructura de carpetas](docs/ARCHITECTURE.md)
- [Esquema del JSON y guía para añadir técnicas](docs/DATA_SCHEMA.md)
- [Comandos de instalación y scripts](docs/SETUP.md)
- [Guía de contribución](docs/CONTRIBUTING.md)

## Stack

Next.js 16 (export estático) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion 13 · Lucide React · Zod 4 · Vitest
