# account

## Purpose

Who is signed in and who else is in the workspace (F-027). Identity comes from Cloudflare Access; the app only reads it.

## Key files

- `src/features/account/api.ts`: `useMe()` (`GET /me`), `useUsers()` (`GET /users`, stale 5 min); `accountKeys` in `src/data/keys.ts`.
- `src/features/account/model/users.ts`: `userLabel(user)` (name, else e-mail), `findUser(users, id)`.
- `src/components/UserAvatar.tsx`: the picture or letter tile.
- Account pane: `src/features/settings/AccountSection.tsx` (see [settings](settings.md)).

- `UserMark({ user, size })`: small avatar + `userLabel`, for "by" lines (item footer, description history).

## Gotchas

- `me.dev_identities` is non-null only on dev/test servers (no Access): no "Log out" there.
- 401 handling lives in `src/lib/api/authReload.ts` (see [api](api.md)).
- Dev/test user switcher (F-027 W7): `src/features/settings/DevUserSwitcher.tsx`, shown in the Account pane only when `me.dev_identities` is a non-empty array. Choosing an identity calls `switchDevUser` (`src/lib/devUser.ts`): it writes the `dev_user` cookie (`encodeURIComponent` e-mail, `Path=/`, `SameSite=Lax`, 30 days) and reloads. Never gated on `import.meta.env.DEV`; the prod backend never sends identities.
