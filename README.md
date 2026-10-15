# collections-app-frontend-web

React + TypeScript + Vite web app for the Collection App. It talks to the backend through a same-origin
`/api` path (a Vite proxy in dev, Caddy in production), so there is no CORS. Design docs:
`/Users/federico/Developer/collections-app/design-docs/`.

This repo is the `frontend-web/` submodule of the parent repo [collections-app](https://github.com/0xfederama/collections-app),
next to `backend/` (repo `collections-app-backend`). The parent owns the run environments (`./deploy/dev|test|prod`).
Conventions, gotchas and architecture notes for contributors are in [`CLAUDE.md`](CLAUDE.md); one short doc per area is in [`docs/`](docs/README.md).

There is no CI. Quality gates run locally with `npm run check`.

## Prerequisites

| Tool   | Version                                                    |
| ------ | ---------------------------------------------------------- |
| Node   | 24 LTS (`.nvmrc`), npm 11                                  |
| Docker | Running, for `npm run check` (builds the production image) |

## What exists today

| Feature                 | What it does                                                             | Code                                                    |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| Folder and list tree    | Sidebar tree, create / rename / move / delete, drag reorder              | `src/features/tree`                                     |
| List view               | Display modes, sort, title filter, manual reorder                        | `src/features/lists`                                    |
| Item detail and edit    | Per-kind fields, external links, form with conflict (412) handling, move | `src/features/items`                                    |
| Item image              | Upload, URL import, remove                                               | `src/features/items/image`                              |
| Description and history | Markdown editor (CodeMirror), safe renderer, version history and restore | `src/features/items/content`, `src/components/markdown` |
| Search                  | Sidebar dropdown and `/search` results page                              | `src/features/search`                                   |
| Trash                   | Restore (in place or elsewhere), delete permanently                      | `src/features/trash`                                    |
| Settings                | Workspace form, and **Connection** (backend status, API address)         | `src/features/settings`, `src/features/health`          |
| Home                    | Your lists and recently updated items                                    | `src/features/home`                                     |

Stack: Tailwind 4 with design tokens (light / dark / system), Radix primitives, TanStack Query, React Router, MSW for tests and the no-backend mode,
strict TypeScript, ESLint, Prettier, Vitest + Testing Library.

## Layout

```text
src/main.tsx           mounts <App />
src/app/               App, router (browser router for the app, memory router for tests)
src/layouts/           AppShell (drawer / rail / sidebar / detail panel)
src/routes/            one thin component per route
src/features/<x>/      components, hooks and api.ts (TanStack Query) per feature
src/lib/api/           the only place that talks to the server (openapi-fetch client, ApiError)
src/components/ui/     design-system primitives (gallery at /dev/ui in dev)
src/mocks/             MSW handlers built from the spec examples, plus stateful dev fakes
src/generated/         generated from the spec: never edit
api/                   vendored OpenAPI spec and lock file: never edit (use api:sync)
src/styles/            global.css (Tailwind entry) and tokens.css
docs/modules/          one short doc per area
vite.config.ts         dev server :5173, /api + /healthz + /readyz proxy, Vitest config
```

## Run

The backend comes from the parent repo, see its [`deploy/README.md`](https://github.com/0xfederama/collections-app/blob/main/deploy/README.md):

- `./deploy/dev up -d` starts the backend and this dev server at http://localhost:5173 with your persistent dev data.
- `./deploy/test up -d --fresh` does the same at http://localhost:5183 (API on :8090) with a disposable database.

Both run Vite on this checkout, so edits reload live. To run only the dev server on the host against a backend that is already up:

```bash
cp .env.example .env   # optional: API_PROXY_TARGET defaults to http://localhost:8080
npm ci
npm run dev            # http://localhost:5173
```

With no backend at all, MSW serves the spec examples in the browser:

```bash
VITE_API_MOCKS=1 npm run dev
```

The dev server proxies `/api`, `/healthz` and `/readyz` to `API_PROXY_TARGET`, so the app is same-origin like production.

| Task                      | Command                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server                | `npm run dev`                                                                                                                                   |
| All gates                 | `npm run check`: api:check, format, lint, typecheck, tests, vite build, production image build (**Docker must be running**)                     |
| Tests                     | `npm test`                                                                                                                                      |
| Lint / typecheck / format | `npm run lint` / `npm run typecheck` / `npm run format`                                                                                         |
| Build / preview           | `npm run build` / `npm run preview`                                                                                                             |
| Production image          | `npm run docker:build`                                                                                                                          |
| API contract              | `npm run api:sync -- api-v0.N.0 [--from <backend checkout>]` re-vendors the spec and regenerates `src/generated/`; `npm run api:check` verifies |
| Dependency scan           | `npm run audit`                                                                                                                                 |

## Troubleshooting

- **Backend unreachable or unhealthy:** open **Settings → Connection**. It shows the backend status (with **Check again**), the API address (`<origin>/api`) and the API contract tag. If it says down, the backend isn't running or `API_PROXY_TARGET` is wrong; check `curl -fsS http://localhost:8080/readyz`.
- **`npm run check` fails at the image build:** Docker isn't running.
- **`api:check` reports drift:** `src/generated/` or `api/` no longer matches the pinned spec. Run `npm run api:sync -- <tag>` for the contract tag you want; don't edit those files by hand.
- **Upload over 10 MiB returns an empty 502 in dev:** the Vite proxy hides the backend's 413 when it closes the connection early. The app's client-side size check stops such files first; straight to the backend you get a proper 413.
- **`VITE_API_MOCKS=1` does nothing in the Claude desktop browser pane:** it refuses service workers, so MSW can't start. Use a normal browser.
- **Port 5173 in use:** the dev server uses `strictPort`, so stop the other process (or the `./deploy/dev` stack).
- **Wrong Node version:** `nvm use` (reads `.nvmrc`). `engines` requires Node 24 or newer.
- **`install-scripts` warning from npm:** about the optional `fsevents` package, harmless.
