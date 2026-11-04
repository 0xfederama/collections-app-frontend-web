# Production web image (Q-03w, D-069): Node build stage, then Caddy serving dist/ and proxying /api and /readyz.
# Build: docker build -t collections-web .   Run: see docs/modules/deploy.md
# Base images are pinned by tag and digest (R-1). The digests are multi-arch indexes (arm64 and amd64 included).
# The build stage runs on the builder's own platform ($BUILDPLATFORM): dist/ is static and identical for every target, so
# npm ci and vite never run under emulation; only the Caddy/Alpine runtime stages are per target platform.

FROM --platform=$BUILDPLATFORM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# "npm run build" = tsc + vite build; vite.config.ts already drops mockServiceWorker.js from dist/.
RUN npm run build
# Render the Caddyfile with the CSP hash of the inline theme script as it appears in the built index.html.
RUN set -eu; \
    hash="$(node scripts/csp-hash.mjs dist/index.html)"; \
    sed "s|__CSP_SCRIPT_HASH__|${hash}|" Caddyfile > Caddyfile.rendered; \
    ! grep -q __CSP_SCRIPT_HASH__ Caddyfile.rendered; \
    grep -q "script-src 'self' 'sha256-" Caddyfile.rendered

# Caddy binary without its file capability. The official image sets cap_net_bind_service on it, which we don't need for :8080
# and which makes the binary fail to start under cap_drop: ALL / no-new-privileges. COPY keeps file capabilities, so they are
# removed here, and the final image copies only this binary (a RUN setcap in the final stage would duplicate it as a ~40 MB layer).
FROM caddy:2.11.7-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f AS caddy
RUN apk add --no-cache libcap-utils && setcap -r /usr/bin/caddy && ! getcap /usr/bin/caddy | grep -q .

FROM alpine:3.24@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY --from=build /app/Caddyfile.rendered /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# Fail the image build on a bad Caddyfile (the upstream default is only read at run time).
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
# Writable state (autosave is off, so this is only locks and instance id) goes to /tmp: use a tmpfs with read_only.
ENV XDG_DATA_HOME=/tmp/caddy-data XDG_CONFIG_HOME=/tmp/caddy-config API_UPSTREAM=api:8080
USER 10001:10001
WORKDIR /srv
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
