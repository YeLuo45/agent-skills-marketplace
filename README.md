# Agent Skills Marketplace ⚡

> A curated registry for the best **Claude Code**, **Codex**, and **MCP** agent skills — built from the 2026-07 GitHub trending pulse.
>
> Inspired by `obra/superpowers` · `addyosmani/agent-skills` · `mattpocock/skills` · `TencentCloud/TencentDB-Agent-Memory`

[**🌐 Live Demo**](https://yeluo45.github.io/agent-skills-marketplace/) · [**📦 Engines (11 engines · 11 tests · 100% pass)**](#engines) · [**🎨 4 themes**](#themes)

![GitHub Pages](https://img.shields.io/badge/live-yeluo45.github.io%2Fagent--skills--marketplace-2563eb) ![Tests](https://img.shields.io/badge/tests-11%2F11%20pass-16a34a) ![Engines](https://img.shields.io/badge/engines-11-7c3aed)

---

## Why

GitHub trending (2026-07-10) shows the agent-skills ecosystem exploding:
- `obra/superpowers` — agentic skills framework
- `addyosmani/agent-skills` — production-grade engineering skills
- `mattpocock/skills` — straight from his `.claude/` directory
- `google-labs-code/stitch-skills` — Stitch MCP skills library
- `TencentCloud/TencentDB-Agent-Memory` — long-term memory
- `usestrix/strix` — AI pen testing
- `wonderwhy-er/DesktopCommanderMCP` — MCP terminal server

This project fuses **18 real trending skills** into a single discoverable marketplace with a theme-aware React UI.

## Engines

11 engines · 11 tests · 100% pass · installed in `src/engines/SkillCore.ts`

### Core Batch 1/3 — V1-V10

| Engine | Description |
|--------|-------------|
| `SkillRegistry` | Central registry with `register` / `get` / `has` / `remove` / `all` |
| `SkillMetadata` | Normalize tags + description trimming |
| `SkillSearch` | Score-based search: name×3 + tag×2 + desc×1 |
| `SkillRecommender` | Tag overlap + rating-based recommend / topRated |
| `SkillInstaller` | Install/uninstall with persisted log |
| `SkillVerifier` | Hash + semver + manifest validation |
| `SkillVersioner` | Semver compare / latest / isNewer |
| `SkillDependencyResolver` | Topological order + cycle detection + missing deps |
| `SkillCategorizer` | Auto-categorize by tag presence + suggest tags |
| `SkillManifestValidator` | Validate skill manifest shape (files / entry / license) |
| `SkillMarketplaceCoreIndex` | Batch 1/3 index |

## UI Features

- **🔍 Search** — name + tag + description (highlighting matched tags)
- **📂 Category filter** — 9 categories (Meta, Dev, Productivity, Security, Research, Data, Communication, Creative, DevOps) + "All"
- **📊 Sort** — Most installed / Highest rated / Alphabetical
- **⭐ Rating display** — visual star with rating count
- **✅ Install button** — click to install/uninstall with localStorage persistence
- **🔗 Similar modal** — click "similar" → see tag-overlap-based recommendations
- **🎨 Theme switcher** — 4 themes (light / dark / sepia / nord) with persistent preference + smooth transitions
- **✓ Manifest verifier** — green ✓ badge when skill passes validation

## Themes

The marketplace ships 4 carefully-tuned themes with **WCAG-AA contrast** preserved across all variants:

| Theme | Use case |
|-------|----------|
| ☀ `light` | Default. Clean, professional. |
| 🌙 `dark` | Low-light work sessions, battery-friendly. |
| 📜 `sepia` | Reading-heavy workflows, eye comfort. |
| ❄ `nord` | Calm polar palette, low-saturation focus. |

Theme preference persists in `localStorage` and survives page reloads.

## Quick start

```bash
# build (uses node build.mjs — esbuild-based, no plugin-react required)
npm run build

# run unit tests
npx vitest run src/engines/SkillCore.test.ts

# preview production build
npx vite preview  # http://127.0.0.1:4173

# development server (requires vite + plugin-react)
npx vite         # http://127.0.0.1:5173
```

## Architecture

```
src/
├── engines/SkillCore.ts       ← 11 engines, 11 tests (zero deps)
├── data/seedSkills.ts          ← 18 real trending AI agent skills
├── styles/themes.css           ← 4 themes with CSS custom properties
├── App.tsx                     ← React UI with search/filter/install/recommend
└── main.tsx                    ← ReactDOM mount + theme bootstrap
```

### Engines are framework-free

All engines are **pure TypeScript classes** with zero runtime dependencies — drop them into any backend (Node, Bun, Deno, Workers). The same `SkillRegistry` powers both the in-browser search and any future CLI or MCP server backend.

## Tech stack

- **Vite 5** — fast dev server + production build
- **React 18** — declarative UI
- **TypeScript 5** — strict, ESM
- **Vitest 2** — fast tests with native V8 coverage
- **CSS variables** — runtime theme switch without re-render

## Adding new skills

Edit `src/data/seedSkills.ts` and add a `SkillMeta` object:

```ts
{
  id: 'my-cool-skill',
  name: 'My Cool Skill',
  version: '1.0.0',
  author: 'yourhandle',
  description: 'What does your skill do? (≥10 chars required)',
  tags: ['agent', 'mcp'],
  category: 'meta',
  pulled: 0,
  ratingSum: 0,
  ratingCount: 0,
}
```

The `SkillVerifier.isValidManifest()` runs on every render so invalid skills show no ✓ badge.

## License

MIT
