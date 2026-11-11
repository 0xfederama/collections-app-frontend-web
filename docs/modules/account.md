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
