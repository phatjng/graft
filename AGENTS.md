# Graft

Graft is a React framework built on Vite: file-based routing, server rendering with hydration, `loader`/`action` data functions, client-side navigation, and a production build and server. API design, stability and correctness matter.

User-facing behavior is documented in `docs/` (a Graft app). Read the relevant docs page before changing a feature, and update it in the same change.

## Design principles

- **Not a bundler.** Vite does the bundling, the dev server and HMR. Graft is a Vite plugin plus a small runtime. If Vite already does something, use Vite's version instead of rebuilding it. Prefer the Vite Environment API for splitting client and server builds.
- **No React Server Components.** Don't add RSC or `"use client"`/`"use server"` semantics.
- **Simple over clever.** Pick the simplest API that fits Graft and justify it on its own terms, rather than copying another framework's shape.
- **Portable by default.** Core code only uses web-standard APIs (`Request`, `Response`, `URL`, streams), never `node:*`. Anything runtime-specific lives in an adapter package.
- **The server entry is a `fetch` handler.** Every request goes through the user's `app/server.ts`, and all per-request work (routing, loaders, actions, rendering, and streaming that continues after the `Response` is returned) happens inside that call. This lets users wrap it in `AsyncLocalStorage.run()`. Graft doesn't depend on AsyncLocalStorage, but must never break this guarantee.
- **Server code never reaches the client.** Leaking a loader, action or `*.server.*` module into the client bundle can expose secrets. Treat it as a security bug and cover it with tests that inspect the built output. The strip transform is `packages/vite/src/strip.ts`.
- **Unsupported syntax is an error.** Route folders like `[...slug]` or `(group)` fail instead of being treated literally, so adding them later can't change the meaning of an existing app.
- **Keep the public API small.** Anything exported from `@phatjng/graft` is a commitment. Route IDs (a file's path inside `app/` without the extension, like `blog/[slug]/page`) appear in URLs (`?_graft_action=`), so their format is public API too.

## Repo layout

pnpm workspace monorepo:

| Dir               | Package                 | Role                                                                                                                |
| ----------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `packages/graft`  | `@phatjng/graft`        | The one package users install. Public API, plus subpath exports (`/vite`, `/server`, `/node`, ...) for the others.  |
| `packages/vite`   | `@phatjng/graft-vite`   | The Vite plugin: route discovery, virtual modules, type generation, stripping server code, dev server, builds.      |
| `packages/router` | `@phatjng/graft-router` | Route matching and the React tree for a match (`.`, shared with the server), plus the browser runtime (`./client`). |
| `packages/server` | `@phatjng/graft-server` | Runtime-agnostic server: `handle(request)`, SSR, loaders and actions. Never imports `node:*`.                       |
| `packages/node`   | `@phatjng/graft-node`   | Node adapter: the Node HTTP ↔ `fetch` bridge (dev and production) and `serve()`.                                    |
| `packages/vercel` | `@phatjng/graft-vercel` | Vercel adapter: `vercel()`, which writes `.vercel/output/`.                                                         |
| `examples/basic`  |                         | Playground app for developing and testing against Graft.                                                            |
| `docs`            |                         | The documentation site, itself a Graft app.                                                                         |

- The `graft-*` packages are internal and versioned together. A new runtime or host is a new adapter package, exposed as `@phatjng/graft/<runtime>`.
- Each `@phatjng/graft` subpath entry (`src/vite.ts`, `src/server.ts`, ...) re-exports an internal package and needs a matching entry in both its `tsdown.config.ts` and its `exports`.
- Examples consume the packages through `workspace:*`, like a real user. Framework code goes in `packages/*`, never in the examples.
- Docs pages are plain TSX (no MDX), styled with Tailwind CSS: page content gets `@tailwindcss/typography` defaults from the `prose` class in `docs/app/layout.tsx`, so write plain HTML elements rather than utility classes. Show code with `<Code>` from `docs/app/components.tsx`, which highlights it with Sugar High: pass `file` (the language comes from its extension) or `lang` (like `"ts"` or `"shell"`). The sidebar and Previous/Next order come from `docs/app/nav.ts`, so a new page needs an entry there.

## Tech

- TypeScript (strict), ESM only. Node 24+, pnpm 12, TypeScript 7, Vite 8 (Rolldown and oxc). Shared settings are in `tsconfig.base.json`.
- Formatted with oxfmt (`.oxfmtrc.json`). Run `pnpm format` before committing.
- oxfmt doesn't add blank lines, so do it by hand: group a function body into steps, like paragraphs, with a blank line between them. Leave a blank line after a guard clause or a group of them, around multi-line `if`/`for`/`try` blocks, before a comment that starts a new step, and before the final `return` when setup comes before it. Keep a value and its immediate check together (`const x = get(); if (!x) return;`). Very short bodies (two or three lines) stay as they are.
- TypeScript 7 doesn't load `@types/node` unless a tsconfig lists it in `types`. Only `packages/node` and `packages/vite` do, so a `node:*` import in `graft-server` or `graft-router` fails typechecking.
- The runtime imports virtual modules (`virtual:graft/*`), declared in each package's `src/virtual.d.ts` and kept external by tsdown. The plugin makes Vite process the runtime packages as source (`ssr.noExternal`, `optimizeDeps.exclude`) so those imports resolve.
- tsdown warns that TypeScript 7's API is experimental while it emits `.d.ts` files. The warning is expected.

## Commands

Run from the repo root.

```bash
pnpm install          # install workspace dependencies
pnpm build            # build every packages/* with tsdown
pnpm test             # Vitest: unit and integration tests (builds packages first)
pnpm exec playwright install chromium   # once, for the browser tests
pnpm typecheck        # build, generate .graft/types, then tsc --noEmit everywhere
pnpm format           # format with oxfmt
pnpm format:check     # fail if anything isn't formatted
pnpm --filter basic dev   # vite dev in examples/basic
pnpm --filter docs dev    # the docs site in dev
```

## Releasing

Releases use [Changesets](https://changesets.dev). The six `packages/*` are a `fixed` group, so they always share one version; `examples/*` and `docs` are private and never published.

- A change users would notice (a fix, a feature, a breaking change) comes with a changeset: run `pnpm changeset`, pick the bump, and write one line for the changelog. Commit the generated `.changeset/*.md` file with the change. Internal refactors, tests and docs-only changes don't need one.
- Graft is `0.x`: a breaking change is a `minor` bump, everything else is a `patch`.
- On `main`, `.github/workflows/release.yml` opens a "Version Packages" PR that bumps versions and writes `CHANGELOG.md`. Merging it runs `scripts/stage-release.sh`, which stages the new versions on npm with trusted publishing (OIDC), so there's no npm token in the repo. They go live once a maintainer approves them with 2FA under Staged Packages on npmjs.com; approve the internal packages before `@phatjng/graft`.
- Never bump versions in `package.json` or run `pnpm publish` by hand.

## Testing

- Work in small steps that each end with something runnable in `examples/basic`, and cover each user-facing behavior with an integration test.
- Unit tests sit next to the code as `packages/*/src/**/*.test.ts` and import sibling packages from `src/` (aliased in `vitest.config.ts`).
- Integration tests live in `test/`, one file per feature, and run against `examples/*` and `test/fixtures/*`, which import the built `dist/` output. `test/docs.test.ts` checks that every docs page renders and no internal link is broken.
- Browser tests use Playwright's library inside Vitest and open pages with `openHydrated()` from `test/helpers.ts` (clicking server HTML before hydration does nothing).
- Each test dev server gets its own Vite cache directory, since parallel servers sharing one break each other's page loads.
