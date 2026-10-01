# Guía de contribución

## Flujo de trabajo

- Crea una rama por cada cambio (`feature/...`, `fix/...`, `content/...`).
- Haz commits pequeños con mensajes descriptivos.
- Antes de abrir un pull request, ejecuta `npm run check` (tipos + lint + tests) y `npm run build`.
- Abre un pull request para revisión antes de fusionar a `master`.

## Contenido (técnicas, pasos, textos)

- Edita solo `src/data/crochet-data.json` y sigue [DATA_SCHEMA.md](DATA_SCHEMA.md).
- Mantén la continuidad: el estado final de un paso es el inicial del siguiente.
- Los trazados que se transforman (morphing) deben tener la misma estructura de comandos.
- `npm test` valida referencias, geometrías y saltos de la aguja.

## Código

- Ningún recurso visual externo: todo gráfico se genera con SVG en código. Lucide solo se usa para iconos de interfaz.
- Mobile-first: revisa cada cambio a 360–390 px de ancho y en modo oscuro.
- Componentes cliente solo donde haga falta interactividad. Los datos se preparan en el servidor (`src/lib/content`).
- Respeta `prefers-reduced-motion` y mantén los controles accesibles por teclado.
