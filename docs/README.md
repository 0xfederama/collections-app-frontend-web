# Docs index

- [api](modules/api.md): Vendored OpenAPI contract, generated types, `lib/api` client, TanStack Query defaults and MSW mocks.
- [deploy](modules/deploy.md): Production web image: Caddy static server and `/api` proxy, CSP hash, `npm run docker:build`.
- [health](modules/health.md): Backend readiness probe (`/readyz`), shown in Settings > Connection.
- [lists](modules/lists.md): List view at `/lists/:listId`: title, in-place description, "…" menu (Kind), display modes, pinned fields, sort, title filter, drag reorder, inline new item.
- [quickadd](modules/quickadd.md): Quick add dialog (`N` shortcut, top-bar button): create an item with optional website, description and image.
- [search](modules/search.md): Global search: sidebar combobox dropdown (top 8), `/search?q=` results page, search queries and dev fake.
- [shell](modules/shell.md): Providers, router, responsive frame (drawer, rail, frosted sidebar, detail sheet) and lazy route loading.
- [theme](modules/theme.md): Light, dark and system theme (sidebar footer toggle), Frosted Gallery tokens, materials and system fonts.
- [trash](modules/trash.md): Trash page at `/trash`: restore in place or to a destination, delete permanently, trash query and mutations.
- [tree](modules/tree.md): Sidebar folder and list tree, its query and index, expanded state, folder and list writes (dialogs, menus, reorder).
- [ui](modules/ui.md): Design-system primitives in `src/components/ui/`, service and link icons, and the `/dev/ui` gallery.
- [items](modules/items.md): Item detail at `/lists/:listId/items/:itemId`: title block, icon links, in-place field and description editing, image dialog, inline new item, Move and Delete.
- [markdown](modules/markdown.md): Safe Markdown renderer (`MarkdownView`) and URL policy `sanitizeUrl`.
- [settings](modules/settings.md): `/settings`: the workspace form (If-Match snapshot, 412 and 422 handling, unsaved guard) and Connection.
- [home](modules/home.md): Home at `/`: quick links to every list, "Recently updated" items (D-070) and the empty state.
