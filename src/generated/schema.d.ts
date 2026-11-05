export interface paths {
    "/api/v1/attachments/{id}/file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Download the original image
         * @description A replacement always creates a new attachment ID, so the response is cacheable forever.
         */
        get: operations["getAttachmentFile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/attachments/{id}/thumbnail": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Download the JPEG thumbnail
         * @description Longest side 640 px. Same caching as the original.
         */
        get: operations["getAttachmentThumbnail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/books/suggestions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Suggest book matches
         * @description Searches Open Library using the workspace's `metadata_language` as a language preference. A query that is a bare ISBN (10 or 13 digits, hyphens allowed) searches by ISBN. When book lookup is turned off on the server (`book_lookup_available` is `false` in the settings), returns `{ "available": false, "results": [] }`; this endpoint does not fail merely because lookup is disabled. Results retain Open Library's ranking. `source_id` is the Open Library work id used by item create and `POST /items/{id}/lookup`. `pages` is a median over editions, and `cover_url` is for suggestion display only, not an item image.
         */
        get: operations["searchBookSuggestions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/folders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a folder
         * @description Appended to the end of its siblings. `parent_folder_id` absent or `null` creates it at the root.
         */
        post: operations["createFolder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/folders/order": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Reorder the child folders of a parent
         * @description `ids` must be all active child folders of `parent_folder_id` (`null` = root), in the new order.
         */
        put: operations["reorderFolders"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/folders/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a folder */
        get: operations["getFolder"];
        put?: never;
        post?: never;
        /**
         * Move a folder and its subtree to the trash
         * @description Requires `If-Match` (`"f-N"`).
         */
        delete: operations["deleteFolder"];
        options?: never;
        head?: never;
        /**
         * Rename a folder
         * @description Requires `If-Match` (`"f-N"`).
         */
        patch: operations["updateFolder"];
        trace?: never;
    };
    "/api/v1/folders/{id}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Move a folder under another parent
         * @description Requires `If-Match`. `parent_folder_id: null` moves it to the root.
         */
        post: operations["moveFolder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get an item
         * @description Includes `path` (the ancestor folders and the list).
         */
        get: operations["getItem"];
        put?: never;
        post?: never;
        /**
         * Move an item to the trash
         * @description Requires `If-Match` (`"i-N"`).
         */
        delete: operations["deleteItem"];
        options?: never;
        head?: never;
        /**
         * Update an item
         * @description Requires `If-Match` (`"i-N"`). Any of `title, price, website, metadata`; send `null` to clear a nullable field. `metadata` is validated against the list's type and replaces the stored one. The type cannot be changed here. A new title already used by another item of the list is `409 duplicate_title`.
         */
        patch: operations["updateItem"];
        trace?: never;
    };
    "/api/v1/items/{id}/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the current Markdown content
         * @description Version 0 with an empty body if the item was never saved.
         */
        get: operations["getItemContent"];
        /**
         * Save the Markdown content
         * @description Requires `If-Match` (`"c-N"`, the current content version). The body is at most 1 MiB UTF-8. An identical body returns 200 with the same version. Bumps the item's `updated_at` but not its `version`.
         */
        put: operations["updateItemContent"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items/{id}/content/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Restore an older content version
         * @description Requires `If-Match` (`"c-N"`, the **current** version). Creates a new version with the body of `version` and returns it. 404 if that version was pruned.
         */
        post: operations["restoreContentVersion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items/{id}/content/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the saved content versions
         * @description Newest first, unpaginated (at most 201).
         */
        get: operations["listContentVersions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items/{id}/content/versions/{version}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get one content version (for preview)
         * @description Returns 404 if that version never existed or was pruned. The `ETag` is that version's (`"c-N"`).
         */
        get: operations["getContentVersion"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items/{id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Set the item image (upload or URL)
         * @description Requires `If-Match` (`"i-N"`). Replaces any existing image of either source. Send either `multipart/form-data` with a `file` part (up to 10 MiB, JPEG, PNG or WebP detected by content sniffing, SVG always rejected) or `application/json` `{url}`. Returns the updated item.
         */
        put: operations["setItemImage"];
        post?: never;
        /**
         * Remove the item image
         * @description Requires `If-Match` (`"i-N"`). Returns the updated item.
         */
        delete: operations["deleteItemImage"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items/{id}/lookup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Fill, replace or refresh an item's looked-up metadata
         * @description Requires `If-Match` (`"i-N"`) and is available only for movie, TV and book items (TMDB for movie and TV, Open Library for books). `fill` preserves every non-empty user value and fills empty fields; `rematch` searches from the current title unless `tmdb_id` (movie and TV) or `source_id` (book) selects a suggestion, then replaces the title and all fields fetched from the provider, user edits to those fields included. `refresh` (movie and TV only, otherwise `422 validation_failed`) re-fetches the item's TMDB id, or the `tmdb_id` given, and overwrites the title and every fetched field, user edits included, as the weekly refresh does; a field TMDB no longer returns is removed. An item's `lookup_disabled` flag does not stop an explicit refresh. A refresh that fails changes nothing. All modes preserve an existing item image. A poster or cover is stored through the normal image pipeline only when the item has no image. On a book, `fill` also sets `stores` to `[preferred_store]` (the workspace default store) when `stores` is empty; no mode ever removes or replaces the user's store choices. The default mode is `fill`. When a search has no result, the operation returns the unchanged item and its current ETag. An explicit lookup while the integration is disabled or the provider cannot be reached returns `503 lookup_disabled` or `503 upstream_unavailable` respectively. The server keeps the provenance of imported fields and posters. Movie and TV items are also refreshed from TMDB once a week by the server, which overwrites every fetched field and the title and keeps a user-supplied image; an item's `lookup_disabled` flag stops that refresh. Open Library data is never refreshed: it is kept until the user changes it.
         */
        post: operations["lookupItemMetadata"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items/{id}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Move an item to another list
         * @description Requires `If-Match` (`"i-N"`). Appended to the end of the destination list. A missing or trashed list returns `409 destination_unavailable`. A destination list of another type returns `409 type_mismatch`. A destination list that already has the item's title returns `409 duplicate_title`.
         */
        post: operations["moveItem"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a list
         * @description Appended to the end of its siblings. `folder_id` absent or `null` creates it at the root. A missing or trashed folder returns `409 destination_unavailable`. `type` absent or `null` is a list with no type.
         */
        post: operations["createList"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/order": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Reorder the child lists of a folder
         * @description `ids` must be all active child lists of `folder_id` (`null` = root), in the new order. No `If-Match`.
         */
        put: operations["reorderLists"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a list
         * @description Includes `path` (the ancestor folders).
         */
        get: operations["getList"];
        put?: never;
        post?: never;
        /**
         * Move a list and its items to the trash
         * @description Requires `If-Match` (`"l-N"`).
         */
        delete: operations["deleteList"];
        options?: never;
        head?: never;
        /**
         * Update a list
         * @description Requires `If-Match` (`"l-N"`). Send `description: null` to clear it. Changing `type` clears the `metadata` of all the list's items (and their `price` when the new type has none).
         */
        patch: operations["updateList"];
        trace?: never;
    };
    "/api/v1/lists/{id}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the items of a list
         * @description Sorted by `sort` (default: the list's `sort_mode`), tie-break `id`. `q` filters by title and, on movie lists, director. `price` sorts by `price.min` and is available only when the type allows price. Field filters and `availability` combine with `q` and each other.
         */
        get: operations["listItems"];
        put?: never;
        /**
         * Create an item
         * @description Appended to the end of the list. The item's `type` is the list's type (read-only, not accepted in the body). `metadata` is validated against the list's type. A `price` on a type without a price is `422 validation_failed`. A title already used in the list (trimmed, ignoring case and accents) is `409 duplicate_title`.
         */
        post: operations["createItem"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/{id}/items/order": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Reorder the items of a list
         * @description `ids` must be all active items of the list, in the new order. Allowed regardless of `sort_mode`. No `If-Match`.
         */
        put: operations["reorderListItems"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/{id}/lookup-refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Refresh the TMDB details of a list's movie and TV items
         * @description Refreshes every active movie and TV item of the list that has a TMDB id and is not `lookup_disabled`, one at a time through the server's TMDB pacing, with the weekly refresh's rule: the title and every fetched field are overwritten, user edits included, and a user-supplied image is kept. Books, items without a TMDB id and `lookup_disabled` items are skipped. No `If-Match` is needed: each item is versioned internally, and an item changed during the run is counted as skipped. Answers the counts. Each call refreshes at most 50 items, oldest fetch first; `remaining` counts the eligible items left for later calls, so run again until it is 0. A TMDB rate limit or outage stops the run, and the items not yet refreshed are counted as failed; a failed item keeps its values. Unknown or trashed lists answer 404. TMDB disabled on the server answers `503 lookup_disabled`.
         */
        post: operations["refreshListLookups"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/{id}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Move a list to another folder
         * @description Requires `If-Match` (`"l-N"`). `folder_id: null` moves it to the root. Appended to the end of the new siblings.
         */
        post: operations["moveList"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/recent-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List recently updated items
         * @description Active items across the workspace, most recently updated first (a PATCH or a content save moves an item up), with their paths.
         *     Not paginated: it feeds the Home block.
         */
        get: operations["listRecentItems"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search items by title
         * @description Case-insensitive substring match. Exact matches first, then alphabetical.
         */
        get: operations["searchItems"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get workspace settings
         * @description The settings, including the workspace name.
         */
        get: operations["getSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update workspace settings
         * @description Requires `If-Match` (`"s-N"`). Lowering `markdown_history_limit` prunes on the next save per item, not immediately. `trash_retention_days`: absent = unchanged, `null` = off, otherwise 1 to 365. `preferred_store` is the one default store of the workspace, never null. `owned_streaming_services`: absent = unchanged, `[]` = show every service, otherwise the provider keys of the services the user owns.
         */
        patch: operations["updateSettings"];
        trace?: never;
    };
    "/api/v1/store-providers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the stores a `stores` field can name
         * @description The fixed list of stores (F-016, D-096), in display order (Amazon first; Open Library is not a store since 0.13.0). It does not depend on the workspace.
         */
        get: operations["listStoreProviders"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tmdb/suggestions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Suggest movie or TV matches
         * @description Searches TMDB using the workspace's `metadata_language`. When the server has no TMDB key, returns `{ "available": false, "results": [] }`; this endpoint does not fail merely because lookup is disabled. Results retain TMDB's ranking. Titles are in Latin script: the localized title when it is Latin, else the English title, else the Latin original; a non-Latin title is returned only when TMDB has no Latin form. The returned poster URL is for suggestion display only and is not an item image.
         */
        get: operations["listTmdbSuggestions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trash": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List trash entries
         * @description One entry per user-initiated delete, newest first.
         */
        get: operations["listTrash"];
        put?: never;
        post?: never;
        /**
         * Empty the trash
         * @description Permanently deletes every trash batch and their files, the same as purging each batch. No `If-Match`.
         *     Idempotent: an empty trash also answers 204.
         */
        delete: operations["emptyTrash"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trash/{batch_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Purge a trash batch permanently
         * @description Deletes the subtree and its files. No `If-Match`.
         */
        delete: operations["purgeTrashBatch"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trash/{batch_id}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Restore a trash batch
         * @description No `If-Match`. The body is optional. Without a destination the root returns to its original parent; if that parent is trashed or gone the call returns `409 parent_in_trash` (with `blocking_parent`). With a destination the root is re-parented and appended to the end: `destination.folder_id` for folders and lists (`null` = root), `destination.list_id` for items.
         */
        post: operations["restoreTrashBatch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tree": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the sidebar tree
         * @description All **active** folders and lists, flat and unpaginated. The client builds the tree.
         */
        get: operations["getTree"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the built-in types and their fields */
        get: operations["listTypes"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Liveness probe
         * @description 200 if the process is up.
         */
        get: operations["checkHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/readyz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Readiness probe
         * @description 200 if the database is reachable and `DATA_DIR` is writable, else 503.
         */
        get: operations["checkReadiness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        BlockingParent: {
            id: string;
            name: string;
            type: string;
        };
        BookSuggestion: {
            /** @description The authors joined with a comma; empty when Open Library lists none. */
            authors: string;
            /**
             * Format: uri
             * @description For suggestion display only, not an item image.
             */
            cover_url: string | null;
            /** @description The first 13-digit ISBN of the work's editions, else the first ISBN. */
            isbn: string | null;
            /**
             * Format: int64
             * @description Median number of pages over the work's editions.
             */
            pages: number | null;
            /** @description The Open Library work id. */
            source_id: string;
            title: string;
            /**
             * Format: int64
             * @description First publication year.
             */
            year: number | null;
        };
        BookSuggestions: {
            available: boolean;
            results: components["schemas"]["BookSuggestion"][];
        };
        Content: {
            /** @description Markdown source, up to 1 MiB UTF-8. */
            body: string;
            /** Format: uuid */
            item_id: string;
            /**
             * Format: date-time
             * @description When this version was saved. null for version 0.
             */
            updated_at: string | null;
            /**
             * Format: int64
             * @description 0 = never saved.
             */
            version: number;
        };
        ContentVersionInfo: {
            /** Format: date-time */
            created_at: string;
            /** Format: int64 */
            size_bytes: number;
            /** Format: int64 */
            version: number;
        };
        ContentVersionList: {
            data: components["schemas"]["ContentVersionInfo"][];
        };
        CreateFolderRequest: {
            name: string;
            /** Format: uuid */
            parent_folder_id?: string | null;
        };
        CreateItemRequest: {
            /** @description For movie, TV and book lists, run lookup during creation. Ignored on other types. */
            lookup?: boolean;
            metadata?: {
                [key: string]: unknown;
            };
            price?: components["schemas"]["PriceInput"];
            /** @description Optional selected Open Library work id. Used only when lookup runs on a book item. */
            source_id?: string;
            title?: string;
            /**
             * Format: int64
             * @description Optional selected TMDB suggestion. Used only when lookup runs on a movie or TV item.
             */
            tmdb_id?: number;
            website?: string | null;
        };
        CreateListRequest: {
            description?: string | null;
            display_mode?: string | null;
            /** Format: uuid */
            folder_id?: string | null;
            icon?: string | null;
            icon_color?: string | null;
            name: string;
            sort_mode?: string | null;
            type?: string | null;
        };
        FieldError: {
            field: string;
            message: string;
        };
        Folder: {
            /** Format: date-time */
            created_at: string;
            /** Format: uuid */
            id: string;
            name: string;
            /** Format: uuid */
            parent_folder_id: string | null;
            /** Format: int64 */
            sort_order: number;
            /** Format: date-time */
            updated_at: string;
            /** Format: int64 */
            version: number;
        };
        ImageSummary: {
            /** @description Present for uploads only. */
            thumbnail_url?: string;
            url: string;
        };
        Item: {
            /** Format: int64 */
            content_version: number;
            /** Format: date-time */
            created_at: string;
            /** Format: uuid */
            id: string;
            /** @description An item image, either an external URL or an uploaded attachment. null when the item has no image. */
            image: components["schemas"]["UploadImage"] | components["schemas"]["UrlImage"] | null;
            /** Format: uuid */
            list_id: string;
            /** @description Validated against the list's type; its shape depends on the type. */
            metadata: {
                [key: string]: unknown;
            };
            /** @description Ancestor folders and the list. Present on getItem only. */
            path?: components["schemas"]["PathSegment"][];
            price: components["schemas"]["Price"] | null;
            /** Format: int64 */
            sort_order: number;
            title: string;
            /** @description null when the list has no type. */
            type: string | null;
            /** Format: date-time */
            updated_at: string;
            /** Format: int64 */
            version: number;
            website: string | null;
        };
        ItemPage: {
            data: components["schemas"]["ItemSummary"][];
            page: components["schemas"]["Page"];
        };
        ItemSummary: {
            /** Format: int64 */
            content_version: number;
            /** Format: date-time */
            created_at: string;
            /** Format: uuid */
            id: string;
            image: components["schemas"]["ImageSummary"] | null;
            /** Format: uuid */
            list_id: string;
            metadata: {
                [key: string]: unknown;
            };
            price: components["schemas"]["Price"] | null;
            /** Format: int64 */
            sort_order: number;
            title: string;
            type: string | null;
            /** Format: date-time */
            updated_at: string;
            /** Format: int64 */
            version: number;
            website: string | null;
        };
        List: {
            /** Format: date-time */
            created_at: string;
            description: string | null;
            /** @enum {string} */
            display_mode: "compact" | "thumbnail" | "grid";
            /** Format: uuid */
            folder_id: string | null;
            icon: string | null;
            /** @enum {string|null} */
            icon_color: "red" | "orange" | "amber" | "green" | "teal" | "blue" | "indigo" | "purple" | "pink" | "gray" | null;
            /** Format: uuid */
            id: string;
            /** Format: int64 */
            item_count: number;
            name: string;
            sort_mode: string;
            /** Format: int64 */
            sort_order: number;
            type: string | null;
            /** Format: date-time */
            updated_at: string;
            /** Format: int64 */
            version: number;
        };
        ListLookupRefresh: {
            /**
             * Format: int64
             * @description Refreshes that failed, plus the items not reached after a rate limit or an outage. Their values are unchanged.
             */
            failed: number;
            /**
             * Format: int64
             * @description Eligible items beyond the 50-item batch of this call. Run again to refresh them.
             */
            remaining: number;
            /**
             * Format: int64
             * @description Items not refreshed: books, no TMDB id, lookup_disabled, or changed during the run.
             */
            skipped: number;
            /**
             * Format: int64
             * @description Items refreshed from TMDB.
             */
            updated: number;
        };
        ListWithPath: {
            /** Format: date-time */
            created_at: string;
            description: string | null;
            /** @enum {string} */
            display_mode: "compact" | "thumbnail" | "grid";
            /** Format: uuid */
            folder_id: string | null;
            icon: string | null;
            /** @enum {string|null} */
            icon_color: "red" | "orange" | "amber" | "green" | "teal" | "blue" | "indigo" | "purple" | "pink" | "gray" | null;
            /** Format: uuid */
            id: string;
            /** Format: int64 */
            item_count: number;
            name: string;
            path: components["schemas"]["PathSegment"][];
            sort_mode: string;
            /** Format: int64 */
            sort_order: number;
            type: string | null;
            /** Format: date-time */
            updated_at: string;
            /** Format: int64 */
            version: number;
        };
        LookupItemRequest: {
            /** @description fill (default), rematch, or refresh (movie and TV only). */
            mode?: string;
            /** @description Selects a known Open Library work (book items). Without it, the lookup searches by title. */
            source_id?: string;
            /**
             * Format: int64
             * @description Selects a known TMDB match (movie and TV items). Without it, the lookup searches by title.
             */
            tmdb_id?: number;
        };
        MoveFolderRequest: {
            /** Format: uuid */
            parent_folder_id: string | null;
        };
        MoveItemRequest: {
            /** Format: uuid */
            list_id?: string;
        };
        MoveListRequest: {
            /** Format: uuid */
            folder_id: string | null;
        };
        Page: {
            /** Format: int64 */
            limit: number;
            /** Format: int64 */
            offset: number;
            /**
             * Format: int64
             * @description Total rows matching, ignoring limit and offset.
             */
            total: number;
        };
        PathSegment: {
            /** Format: uuid */
            id: string;
            name: string;
            /** @enum {string} */
            type: "folder" | "list";
        };
        Price: {
            currency: string;
            max: string | null;
            min: string | null;
        };
        PriceInput: {
            amount?: string;
            currency?: string;
            max?: string;
            min?: string;
        };
        /**
         * @description An RFC 9457 problem, the body of every error response. `code` is stable and is one of:
         *
         *     - `malformed_request`: The request cannot be read: a body that is not JSON, a missing or unsupported Content-Type, or a value of the wrong JSON type (400).
         *     - `invalid_parameter`: A path, query or header value does not parse or is out of range (400). `detail` names the parameter.
         *     - `unknown_field`: A body key the schema does not declare (400). `detail` gives its path.
         *     - `precondition_required`: A versioned resource is changed without a usable `If-Match` (428).
         *     - `payload_too_large`: The body is over the limit of the operation (413).
         *     - `unsupported_media_type`: An upload is not JPEG, PNG or WebP (415).
         *     - `not_found`: The resource is missing or trashed, or the endpoint does not exist (404).
         *     - `method_not_allowed`: The path exists but does not accept this method (405).
         *     - `version_conflict`: The `If-Match` version is stale (412). `current_version` is the stored one.
         *     - `validation_failed`: One or more fields break a rule (422). `errors` lists them.
         *     - `cycle_detected`: A folder would be moved into itself or one of its descendants (409).
         *     - `parent_in_trash`: A restore without a destination whose parent is trashed (409). `blocking_parent` names it.
         *     - `destination_unavailable`: A move, restore or create targets a folder or list that is missing or trashed (409).
         *     - `type_mismatch`: An item would move to a list of another type (409).
         *     - `duplicate_title`: An item create, rename or move would repeat a title of the target list, ignoring case, accents and outer spaces (409).
         *     - `order_stale`: A reorder names an id set that no longer matches the stored one (409).
         *     - `lookup_disabled`: A lookup was requested but its integration is not configured on this server (503).
         *     - `upstream_unavailable`: A lookup provider could not be reached or answered in time (503).
         *     - `client_closed_request`: The client closed the request before the answer was ready (499). Logged at DEBUG only.
         *     - `internal`: An unexpected error (500). `request_id` is the only detail; the cause is in the server log.
         *     - `conflict`: Generic 409 for a status Huma reports without detail.
         *     - `precondition_failed`: Generic 412 for a status Huma reports without detail.
         *     - `unprocessable_entity`: Generic 422 for a status Huma reports without detail.
         *     - `service_unavailable`: Generic 503 for a status Huma reports without detail.
         */
        Problem: {
            blocking_parent?: components["schemas"]["BlockingParent"];
            /** @description Stable machine-readable code */
            code: string;
            /** Format: int64 */
            current_version?: number;
            detail?: string;
            errors?: components["schemas"]["FieldError"][] | null;
            request_id?: string;
            /** Format: int64 */
            status: number;
            title: string;
            /** @description Problem type URI */
            type: string;
        };
        RecentItems: {
            data: components["schemas"]["SearchResult"][];
        };
        ReorderFoldersRequest: {
            ids: string[];
            /** Format: uuid */
            parent_folder_id: string | null;
        };
        ReorderItemsRequest: {
            ids?: string[] | null;
        };
        ReorderListsRequest: {
            /** Format: uuid */
            folder_id: string | null;
            ids: string[];
        };
        RestoreContentRequest: {
            /** Format: int64 */
            version: number;
        };
        RestoreDestination: {
            folder_id?: string | null;
            /** Format: uuid */
            list_id?: string;
        };
        RestoreResult: {
            /** Format: uuid */
            root_id: string;
            /** @enum {string} */
            root_type: "folder" | "list" | "item";
        };
        RestoreTrashRequest: {
            /** @description folder_id for a folder or list root (null = workspace root), list_id for an item root. */
            destination?: components["schemas"]["RestoreDestination"];
        };
        SearchPage: {
            data: components["schemas"]["SearchResult"][];
            page: components["schemas"]["Page"];
        };
        SearchPathSegment: {
            icon: string | null;
            /** @enum {string|null} */
            icon_color: "red" | "orange" | "amber" | "green" | "teal" | "blue" | "indigo" | "purple" | "pink" | "gray" | null;
            /** Format: uuid */
            id: string;
            name: string;
            /** @enum {string} */
            type: "folder" | "list";
        };
        SearchResult: {
            item: components["schemas"]["ItemSummary"];
            path: components["schemas"]["SearchPathSegment"][];
            /** @description The display name of the built-in type, null when the list has no type. */
            type_name: string | null;
        };
        Settings: {
            /** @description Whether book lookup (Open Library) is available. It needs no key and is always on. */
            readonly book_lookup_available: boolean;
            /** @description Whether this server has TMDB lookup (movies and TV) configured. */
            readonly lookup_available: boolean;
            /** Format: int64 */
            markdown_history_limit: number;
            /** @example it-IT */
            metadata_language: string;
            /** @description Provider keys of the streaming services the user owns; [] shows all. */
            owned_streaming_services: string[];
            /** @enum {string} */
            preferred_store: "amazon" | "bookshop" | "apple_books" | "google_play_books" | "kobo";
            streaming_country_code: string;
            /** Format: int64 */
            trash_retention_days: number | null;
            /** Format: int64 */
            version: number;
            workspace_name: string;
        };
        StoreProvider: {
            /** @description A store key, as a stores field or the preferred_store setting names it. */
            key: string;
            /** @description Display name. */
            name: string;
        };
        StoreProviders: {
            /** @description Every store, in the fixed display order. */
            providers: components["schemas"]["StoreProvider"][] | null;
        };
        TmdbSuggestion: {
            original_title: string;
            overview: string;
            /**
             * Format: uri
             * @description For suggestion display only, not an item image.
             */
            poster_url: string | null;
            title: string;
            /** Format: int64 */
            tmdb_id: number;
            /** Format: int64 */
            year: number | null;
        };
        TmdbSuggestions: {
            available: boolean;
            results: components["schemas"]["TmdbSuggestion"][];
        };
        TrashCounts: {
            /** Format: int64 */
            folders: number;
            /** Format: int64 */
            items: number;
            /** Format: int64 */
            lists: number;
        };
        TrashEntry: {
            counts: components["schemas"]["TrashCounts"];
            /** Format: date-time */
            deleted_at: string;
            former_path: components["schemas"]["PathSegment"][];
            /**
             * Format: uuid
             * @description The trash batch ID.
             */
            id: string;
            /** @description False when the original parent is trashed or gone. */
            restorable_in_place: boolean;
            /** Format: uuid */
            root_id: string;
            root_name: string;
            /** @enum {string} */
            root_type: "folder" | "list" | "item";
        };
        TrashPage: {
            data: components["schemas"]["TrashEntry"][];
            page: components["schemas"]["Page"];
        };
        Tree: {
            folders: components["schemas"]["Folder"][];
            lists: components["schemas"]["List"][];
        };
        TypeDefinition: {
            allows_price: boolean;
            default_icon: string | null;
            default_sort_field: string | null;
            fields: components["schemas"]["TypeField"][];
            key: string;
            name: string;
        };
        TypeField: {
            key: string;
            label: string;
            /** Format: int64 */
            position: number;
            /** @enum {string} */
            type: "text" | "number" | "date" | "boolean" | "link" | "streaming" | "stores";
        };
        UpdateContentRequest: {
            body: string;
        };
        UpdateFolderRequest: {
            name?: string;
        };
        UpdateItemRequest: {
            metadata?: {
                [key: string]: unknown;
            };
            price?: {
                amount?: string;
                currency?: string;
                max?: string;
                min?: string;
            } | null;
            title?: string;
            website?: string | null;
        };
        UpdateListRequest: {
            description?: string | null;
            display_mode?: string;
            icon?: string | null;
            icon_color?: string | null;
            name?: string;
            sort_mode?: string;
            type?: string | null;
        };
        UpdateSettingsRequest: {
            /** Format: int64 */
            markdown_history_limit?: number;
            metadata_language?: string;
            owned_streaming_services?: string[];
            preferred_store?: string;
            streaming_country_code?: string;
            /** Format: int64 */
            trash_retention_days?: number | null;
            workspace_name?: string;
        };
        UploadImage: {
            /** Format: uuid */
            attachment_id: string;
            /** Format: int64 */
            height: number;
            original_filename: string | null;
            /** @enum {string} */
            source: "upload";
            thumbnail_url: string;
            url: string;
            /** Format: int64 */
            width: number;
        };
        UrlImage: {
            /** @enum {string} */
            source: "url";
            url: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getAttachmentFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getAttachmentThumbnail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    searchBookSuggestions: {
        parameters: {
            query: {
                /** @description Title, author or ISBN to search, 1 to 300 characters. */
                q: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookSuggestions"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createFolder: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateFolderRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    ETag?: string;
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Folder"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    reorderFolders: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReorderFoldersRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getFolder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Folder"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteFolder: {
        parameters: {
            query?: never;
            header?: {
                /** @description Folder ETag, "f-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateFolder: {
        parameters: {
            query?: never;
            header?: {
                /** @description Folder ETag, "f-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateFolderRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Folder"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    moveFolder: {
        parameters: {
            query?: never;
            header?: {
                /** @description Folder ETag, "f-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MoveFolderRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Folder"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteItem: {
        parameters: {
            query?: never;
            header?: {
                /** @description Item ETag, "i-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateItem: {
        parameters: {
            query?: never;
            header?: {
                /** @description Item ETag, "i-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateItemRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getItemContent: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateItemContent: {
        parameters: {
            query?: never;
            header?: {
                /** @description Content ETag, "c-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateContentRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    restoreContentVersion: {
        parameters: {
            query?: never;
            header?: {
                /** @description Content ETag of the current version, "c-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RestoreContentRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listContentVersions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContentVersionList"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getContentVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                /** @description Content version number. */
                version: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    setItemImage: {
        parameters: {
            query?: never;
            header?: {
                /** @description Item ETag, "i-N". */
                "If-Match"?: string;
                "Content-Type"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description An absolute http or https URL of at most 2048 characters. */
                    url: string;
                };
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description The image. Its part may carry a filename, which is kept for display.
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteItemImage: {
        parameters: {
            query?: never;
            header?: {
                /** @description Item ETag, "i-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    lookupItemMetadata: {
        parameters: {
            query?: never;
            header?: {
                /** @description Item ETag, "i-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LookupItemRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    moveItem: {
        parameters: {
            query?: never;
            header?: {
                /** @description Item ETag, "i-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MoveItemRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createList: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateListRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    ETag?: string;
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["List"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    reorderLists: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReorderListsRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getList: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListWithPath"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteList: {
        parameters: {
            query?: never;
            header?: {
                /** @description List ETag, "l-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateList: {
        parameters: {
            query?: never;
            header?: {
                /** @description List ETag, "l-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateListRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["List"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listItems: {
        parameters: {
            query?: {
                /** @description Defaults to the list's sort_mode; may be a field key of the list type. */
                sort?: string;
                /** @description Case-insensitive title filter; on movie lists it also matches metadata.director. */
                q?: string;
                /** @description Type field key to filter. Requires value or range parameters matching the field type. */
                filter_field?: string;
                /** @description Text/link substring or boolean (true/false) filter value. */
                filter_value?: string;
                /** @description Inclusive lower bound for number or ISO date field filters. */
                filter_min?: string;
                /** @description Inclusive upper bound for number or ISO date field filters. */
                filter_max?: string;
                /** @description Movie and TV lists only. available: at least one streaming platform on an owned service (any service when settings.owned_streaming_services is empty). included: the same, counting only platforms not paid per title (subscription, free or ads; no rent or buy). */
                availability?: "available" | "included";
                /** @description Page size. */
                limit?: number;
                /** @description Number of rows to skip. */
                offset?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemPage"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateItemRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    ETag?: string;
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    reorderListItems: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReorderItemsRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    refreshListLookups: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListLookupRefresh"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    moveList: {
        parameters: {
            query?: never;
            header?: {
                /** @description List ETag, "l-N". */
                "If-Match"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MoveListRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["List"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listRecentItems: {
        parameters: {
            query?: {
                /** @description Number of items to return. */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecentItems"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    searchItems: {
        parameters: {
            query: {
                /** @description Case-insensitive title substring, 1 to 200 characters. */
                q: string;
                /** @description Page size. */
                limit?: number;
                /** @description Number of rows to skip. */
                offset?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchPage"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSettings: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Settings"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateSettings: {
        parameters: {
            query?: never;
            header?: {
                /** @description Settings ETag, "s-N". */
                "If-Match"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateSettingsRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Settings"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Failed */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Precondition Required */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listStoreProviders: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StoreProviders"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listTmdbSuggestions: {
        parameters: {
            query: {
                /** @description Movie or TV show. */
                type: "movie" | "tv_show";
                /** @description Title to search, 1 to 300 characters. */
                q: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TmdbSuggestions"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listTrash: {
        parameters: {
            query?: {
                /** @description Page size. */
                limit?: number;
                /** @description Number of rows to skip. */
                offset?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrashPage"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    emptyTrash: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    purgeTrashBatch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                batch_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    restoreTrashBatch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                batch_id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["RestoreTrashRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RestoreResult"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getTree: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Tree"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listTypes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TypeDefinition"][] | null;
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    checkHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The process is up. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    checkReadiness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The database answers and `DATA_DIR` is writable. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description The database or `DATA_DIR` is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
        };
    };
}
