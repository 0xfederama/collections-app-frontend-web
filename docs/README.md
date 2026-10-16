# Docs index

- [api](modules/api.md): Pinned OpenAPI contract, generated types, `lib/api` client, TanStack Query defaults and MSW mocks.
- [deploy](modules/deploy.md): Production web image: Caddy static server and `/api` proxy, CSP hash, `npm run docker:build`.
- [health](modules/health.md): Backend readiness probe (`/readyz`), shown in Settings > Connection.
- [lists](modules/lists.md): List view and list icon picker, mark, display modes, pinned fields, sort and item rows.
- [quickadd](modules/quickadd.md): Quick add dialog (`N` shortcut, top-bar button): create an item with optional website, description and image.
- [search](modules/search.md): Global search dropdown and `/search?q=` results page, including list marks.
- [shell](modules/shell.md): Providers, router, responsive frame (drawer, rail, frosted sidebar, detail sheet) and lazy route loading.
- [theme](modules/theme.md): Light, dark and system theme (sidebar footer toggle), Frosted Gallery tokens, materials and system fonts.
- [trash](modules/trash.md): Trash page at `/trash`: restore, permanent deletion, empty trash and paginated query.
- [tree](modules/tree.md): Sidebar folder and list tree, list icon create/edit flows, queries, mutations and reorder.
- [ui](modules/ui.md): Design-system primitives in `src/components/ui/`, service and link icons, and the `/dev/ui` gallery.
- [items](modules/items.md): Item detail, in-place fields and description, image dialog including clipboard paste, inline new item, Move and Delete.
- [markdown](modules/markdown.md): Safe Markdown renderer (`MarkdownView`) and URL policy `sanitizeUrl`.
- [settings](modules/settings.md): `/settings`: workspace form, immediate trash-retention choice and Connection.
- [home](modules/home.md): Home at `/`: quick links to every list, "Recently updated" items (D-070) and the empty state.
