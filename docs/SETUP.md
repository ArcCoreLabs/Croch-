# Instalación y comandos (Fase 2)

## Requisitos

- **Node.js ≥ 22.12** (exigido por Vitest 5; Next.js 16 pide ≥ 20.9). Hay un `.nvmrc`: `nvm use`.
- **npm 10+** (viene con Node 22).

## Opción A: usar este repositorio (recomendado)

```bash
git clone https://github.com/ArcCoreLabs/Croch-.git
cd Croch-
git checkout claude/init-croche
npm install
npm run dev            # http://localhost:3000
```

## Opción B: crear el proyecto desde cero

Son exactamente los comandos con los que se inicializó este repositorio:

```bash
# 1. Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + ESLint (App Router, carpeta src/)
npx create-next-app@16.3.8 croche --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
cd croche

# 2. Dependencias de la app
npm install framer-motion lucide-react zod

# 3. Dependencias de desarrollo: tests, scripts en TypeScript y servidor estático
npm install -D vitest tsx serve @types/node@^22

# 4. Limpieza: la app no usa archivos de imagen
rm -f public/*.svg src/app/favicon.ico
```

Después copia `src/`, `tests/`, `scripts/`, `next.config.ts`, `vitest.config.mts` y los scripts de `package.json` de este repositorio.

| Paquete | Versión | Uso |
| --- | --- | --- |
| `next` | 16.3 | App Router, export estático (SPA) |
| `react` / `react-dom` | 19.2 | Interfaz |
| `tailwindcss` | 4 | Estilos mobile-first (configurados en `globals.css` con `@theme`) |
| `framer-motion` | 13 | Animación SVG (`pathLength`, morphing, `animate()`) |
| `lucide-react` | 1.x | Iconos de interfaz |
| `zod` | 4 | Esquema y validación del JSON (solo en build) |
| `vitest` | 5 | Tests |
| `tsx` | 4 | Ejecutar scripts TypeScript (`content:schema`) |
| `serve` | 14 | Servir `out/` en local |

> **Sobre Framer Motion:** el proyecto ahora se publica como `motion` (import `motion/react`). El paquete `framer-motion` sigue publicándose en paralelo con la misma versión y el mismo código. Para migrar basta con cambiar los imports.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente (Turbopack). |
| `npm run build` | Valida el contenido, compila y exporta la SPA estática en `out/`. |
| `npm start` | Sirve `out/` (tras `npm run build`). |
| `npm run lint` | ESLint (reglas de Next.js + React Compiler). |
| `npm run typecheck` | TypeScript estricto. |
| `npm test` | Tests: contenido, compilador de escenas, generador de agujas, reproductor y ruta. |
| `npm run content:schema` | Regenera `crochet-data.schema.json` tras cambiar el esquema Zod. |
| `npm run check` | `typecheck` + `lint` + `test` (antes de cada PR). |

## Despliegue

### GitHub Pages (automático)

El workflow `.github/workflows/deploy-pages.yml` publica la app en cada push: ejecuta `npm run check`, construye con `NEXT_BASE_PATH=/<repo>` y despliega `out/`.

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions** (solo la primera vez).
2. Haz push o lánzalo a mano en **Actions → Publicar en GitHub Pages → Run workflow**.
3. La web queda en `https://<usuario>.github.io/<repo>/`.

Para probar localmente con la misma subruta: `NEXT_BASE_PATH=/Croch- npm run build`.

### Otros hostings

`npm run build` genera `out/`: HTML, CSS y JS estáticos. Se puede publicar en GitHub Pages, Netlify, Vercel, Cloudflare Pages o cualquier servidor de archivos. No hace falta Node en producción.
