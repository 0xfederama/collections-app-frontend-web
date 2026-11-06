# Changelog

## 2.30.1 — 2026-11-06

### Fixed

- Adding an item always focuses the title, so the keyboard opens on iPhone Safari and in the home-screen web app: "New item" (first and repeated adds, with a draft already open, after the "Added" toast, after switching lists) and Quick add (sidebar, phone Home, `N`). Root cause: Quick add focused nothing inside the tap (its title mounts later, in a dialog), and the new-item draft removed the iOS keyboard proxy even when the title had not taken focus yet, so focus could fall to the page and the keyboard closed. Every add now focuses the keyboard proxy synchronously in the tap and the title takes focus over from it as soon as it mounts (before paint), and only then is the proxy removed. The proxy uses 16px text, so iOS never zooms for it. Desktop focuses the title the same way. A dialog opened through the proxy returns focus to the button that opened it.

## 2.30.0 — 2026-11-06

### Added

- Home-screen web app on iPhone (no service worker: the Pi serves plain HTTP on the LAN, so there is no offline mode). A web app manifest (`/manifest.webmanifest`: name "Collections", standalone, start URL and scope `/`), an apple-touch-icon (180 px), manifest icons (192, 512 and a maskable 512), and the iOS meta tags (`apple-mobile-web-app-capable`, title "Collections", `black-translucent` status bar so it works in both themes).
- New app icon: a white card with a blue "C" and an ink full stop, fanned over two blue cards on a white-to-pale-blue tile. The favicon is the "C." alone (lighter blue and white dot in dark mode).

### Changed

- The document title and the default workspace name (fixtures, dev data, the fallback when settings are missing) are "Collections".
- Standalone layout: the phone shell, the desktop shell and the drawer pad the top with `env(safe-area-inset-top)`, so nothing sits under the notch or the Dynamic Island; the bottom bars and toasts already pad for the home indicator. F-025/F-026 mobile behaviour is unchanged.
- Caddy serves the manifest as `application/manifest+json` with `Cache-Control: no-cache`; icons keep the one-day cache of other static files.

## 2.29.2 — 2026-11-06

### Changed

- Quick add asks only for the title and the target list; the item is created with just those two. The website, description and image are no longer in the dialog: add them on the item page. Mobile behaviour (keyboard on repeated adds, the single "Added" toast, no input zoom, list picker) and desktop navigation are unchanged.
