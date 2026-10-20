# Architecture

Layers, import rules and strictness for the web app. Enforced by ESLint (`eslint.boundaries.js`) and `tsc`; checked by `npm run check`.

Work in progress: F-020 W3-W5 (splitting the flat feature folders into `api/ model/ ui/ hooks/`).

## Layers

- `src/components/ui/`: design-system primitives. Imports no feature, layout, route, app or mock code.
- `src/lib/`: shared helpers (API client in `lib/api`, storage, breakpoints, text). Imports no feature code either.
- `src/features/<feature>/`: one folder per area. Public face is `index.ts`. Target internals: `api/` (TanStack Query hooks), `model/` (pure logic), `ui/` (components), `hooks/`. Most features are still flat; W3 splits them.
- `src/data/`: query keys (`keys.ts`) and cache invalidation (`invalidate.ts`). Imports no feature, layout, route, app, mock or component code.
- `src/app/`: providers, router, lazy route loading.
- `src/routes/`: one thin component per route.
- `src/layouts/`: `AppShell` and the sidebar frame.
- `src/mocks/`: MSW handlers and stateful dev fakes. Dev and tests only.

## Import rules

Defined in `eslint.boundaries.js`, using `no-restricted-imports`:

- **A.** `components` and `lib` never import `features`, `layouts`, `routes`, `app` or `mocks`; `data` never imports `features`, `layouts`, `routes`, `app`, `mocks` or `components`.
- **B.** A feature imports another feature only through that feature's `index.ts`.
- **C.** Files outside `features/`, `components/` and `lib/` import a feature only through its `index.ts`.

Public entries per feature: `index.ts`, `testing.ts` (test kits) and `screens.ts` (heavy route-level components, imported by `src/routes`, or by the one lazy module that uses a heavy component (`stores/screens.ts`: the store picker, used by `items/inline/editors.tsx`); keeps the barrels light for code splitting). The rule does not check `import()` calls, so they stay for genuinely lazy components (`ItemPage`, `MarkdownEditor`), not for route screens.

There is no legacy baseline any more (F020-W3): the rules apply to every file. Never add an exemption list; fix the import instead.

To fix a violation, export the symbol from the feature's `index.ts` and import it from there. Do not reach into a feature's internal file.

## Data layer

`src/data/` holds the query keys of every server resource (`keys.ts`, the cache identities; values never change) and the shared invalidation (`invalidate.ts`: `invalidateContent` for any write that changes what exists or where, `invalidateItemWrite` for an item PATCH). Features import keys from `data/keys` and never re-export them from their barrels. The API client is `src/lib/api` (openapi-fetch, `ApiError` / `NetworkError`, `ifMatch`).

## Size and purity

- Pure logic goes in `model/` (or `*.ts` next to the feature) with table-driven tests; components stay thin and call it.
- `max-lines` is a warning at 250 lines (blank lines and comments skipped). Tests and `*TestKit` files are exempt.
- Backlog: 16 `max-lines` warnings (`npx eslint src`), the largest being `features/tree/` and `features/settings/` files.

## Strictness

- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`.
- `exactOptionalPropertyTypes` is not enabled in `tsconfig.json`. It is off on purpose: it gives 76 errors against the generated API types, whose optional fields are declared without `| undefined`.
- ESLint in `src/**`: `no-explicit-any` and `no-non-null-assertion` are errors (both off in tests and test kits); `ban-ts-comment` requires a description on `@ts-expect-error`.
- `jsx-a11y` recommended is on. Every `eslint-disable` needs a `-- reason` on the same line.
- `knip` runs in `npm run check` and fails on unused files, exports or dependencies. `src/features/links/index.ts` is exempt from export checks in `knip.json`.

## Build and dev code

- `/dev/ui` (the component gallery) is registered only under `import.meta.env.DEV` (`src/app/router.tsx`). The MSW worker starts only when `VITE_API_MOCKS=1` (`src/main.tsx`). Both flags are fixed at build time, so the dead branches are dropped.
- `npm run dist:check` (after `vite build`, part of `npm run check`) fails if dev code reaches `dist/`: a file named like the MSW worker or `DevUi*`, or a JS file containing `setupWorker`, `createTreeBackend`, `DevUiRoute` or `/dev/ui`. It also prints the asset sizes (raw and gzip). There is no size budget (D-034).
- MSW stays (F020-Q2). About 100 unit-test files use the handlers built from `src/generated/examples.ts` and the stateful dev fakes in `src/mocks/`; removing MSW would mean rewriting those tests. The same fakes give the backend-less `VITE_API_MOCKS=1 npm run dev` mode.
- React Compiler (evaluated 2026-10-20, not adopted). The repo has about 24 lines of manual memoisation. Adoption needs `@rolldown/plugin-babel`, `babel-plugin-react-compiler` and `@babel/core` alongside `@vitejs/plugin-react` 6 (`reactCompilerPreset()`). The react-hooks 7 `recommended` lint already runs the compiler diagnostics. dnd-kit 0.5.0 and CodeMirror are untested with it. Revisit when re-render cost is measured; the trial is `npm run check` plus the e2e drag specs.

## Links

- URL building lives in `src/features/links/` (`buildExternalLinks`, `storeLink`, `streamingSearchLink`, `safeImdbUrl`, `safeWebsiteUrl`).
- The API's `store_links` and `platform_links` fields are ignored; the client builds its own links.
