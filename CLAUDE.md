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

| Purpose                                                                                                          | Command                                                                          |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| All checks (prettier, eslint, tsc, vitest, vite build)                                                           | `npm run check`                                                                  |
| Dev server (:5173, proxies `/api`, `/healthz`, `/readyz` to `API_PROXY_TARGET`, default `http://localhost:8080`) | `npm run dev`                                                                    |
| Unit/component tests                                                                                             | `npm test`                                                                       |
| Lint / typecheck / format check / format                                                                         | `npm run lint` / `npm run typecheck` / `npm run format:check` / `npm run format` |
| Production build / preview                                                                                       | `npm run build` / `npm run preview`                                              |
| Dependency vulnerability scan (network)                                                                          | `npm run audit`                                                                  |
| E2E (needs backend running)                                                                                      | arrives in Q-01                                                                  |
| Sync API contract / verify generated client                                                                      | arrives in W-02 (`npm run api:sync -- api-v0.N.0`, `api:check` joins `check`)    |

Versions and tool choices: DECISIONS.md "Toolchain versions (R-1)" and D-034, D-038–D-042. Backend for dev: `docker compose up --build` in `../backend` (backend only) or in the parent folder (backend plus this dev server in a container).

## Layout & conventions

- `src/features/<feature>/` holds components, hooks, and `api.ts` (TanStack Query hooks, from W-02). All server I/O goes through `src/lib/api` (from W-02), never raw `fetch`. Until then only `src/lib/backendStatus.ts` uses a plain `fetch`.
- Lean rule (D-034): add a dependency only in the task that first uses it, and justify it in the PR.
- `src/generated/` is generated, so **never edit** it. Regenerate with `api:sync`.
- `src/components/ui/` is the design-system primitives. Use tokens from `src/styles/tokens.css` (arrives in W-03), with no hard-coded colors, radii, or spacing.
- Editable resources: `If-Match` is built from the resource `version` by `lib/api`. Drafts are never discarded on 412 or network errors (UI_SPEC §9).
- Accessibility is required: labels, focus-visible, keyboard paths, and no color-only state.
- Tests: names reference acceptance IDs (`describe("AT-13 external links")`). Mock the API with MSW handlers built from spec examples.

## Gotchas

<!-- Add entries as discovered: one line each, with the date. -->

- 2026-10-13: TypeScript is pinned to 6.x (D-040) because typescript-eslint does not support 7 yet. `^6.0.3` keeps npm from jumping to 7.
- 2026-10-13: React Router 8 has no `react-router-dom`. Import from `react-router` and `RouterProvider` from `react-router/dom`.
- 2026-10-13: Tailwind 4 is CSS-first (`@import 'tailwindcss'` in `src/styles/global.css`, `@tailwindcss/vite` plugin). There is no `tailwind.config.js`.
- 2026-10-13: Vitest config lives in `vite.config.ts` (jsdom, globals, `src/test-setup.ts`). Tests render with `createTestRouter` from `src/app/router.tsx`.
- 2026-10-13: npm 11 prints an `install-scripts` warning for the optional `fsevents` package. It is harmless.

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
