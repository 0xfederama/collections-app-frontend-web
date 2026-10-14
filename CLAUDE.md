# CLAUDE.md — collections-app-frontend-web

React + TypeScript + Vite web app for the Collection App. It consumes the backend API through a **vendored, pinned** OpenAPI spec.

This repo is the `frontend-web/` submodule of the parent repo `0xfederama/collections-app` (sibling: `backend/`). Branch and PR here; the orchestrator bumps the pointer in the parent after merge (D-043).

## Design docs (canonical, read before working)

`/Users/federico/Developer/collections-app/design-docs/`. Always use this **absolute** path (worktrees break `../`).

- Every session: `AGENT_WORKFLOW.md`, then `STATUS.md` and `DECISIONS.md` (open questions + recent entries).
- These are **living** docs, versioned in the **parent** repo (D-043). Update `STATUS.md` when you start or finish a task or open a PR, and record decisions as they happen (AGENT_WORKFLOW §7). Re-read before editing, and make small targeted edits. Commit design-doc edits in the parent, never in this repo (AGENT_WORKFLOW §7, D-044).
- Web work: `UI_SPEC.md`, `API.md`, `PRODUCT.md`, `ARCHITECTURE.md` §3, and the task in `IMPLEMENTATION_PLAN.md`.
- If the code must deviate from the docs, follow AGENT_WORKFLOW §7. Never deviate silently.
- **Contract gaps:** don't work around them in the client. Ask the orchestrator or user to open a backend task (AGENT_WORKFLOW §6).

## Session rules (summary of AGENT_WORKFLOW)

- **Never push to `main`.** Branch `<feature|fix|hotfix|refactor|test|docs|chore|ci>/<desc>` from `origin/main`, use Conventional Commits, push the branch, and open a PR with `gh pr create`. Don't merge unless the user says so.
- **Dispatch cheaper subagents** (`.claude/agents/`):
  - `researcher` (sonnet): library docs and versions, a11y patterns. Must cite sources.
  - `test-writer` (sonnet): Vitest and Playwright tests. **You review and run them yourself.**
  - `docs-keeper` (haiku): updates `docs/` before every PR.
  - Built-in `Explore` handles broad code search.
  - Keep conflict UX, data flow, and design-system decisions in the main session.
- Update **this file** in the same PR when commands, layout, conventions, or gotchas change. Keep it under ~200 lines.
- MVP scope fence: no auth, TMDB, AI, WebSockets, or offline features (ORCHESTRATOR_BRIEF §2).

## Commands

No CI (D-031, D-032): the gates run locally. Run `npm run check` before every PR and paste the output in the PR.

| Purpose                                                                                                 | Command                                                                                              |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| All checks (prettier, eslint, tsc, vitest, vite build)                                                  | `npm run check`                                                                                      |
| Dev server (:5173, proxies `/api` and `/readyz` to `API_PROXY_TARGET`, default `http://localhost:8080`) | `npm run dev`                                                                                        |
| Unit/component tests                                                                                    | `npm test`                                                                                           |
| Lint / typecheck / format check / format                                                                | `npm run lint` / `npm run typecheck` / `npm run format:check` / `npm run format`                     |
| Production build / preview                                                                              | `npm run build` / `npm run preview`                                                                  |
| Dependency vulnerability scan (network)                                                                 | `npm run audit`                                                                                      |
| E2E (needs backend running)                                                                             | arrives in Q-01                                                                                      |
| Sync API contract (vendors the spec at a backend tag, regenerates `src/generated/`) / verify offline    | `npm run api:sync -- api-v0.N.0 [--from <backend checkout>]` / `npm run api:check` (part of `check`) |
| Dev server with no backend (MSW serves the spec examples)                                               | `VITE_API_MOCKS=1 npm run dev`                                                                       |

Versions and tool choices: DECISIONS.md "Toolchain versions (R-1)" and D-034, D-038–D-042. Backend for dev: `docker compose up --build` in `../backend` (backend only) or in the parent folder (backend plus this dev server in a container).

## Layout & conventions

- `src/features/<feature>/` holds components, hooks, and `api.ts` (TanStack Query hooks, from W-02). All server I/O goes through `src/lib/api` (openapi-fetch client; failures throw `ApiError` / `NetworkError`), never raw `fetch`. Writes build `If-Match` with `ifMatch('item', item.version)`.
- Lean rule (D-034): add a dependency only in the task that first uses it, and justify it in the PR.
- `src/generated/` and `api/openapi.yaml` are generated/vendored, so **never edit** them. Regenerate with `api:sync`; `api:check` fails on any drift.
- `src/mocks/` holds MSW handlers built from the spec examples (`src/generated/examples.ts`). Tests start the Node server in `test-setup.ts` (unmocked requests fail); override per test with `server.use(...)`. Render with `renderAt` / `renderWithProviders` from `src/test-utils.tsx` (fresh QueryClient per render).
- `src/components/ui/` is the design-system primitives (barrel `index.ts`, all 18 of UI_SPEC §11). Compose them; use tokens from `src/styles/tokens.css`, with no hard-coded colors, radii, or spacing. Lucide icons are imported only in `src/components/ui/icons.ts`.
- `/dev/ui` is a dev-only gallery of every primitive and state (`src/dev/DevUiRoute.tsx`, lazy route, absent from the prod bundle). Add new primitives or states there.
- Shell (W-04): `src/layouts/AppShell.tsx` picks the layout from `useBreakpoint()` (`src/lib/breakpoints.ts`, the one place for 768 / 1024 / 1280, equal to Tailwind `md` / `lg` / `xl`). The item route is rendered by the shell, not by `ListRoute`: full page in `main` below 1280, in the `aside` panel at ≥ 1280. All UI_SPEC §1 routes are registered in `src/app/router.tsx`; don't edit it to add them.
- Tree writes (W-05): all folder/list mutations live in `features/tree/mutations.ts` (If-Match from the resource `version`, never retried, tree refetched on success; a 412 deliberately does not refetch). `useTreeDialogs()` owns every dialog and returns `{ actions, dialogs }`: the sidebar shares them through `TreeActionsContext`, and `<ListActionsMenu list />` (for the list header) uses its own copy. Move and reorder bodies always send `parent_folder_id` / `folder_id` (`null` = root, D-060).
- Drag and drop (D-061): `@dnd-kit/react` and `@dnd-kit/dom` are pinned to exactly 0.5.0 and imported **only** in `src/components/ui/sortable.tsx` (pre-1.0, so an API break stays in that file). `Tree` takes `sortable(node)` + `onReorder`; the drag handle is a real button (`Reorder <name>`), reorder is among same-kind siblings of one parent only, and "Move up/down" in the row menu is the fallback.
- `ToastProvider` is mounted in `App.tsx` and in `renderWithProviders`; tests that build their own `RouterProvider` must wrap it too. `src/test-polyfills.ts` is imported first by `test-setup.ts`: dnd-kit reads `ResizeObserver` while it is imported.
- `src/mocks/devTree.ts`: `createTreeBackend(tree)` is a stateful fake of the folders/lists endpoints (versions, If-Match, cycles, order_stale). The dev worker uses it (via `devData.ts`); tests can `server.use(...backend.handlers)` when the tree must really change.
- Query keys are exported constants (`treeKeys`, `settingsKeys`, `healthKeys`); invalidate with them. Use `ListGate` (`features/tree/ListGate.tsx`) for loading / error / not-found of a list id.
- List view (W-06, `src/features/lists/`): `?q=` (debounced filter) and `?sort=` (override of the list's `sort_mode`, D-063) are URL state; display mode is PATCHed on the list. Reads go through `listKeys` (invalidate the `items(listId)` prefix after item changes). Drag handles only in manual sort, no filter, all items loaded; The header embeds `ListActionsMenu`; the heading comes from the tree, and the detail is refetched when the tree's version is newer. Reorder uses the shared `components/ui/sortable.tsx` (one group, `items`). `main` is the scroll container, so `scrollRestore.ts` replaces `<ScrollRestoration>`. `src/mocks/devItems.ts` is the stateful dev fake of the list/items endpoints.
- Item detail (W-07, `src/features/items/`): `routes/ItemRoute.tsx` is only a `lazy` wrapper around `features/items/ItemPage.tsx` (the Markdown renderer loads on first item visit). Hooks and `itemKeys` are in `api.ts`; delete/move send `If-Match` from the loaded item and invalidate the list items, list detail and tree. Per-kind field configs are `kinds/*.ts` (`defineFields<GeneratedMetadata>()` fails the build if a generated key is missing or renamed; `kinds/index.ts` has `kindFields`, `kindRows`, `formatField`); W-08's form renders from the same configs. The three external links are the pure `links.ts` (`buildExternalLinks`, AT-13) plus `ExternalLinks.tsx`. Don't name two files in a folder that differ only by case (macOS resolves `./ExternalLinks` to `externalLinks.ts`).
- Item form (W-08, `src/features/items/`): edit mode is `?edit=1` on the item URL (`editMode.ts`), entered and left with `replace`; the param belongs to the item page, so links to other items and the back link strip it (`withoutEdit`). `ItemEditForm` edits a **snapshot** of the item taken on mount: `If-Match` comes from the snapshot, never from a refetch (no silent overwrite). All form logic is pure in `form/draft.ts` (`Draft` of strings, `toFields`, `validate`, `buildPatch` = only changed fields, `mapServerErrors`, `draftDump`); input ids are `inputId(<dotted API field>)`, which is how a 422 `errors[].field` finds its input and gets focus. Kind inputs render from `kinds/*.ts`. The unsaved guard is `useBlocker` (blocks unless the next location is the same item in edit mode) plus `beforeunload`; leaving on purpose sets `allowLeave`. `CreateItemDialog` (ListView's "Add item") opens the new item at `?edit=1`. Dev fakes for POST/PATCH live in `mocks/devItemDetail.ts`.
- Markdown (`src/components/markdown/`): `MarkdownView` = `react-markdown` + `remark-gfm`, `skipHtml` (raw HTML dropped, no `rehype-raw`), every URL through `sanitizeUrl` (`http`, `https`, `mailto`, relative), links `target=_blank rel="noopener noreferrer"`, images `no-referrer`, headings start at h3. Reuse it for any Markdown display (W-10 Preview); never render raw HTML.
- Route screens are lazy (`app/lazyRoute.tsx`, skeleton fallback), so tests that render a route must `await findBy…`.
- Search (W-11, `src/features/search/`): the sidebar field is a `role="combobox"` (so tests use `getByRole('combobox', { name: 'Search' })`, not `searchbox`) with a listbox popup built on Radix Popover, not the `Combobox` primitive (that one filters client-side and always highlights row 0). Query hooks `useSearch` (dropdown, top 8) and `useSearchResults` (results page, infinite by offset); `normalizeQuery` trims and caps `q` at 200 chars; `searchKeys` for invalidation. Items open at `/lists/${item.list_id}/items/${item.id}`. The dev fake is `src/mocks/devSearch.ts`.
- Trash (W-12, `src/features/trash/`): `/trash` is always refetched on mount (`staleTime: 0`), since deletes elsewhere don't touch its query. Restore and purge invalidate `trashKeys`, `treeKeys`, `['lists']`, `['items']` and `searchKeys.all`. "Restore ‘X’ instead" is offered only when the blocking parent is the root of a loaded, restorable entry (`blockedBy` in `model.ts`); otherwise only the picker, never a guess. The destination picker is `features/tree/DestinationPicker.tsx` (shared with `MoveDialog`). `Toast` takes an optional `action: { label, onAction }` (a callback, because `ToastProvider` sits above the router). `src/mocks/devTrash.ts` is a stateful fake that is not synced with the dev tree or items.
- `localStorage` keys are prefixed `collection:` and read through `src/lib/storage.ts` (`readStored`, `writeStored`, `STORAGE_KEYS`: `collection:tree-expanded`, `collection:sidebar`, plus the theme key); always tolerate missing, garbage or blocked storage.
- Tests fake the viewport with `mockViewport(width)` from `src/test-utils.tsx` (jsdom has no `matchMedia`; unmocked tests see 1024 px). `test-setup.ts` resets it and clears `localStorage` after each test.
- `src/mocks/devData.ts` is a richer tree used only by the dev worker (`src/mocks/browser.ts`); Vitest keeps the unmodified spec examples.
- Editable resources: `If-Match` is built from the resource `version` by `lib/api`. Drafts are never discarded on 412 or network errors (UI_SPEC §9).
- Accessibility is required: labels, focus-visible, keyboard paths, and no color-only state.
- Tests: names reference acceptance IDs (`describe("AT-13 external links")`). Mock the API with MSW handlers built from spec examples.

## Gotchas

<!-- Add entries as discovered: one line each, with the date. -->

- 2026-10-13: TypeScript is pinned to 6.x (D-040) because typescript-eslint does not support 7 yet. `^6.0.3` keeps npm from jumping to 7.
- 2026-10-13: React Router 8 has no `react-router-dom`. Import from `react-router` and `RouterProvider` from `react-router/dom`.
- 2026-10-13: Tailwind 4 is CSS-first (`@import 'tailwindcss'` in `src/styles/global.css`, `@tailwindcss/vite` plugin). There is no `tailwind.config.js`.
- 2026-10-13: Vitest config lives in `vite.config.ts` (jsdom, globals, `src/test-setup.ts`). Tests render with `createTestRouter` from `src/app/router.tsx`.
- 2026-10-14: Tokens: Tailwind's default palette, radii, shadows and type scale are dropped (`--color-*: initial`, etc. in `global.css`), so `bg-stone-100` or `rounded-2xl` do nothing. Use semantic classes (`bg-surface`, `text-text-muted`, `border-border`, `bg-accent`, `rounded-md`, `shadow-md`). Colors are mapped with `@theme inline`; radii and easing live in an `@theme` block inside `tokens.css`, because mapping `--radius-sm: var(--radius-sm)` creates a self-referencing cycle. Shadows differ per theme, so `shadow-*` are `@utility` rules in `global.css`.
- 2026-10-14: Theme: preference is stored in `localStorage['collection:theme']` (`system` removes the key). The inline script in `index.html` and `src/lib/theme.ts` must agree on that key. **Q-03:** the inline script needs a CSP `script-src` hash in the Caddyfile (recompute whenever the script changes).
- 2026-10-14: jsdom lacks `ResizeObserver`, pointer-capture methods and `scrollIntoView`; `src/test-setup.ts` stubs them for Radix Select/Menu/Popover. Radix exit animations do not run in jsdom, so closed overlays unmount immediately.
- 2026-10-14: Fraunces uses `full.css` (the only Fontsource entry with both `opsz` and `SOFT` axes, ~120 KB latin); Inter uses the default `wght` entry.
- 2026-10-14: Radix `Dialog.Content` animations use `transform` only (`scale`); Tailwind 4 positions with the `translate` property, so never put translate in the keyframes.
- 2026-10-14: The Claude desktop browser pane refuses service workers, so `VITE_API_MOCKS=1` cannot start MSW there. To check the UI in that pane, serve the API from a throwaway Node server and point `API_PROXY_TARGET` at it (it is not part of the repo). A normal browser works with `VITE_API_MOCKS=1`.
- 2026-10-14: Params of a child route are visible to the parent layout and to components it renders (`useParams` merges the whole match). That is how `AppShell` renders `ItemRoute` itself. Keep `lists/:listId` and its `items/:itemId` child in `router.tsx` so the list stays mounted when the panel opens.
- 2026-10-14: Radix `Drawer` content renders in a portal, so the mobile `nav` lives inside the `dialog`. Anything that must close the drawer on navigation relies on `location.key` (see `AppShell`), not on click handlers.
- 2026-10-13: npm 11 prints an `install-scripts` warning for the optional `fsevents` package. It is harmless.

- 2026-10-14: `openapi-typescript` 7.13 declares `typescript@^5` as a peer, so `package.json` has a scoped `overrides` entry for it (works with TS 6; re-check when it widens its range).
- 2026-10-14: MSW 3: import `http`/`HttpResponse` from `msw/http`, and use `onUnhandledFrame` (was `onUnhandledRequest`). Handlers and the client use absolute `location.origin` URLs because Node's fetch rejects relative ones.
- 2026-10-14: `public/mockServiceWorker.js` (from `npx msw init public/`) is dev-only: a build plugin in `vite.config.ts` deletes it from `dist/`, and `main.tsx` imports the mocks only when `VITE_API_MOCKS=1`.
- 2026-10-14: A Radix `Dialog` opened from a Radix `Menu` item gets focus on its Close button, not on an `autoFocus` input. Pass `initialFocus` (ref) to `Dialog` for forms.
- 2026-10-14: Under jsdom, abort errors from Node's fetch are not `instanceof DOMException`; match `error.name === 'AbortError'`.

## Working guidelines

### Shell

- Check the parent directory exists before creating files or directories. Quote paths with spaces (`"path with spaces/file"`).
- Prefer absolute paths over `cd`. Chain commands with `&&` or `;`, not newlines.
- Use the Read/Grep/Glob tools instead of `cat`/`grep`/`find`/`ls`. If shell search is unavoidable, use `rg`.
- Give every command a clear 5–10 word description. Use `run_in_background` for dev servers and watchers, never `sleep`.

### Proactiveness

- Do what was asked, including natural follow-ups (tests, docs, CLAUDE.md), but don't surprise the user with unrequested actions. If asked _how_, answer first.
- **Never guess.** Don't guess that a component, hook, or prop exists, a type, that tests pass, or business-logic flows. Verify in code or docs, or ask.

### Conventions

- Mimic the surrounding code style and look at existing components before creating new ones.
- Never assume a library is available. Check `package.json` first, and justify any new dependency in the PR.
- Security: never log or commit secrets. `.env` is gitignored, and `.env.example` holds placeholders only. Never render raw HTML from user content.
