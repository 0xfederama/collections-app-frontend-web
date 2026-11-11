# deploy

## Purpose

Production web image (Q-03w, D-069): a Node 24 build stage, then a Caddy 2.11.7 server that serves `dist/` as an SPA and reverse-proxies `/api` and `/readyz`. The parent's `deploy/server/compose.yaml` (Q-03) builds it on the server with `build: ../../frontend-web`; there is no registry.

## Key files

- `Dockerfile`: build stage (`npm ci`, `npm run build`, renders the CSP hash into the Caddyfile), Caddy binary without file capabilities, final Alpine image.
- `Caddyfile`: listener, security headers, CSP template (`__CSP_SCRIPT_HASH__`), cache rules, SPA fallback, proxy.
- `/privacy` (D-155): `public/privacy.html` served by an explicit `handle /privacy` (no-cache) before the SPA fallback. Public through a Cloudflare Access Bypass app, so it is self-contained: inline `<style>`, system fonts, no scripts, no assets, no external requests.
- `scripts/csp-hash.mjs`: prints the `'sha256-…'` of the single inline script in a built `index.html`.
- `scripts/docker-build.mjs`: `npm run docker:build`; fails early with a clear message when Docker is not running.
- `.dockerignore`: keeps `node_modules`, `dist`, `.env*` (except `.env.example`) and `.git` out of the build context.
- `package.json`: `docker:build` script; last step of `npm run check`.

## Interfaces

- Listens on `:8080`; no `EXPOSE` ports are published by the image itself.
- `/healthz`: answered by Caddy (image `HEALTHCHECK`), never proxied.
- `/api/*`, `/readyz`: reverse-proxied to `$API_UPSTREAM` (env var, default `api:8080`).
- No LAN redirect and no Host check (D-150, W8 removed): `raspberrypi.local` and the LAN IP are served like the public host; the image needs no env var for it. The proxy passes `Cf-Ray`, `Cf-Connecting-Ip` and `Cf-Access-Jwt-Assertion` to the API unchanged (the backend decides LAN vs tunnel from them); `npm run docker:build` checks it against the built image (`scripts/proxy-headers-check.mjs`).
- `/assets/*`: hashed files, `immutable` for 1 year; a missing asset is a 404.
- Other paths: real files served as-is; paths without a file extension fall back to `index.html`; a missing file with an extension is a 404.
- `/manifest.webmanifest`: `application/manifest+json`, `no-cache` (so installed home-screen apps pick up a new name or icon); the icons under `/icons/` and `/apple-touch-icon.png` get the one-day cache of other real files.
- Runs as UID/GID `10001`; intended for `read_only` with a `/tmp` tmpfs, `cap_drop: ALL`, `no-new-privileges`.
- `npm run docker:build [tag]`: builds `collections-web:check` by default.

## Gotchas

- The CSP script hash is computed during the Docker build, so editing the inline theme script in `index.html` needs no Caddyfile change.
- Adding a second inline `<script>` makes the build fail: `csp-hash.mjs` expects exactly one.
- Headers use the `?` prefix, so API headers on proxied responses win. `style-src-elem` allows `'unsafe-inline'` (Radix, dnd-kit); inline style attributes stay blocked.
- No HSTS and no auto HTTPS: the image serves plain HTTP on a LAN or Tailscale; remote access goes through a Cloudflare Tunnel with Cloudflare Access in front (roadmap 30, D-144).
- Behind Cloudflare Access every request must carry the `CF_Authorization` cookie: the manifest `<link>` has `crossorigin="use-credentials"` (manifests are fetched without credentials by default), all API and image URLs are same-origin paths (`location.origin`, relative `/api/v1/attachments/...`), and nothing sets `credentials: 'omit'`. Vite's bare `crossorigin` on module scripts is fine (same-origin requests keep cookies). `src/remoteAccess.test.ts` guards `index.html`.
- The upstream default is `api:8080`; set `API_UPSTREAM` when the backend has another name.
- Example run against the dev backend: `docker run --rm --network backend_default -p 127.0.0.1:8081:8080 collections-web:check` (the backend compose network is `<folder>_default`).
- Image is about 58 MB.
- Design: `/Users/federico/Developer/collections-app/design-docs/` (D-069, Q-03).
