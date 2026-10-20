# Architecture

Layers, import rules and strictness for the web app. Enforced by ESLint (`eslint.boundaries.js`) and `tsc`; checked by `npm run check`.

Work in progress: F-020 W3-W5 (splitting the flat feature folders into `api/ model/ ui/ hooks/`).

## Layers

- `src/components/ui/`: design-system primitives. Imports no feature, layout, route, app or mock code.
- `src/lib/`: shared helpers (API client in `lib/api`, storage, breakpoints, text). Imports no feature code either.
- `src/features/<feature>/`: one folder per area. Public face is `index.ts`. Target internals: `api/` (TanStack Query hooks), `model/` (pure logic), `ui/` (components), `hooks/`. Most features are still flat; W3 splits them.
- `src/app/`: providers, router, lazy route loading.
- `src/routes/`: one thin component per route.
- `src/layouts/`: `AppShell` and the sidebar frame.
- `src/mocks/`: MSW handlers and stateful dev fakes. Dev and tests only.

## Import rules

Defined in `eslint.boundaries.js`, using `no-restricted-imports`:

- **A.** `components` and `lib` never import `features`, `layouts`, `routes`, `app` or `mocks`.
- **B.** A feature imports another feature only through that feature's `index.ts`.
- **C.** Files outside `features/`, `components/` and `lib/` import a feature only through its `index.ts`.

`eslint.boundaries.baseline.js` lists legacy files exempt from these rules. It is generated and must only shrink. Never add a file to it; fix the import instead.

To fix a violation, export the symbol from the feature's `index.ts` and import it from there. Do not reach into a feature's internal file.

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

## Links

- URL building lives in `src/features/links/` (`buildExternalLinks`, `storeLink`, `streamingSearchLink`, `safeImdbUrl`, `safeWebsiteUrl`).
- The API's `store_links` and `platform_links` fields are ignored; the client builds its own links.
