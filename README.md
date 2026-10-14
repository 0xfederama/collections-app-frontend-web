# collections-app-frontend-web

React + TypeScript + Vite web app for the Collection App. It talks to the backend through a same-origin
`/api` path (a Vite proxy in dev), so there is no CORS. Design docs: `/Users/federico/Developer/collections-app/design-docs/`.

This repo is the `frontend-web/` submodule of the parent repo [collections-app](https://github.com/0xfederama/collections-app),
next to `backend/` (repo `collections-app-backend`). From the parent folder, `docker compose up --build` starts the whole app
including this dev server. Everything below also works standalone in this repo.

There is no CI. Quality gates run locally with `npm run check`.

## Prerequisites

| Tool | Version                   |
| ---- | ------------------------- |
| Node | 24 LTS (`.nvmrc`), npm 11 |

## What exists today (M0 skeleton)

| Piece       | State                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| App shell   | Responsive shell (drawer / rail / resizable sidebar / detail panel), folder and list tree, breadcrumbs, backend indicator (`src/layouts/`, W-04) |
| Routes      | Home, list, item, search, trash and settings placeholders plus a not-found page, via a React Router data router                                  |
| Styling     | Tailwind 4 (CSS-first, entry in `src/styles/global.css`). Design tokens, fonts and dark mode arrive in W-03                                      |
| Server data | Nothing yet. TanStack Query, the OpenAPI client and MSW mocks arrive in W-02                                                                     |
| Tooling     | Strict TypeScript, ESLint (flat config), Prettier, Vitest + Testing Library on jsdom                                                             |

Dependencies are added only in the task that first uses them (D-034), so the lockfile stays small.

## Layout

```text
src/main.tsx           mounts <App />
src/app/               App, router (browser router for the app, memory router for tests)
src/layouts/           AppShell
src/routes/            one component per route
src/lib/               small helpers (backendStatus.ts, replaced by lib/api in W-02)
src/styles/            global.css (Tailwind entry)
vite.config.ts         dev server :5173, /api + /healthz + /readyz proxy, Vitest config
docs/                  one short doc per feature
```

## Run

Start the backend first (in the parent's `backend/` folder, or the `collections-app-backend` repo): `docker compose up --build`.

```bash
cp .env.example .env   # optional: API_PROXY_TARGET defaults to http://localhost:8080
npm ci
npm run dev            # http://localhost:5173
```

The dev server proxies `/api`, `/healthz` and `/readyz` to `API_PROXY_TARGET`, so the app is same-origin like production and needs no CORS.
The header shows `Backend: ready` when `/readyz` answers.

| Task                      | Command                                                     |
| ------------------------- | ----------------------------------------------------------- |
| Dev server                | `npm run dev`                                               |
| All gates                 | `npm run check` (prettier, eslint, tsc, vitest, vite build) |
| Tests                     | `npm test`                                                  |
| Lint / typecheck / format | `npm run lint` / `npm run typecheck` / `npm run format`     |
| Build / preview           | `npm run build` / `npm run preview`                         |
| Dependency scan           | `npm run audit`                                             |

## Troubleshooting

- **`Backend: down` in the header:** the backend isn't running or `API_PROXY_TARGET` is wrong. Check `curl -fsS http://localhost:8080/readyz`.
- **Port 5173 in use:** the dev server uses `strictPort`, so stop the other process.
- **Wrong Node version:** `nvm use` (reads `.nvmrc`). `engines` requires Node 24 or newer.
- **`install-scripts` warning from npm:** about the optional `fsevents` package, harmless.
- **API client / contract problems:** the generated client and `api:check` arrive in W-02.
