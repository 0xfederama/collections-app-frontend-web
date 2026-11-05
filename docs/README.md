# Docs index

- [architecture](architecture.md): Layers, import boundaries (ESLint), size and strictness rules, and where link building lives.
- [api](modules/api.md): Pinned OpenAPI contract, generated types, `lib/api` client, TanStack Query defaults, metadata lookup endpoints and MSW mocks.
- [deploy](modules/deploy.md): Production web image: Caddy static server and `/api` proxy, CSP hash, `npm run docker:build`.
- [health](modules/health.md): Backend readiness probe (`/readyz`), shown in Settings > Connection.
- [lists](modules/lists.md): List view and list icon picker, mark, View options display mode menu, always-visible search, up to three pinned fields, sort, field filters (incl. movie/TV availability) and item rows.
- [quickadd](modules/quickadd.md): Quick add dialog (`N` shortcut, sidebar button): create an item with optional metadata match, website, description and image.
- [search](modules/search.md): Global search dropdown and `/search?q=` results page, including list marks.
- [shell](modules/shell.md): Providers, router, responsive frame (sidebar, rail, detail sheet), phone back chevron on list and item pages, phone scroll and lazy route loading.
- [theme](modules/theme.md): Light, dark and system theme (sidebar footer toggle), Editorial tokens, solid surfaces, type scale and self-hosted fonts.
- [trash](modules/trash.md): Trash page at `/trash`: restore, permanent deletion, empty trash and paginated query.
- [tree](modules/tree.md): Sidebar folder and list tree, list icon create/edit flows, queries, mutations, reorder and list "Refresh details".
- [ui](modules/ui.md): Design-system primitives in `src/components/ui/`, service and link icons, and the `/dev/ui` gallery.
- [items](modules/items.md): Item detail, metadata lookup for new movie, TV and book items, populated in-place fields, description, image dialog including clipboard paste, inline new item, Move and Delete. Duplicate-title (409) messages inline.
- [links](modules/links.md): Pure URL builders: item external links, store links (`amazonDomain`) and streaming search links.
- [markdown](modules/markdown.md): Safe Markdown renderer (`MarkdownView`) and URL policy `sanitizeUrl`.
- [settings](modules/settings.md): `/settings` modal panes: General (Appearance, Collection), Media (incl. default store and owned streaming services) and About (with Connection and Open Library credit).
- [stores](modules/stores.md): Fixed online store list (`useStoreProviders`), store names and the stores field picker.
- [home](modules/home.md): Home at `/`: quick links to every list, "Recently updated" items (D-070), the empty state and the phone root page (Quick add, search, lists, recent items, Settings, Trash).
