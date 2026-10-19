export interface paths {
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
    "/api/v1/types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List type definitions and fields */
        get: operations["listTypes"];
        put?: never;
        /** Create a custom type */
        post: operations["createType"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/types/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete a custom type not used by any list */
        delete: operations["deleteType"];
        options?: never;
        head?: never;
        /** Update a custom type */
        patch: operations["updateType"];
        trace?: never;
    };
    "/api/v1/types/{key}/fields": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add a custom field */
        post: operations["createTypeField"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/types/{key}/fields/order": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        get?: never;
        /** Reorder custom fields */
        put: operations["reorderTypeFields"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/types/{key}/fields/{fieldKey}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
                fieldKey: string;
            };
            cookie?: never;
        };
        /** Count item values that deleting a custom field would remove */
        get: operations["previewDeleteTypeField"];
        put?: never;
        post?: never;
        /** Delete a custom field and strip populated values */
        delete: operations["deleteTypeField"];
        options?: never;
        head?: never;
        /** Rename a custom field */
        patch: operations["updateTypeField"];
        trace?: never;
    };
    "/api/v1/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get workspace settings */
        get: operations["getSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update workspace settings
         * @description Requires `If-Match` (`"s-N"`). Lowering `markdown_history_limit` prunes on the next save per item, not immediately.
         *     `trash_retention_days` (F012-B3): absent = unchanged, `null` = off, otherwise 1 to 365. Setting it does not purge at once; the daily job does.
         *     `metadata_language` controls the locale used for lookup suggestions and imported metadata (TMDB; Open Library takes its language part as a preference).
         *     `preferred_store` (F-016, 0.13.0) is the one default store of the workspace: a key from `GET /api/v1/store-providers`, never null, `amazon` by default. A new book gets `stores: [preferred_store]` when the request leaves `stores` unset, and book lookup sets it the same way when the item has no stores yet. An unknown key is `422 validation_failed` on `preferred_store`.
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
         * @description Searches TMDB using the workspace's `metadata_language`. When the server has no TMDB key, returns
         *     `{ "available": false, "results": [] }`; this endpoint does not fail merely because lookup is disabled.
         *     Results retain TMDB's ranking. The returned poster URL is for suggestion display only and is not an item image.
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
    "/api/v1/books/suggestions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Suggest book matches
         * @description Searches Open Library using the workspace's `metadata_language` as a language preference. A query that is a bare ISBN
         *     (10 or 13 digits, hyphens allowed) searches by ISBN. When book lookup is turned off on the server (`book_lookup_available`
         *     is `false` in the settings), returns `{ "available": false, "results": [] }`; this endpoint does not fail merely because
         *     lookup is disabled. Results retain Open Library's ranking. `source_id` is the Open Library work id used by item create and
         *     `POST /items/{id}/lookup`. `pages` is a median over editions, and `cover_url` is for suggestion display only, not an item image.
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
         * @description Appended to the end of its siblings. `parent_folder_id` absent or `null` creates it at the root. A missing or trashed parent returns `409 destination_unavailable`.
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
         * @description `ids` must be **all** active child folders of `parent_folder_id` (`null` = root), in the new order. A set mismatch returns
         *     `409 order_stale`. No `If-Match`. Sibling versions are not bumped.
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
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
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
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Move a folder under another parent
         * @description Requires `If-Match` (`"f-N"`). `parent_folder_id: null` moves it to the root. The folder is appended to the end of the new
         *     siblings and its `version` is bumped. Moving into itself or a descendant returns `409 cycle_detected`; a missing or trashed
         *     destination returns `409 destination_unavailable`.
         */
        post: operations["moveFolder"];
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
         * @description Appended to the end of its siblings. `folder_id` absent or `null` creates it at the root. A missing or trashed folder returns
         *     `409 destination_unavailable`. `type` is required: every item of the list has that type. `description` is Markdown (up to 64 KiB).
         *     `sort_mode` accepts a built-in mode or a field key defined by the list's type. `price` is valid only for types that allow a price.
         *     When omitted, the type's default sort field is used if defined. `icon` and `icon_color` are optional (F012-B1).
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
         * @description `ids` must be **all** active child lists of `folder_id` (`null` = root), in the new order. A set mismatch returns
         *     `409 order_stale`. No `If-Match`.
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
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
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
         * @description Requires `If-Match` (`"l-N"`). Send `description: null` to clear it. `description` is Markdown (up to 64 KiB) and has no version
         *     history: it is edited with the list's `version`. `sort_mode` accepts a built-in mode or a field key defined by the list's type;
         *     `price` is valid only for types that allow a price.
         *
         *     Changing `type` on a list that has items **clears the `metadata` of all its items** (trashed ones too; their `version` is bumped),
         *     because the type fields differ per type. A change **to a type without a price** (any type whose definition does not allow price, such as `movie`, `tv_show`, `book` or `vehicle`) or **to no type** (`null`) also clears the `price` of all its items (trashed ones too) and
         *     turns a stored sort field unavailable on the new type into the new type's default sort field (or `manual` if it has none). Clients should warn first. A type change also resets `pinned_fields` to `null` (unless
         *     the same request sets it, which is then validated against the new type). Send `pinned_fields: null` to reset it to the type default;
         *     absent leaves it unchanged.
         *
         *     `icon` and `icon_color` (F012-B1): send `icon: null` to reset the icon to the default. Changing the icon to an emoji or to `null`
         *     clears `icon_color`, so a PATCH that sends a colour with an emoji icon is rejected (`422 validation_failed`). A PATCH that changes only `icon_color` on a built-in icon is fine.
         */
        patch: operations["updateList"];
        trace?: never;
    };
    "/api/v1/lists/{id}/move": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Move a list to another folder
         * @description Requires `If-Match` (`"l-N"`). `folder_id: null` moves it to the root. Appended to the end of the new siblings.
         *     A missing or trashed destination returns `409 destination_unavailable`.
         */
        post: operations["moveList"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/{id}/items": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        /**
         * List the items of a list
         * @description Sorted by `sort` (default: the list's `sort_mode`), tie-break `id`. `q` filters by title and, on movie lists, director.
         *     `sort` accepts `manual`, `title`, `updated`, `price`, or a field key from the list type. Field values sort by their definition type:
         *     number numerically, date chronologically, text/link case-insensitively, boolean false first; missing or empty values last.
         *     `price` sorts by `price.min` ascending, items without a price last (no currency conversion), and is available only when the type allows price.
         *     A field filter uses `filter_field` with `filter_value` for text/link substring or boolean equality, and `filter_min`/`filter_max`
         *     for inclusive number/date ranges. Field filtering combines with `q`.
         */
        get: operations["listItems"];
        put?: never;
        /**
         * Create an item
         * @description Appended to the end of the list. The item's `type` is the list's type (read-only, not accepted in the body). Image and Markdown
         *     content are set through their own endpoints after creation. `metadata` is validated against the list's type (see the `*Metadata` schemas).
         *     `price` is either `{amount, currency}` (single price) or `{min, max, currency}` (range). A `price` on an item of a type without a price
         *     (a type whose definition does not allow price, such as `movie`, `tv_show`, `book` or `vehicle`, or a list with no type; F009-B1, F-018) is rejected with `422 validation_failed` on `price` (`null` is fine).
         *     For movie, TV and book lists, `lookup` defaults to `true`: the server searches by title and applies the first result. Send `tmdb_id`
         *     (movie and TV) or `source_id` (book) to select a known suggestion; the one that does not fit the list's type is ignored. Send
         *     `lookup: false` to create the item exactly as supplied. Lookup fields are ignored on other types. On a book, a matched work also
         *     sets `stores` to `[preferred_store]` (the workspace default store) when the request leaves `stores` unset; an explicit value wins.
         *     If automatic lookup finds no match, the item is still created unchanged. If lookup was explicitly requested but unavailable, the
         *     request returns `503 lookup_disabled` or `503 upstream_unavailable` and no item is created.
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
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        get?: never;
        /**
         * Reorder the items of a list
         * @description `ids` must be **all** active items of the list, in the new order. Allowed regardless of `sort_mode`. A set mismatch returns
         *     `409 order_stale`. No `If-Match`.
         */
        put: operations["reorderListItems"];
        post?: never;
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
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
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
         * @description Requires `If-Match` (`"i-N"`). Any of `title, price, website, metadata`; send `null` to clear a nullable field. A non-null `price` on an item of a type without a price (`movie`, `tv_show`, `book`, `vehicle`, or a list with no type; F009-B1, F-018) is rejected with `422 validation_failed`. `metadata` is
         *     validated against the list's type and replaces the stored one. The type cannot be changed here (it belongs to the list).
         *     Image changes go through the image endpoints.
         */
        patch: operations["updateItem"];
        trace?: never;
    };
    "/api/v1/items/{id}/lookup": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Fill or replace an item's looked-up metadata
         * @description Requires `If-Match` (`"i-N"`) and is available only for movie, TV and book items (TMDB for movie and TV, Open Library for books).
         *     `fill` preserves every non-empty user value and fills empty fields; `rematch` searches from the current title unless `tmdb_id`
         *     (movie and TV) or `source_id` (book) selects a suggestion, then replaces the title and all fields fetched from the provider;
         *     `refresh` uses the stored `metadata.tmdb_id` or `metadata.openlibrary_id` unless the id is supplied and likewise replaces fetched
         *     fields. All modes preserve an existing item image. A poster or cover is stored through the normal image pipeline only when the item
         *     has no image. On a book, `fill` also sets `stores` to `[preferred_store]` (the workspace default store) when `stores` is empty; no mode ever removes or replaces
         *     the user's store choices. The default mode is `fill`. When a search has no result, the operation returns the unchanged item and its
         *     current ETag. An explicit lookup while the integration is disabled or the provider cannot be reached returns `503 lookup_disabled` or
         *     `503 upstream_unavailable` respectively.
         *     Imported fields and lookup-owned posters retain server-side provenance, for every provider, so that fill, rematch and refresh never
         *     overwrite user edits. TMDB data has a retention rule: maintenance refreshes owned values after five calendar months; at six months, a
         *     value that still cannot be refreshed is removed only when it still equals its imported snapshot. User edits and user-supplied images
         *     are preserved. Poster age is tracked separately from metadata age. An item's `lookup_disabled` flag stops automatic refresh and lets
         *     its owned values expire under the same rules. Open Library data has no retention duty: it is kept until the user changes it.
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
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Move an item to another list
         * @description Requires `If-Match` (`"i-N"`). Appended to the end of the destination list. A missing or trashed list returns
         *     `409 destination_unavailable`. A destination list of another type returns `409 type_mismatch` (two lists with no type match).
         */
        post: operations["moveItem"];
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
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        get?: never;
        /**
         * Set the item image (upload or URL)
         * @description Requires `If-Match` (`"i-N"`). Replaces any existing image of either source. Send **either** `multipart/form-data` with a `file`
         *     field (up to 10 MiB, JPEG/PNG/WebP detected by content sniffing, SVG always rejected) **or** JSON `{ "url": "https://…" }`.
         *     Returns the updated item.
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
    "/api/v1/attachments/{id}/file": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
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
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
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
    "/api/v1/items/{id}/content": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        /**
         * Get the current Markdown content
         * @description Version 0 with an empty body if the item was never saved.
         */
        get: operations["getItemContent"];
        /**
         * Save the Markdown content
         * @description Requires `If-Match` (`"c-N"`, the current content version). The body is at most 1 MiB UTF-8. An identical body returns 200 with the
         *     same version. Bumps the item's `updated_at` but not its `version`.
         */
        put: operations["updateItemContent"];
        post?: never;
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
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
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
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
                /** @description Content version number. */
                version: components["parameters"]["Version"];
            };
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
    "/api/v1/items/{id}/content/restore": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Restore an older content version
         * @description Requires `If-Match` (`"c-N"`, the **current** version). Creates a new version with the body of `version` and returns it.
         *     404 if that version was pruned.
         */
        post: operations["restoreContentVersion"];
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
    "/api/v1/trash/{batch_id}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Trash batch ID (`TrashEntry.id`). */
                batch_id: components["parameters"]["BatchId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Restore a trash batch
         * @description No `If-Match`. The body is optional. Without a destination the root returns to its original parent; if that parent is trashed or
         *     gone the call returns `409 parent_in_trash` (with `blocking_parent`). With a destination the root is re-parented and appended
         *     to the end: `destination.folder_id` for folders and lists (`null` = root), `destination.list_id` for items.
         */
        post: operations["restoreTrashBatch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trash/{batch_id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Trash batch ID (`TrashEntry.id`). */
                batch_id: components["parameters"]["BatchId"];
            };
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
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** @description RFC 9457 problem details. */
        Problem: {
            /** @description URI identifying the problem, e.g. https://collection-app.invalid/problems/version-conflict. */
            type: string;
            title: string;
            status: number;
            detail?: string;
            /**
             * @description Stable machine-readable code.
             * @enum {string}
             */
            code: "malformed_request" | "unknown_field" | "invalid_parameter" | "not_found" | "cycle_detected" | "parent_in_trash" | "destination_unavailable" | "type_mismatch" | "order_stale" | "version_conflict" | "payload_too_large" | "unsupported_media_type" | "validation_failed" | "lookup_disabled" | "upstream_unavailable" | "precondition_required" | "internal";
            /** @description Only on `internal` problems. Matches the `X-Request-Id` header. */
            request_id?: string;
        };
        /** @description `412 version_conflict`. */
        VersionConflictProblem: components["schemas"]["Problem"] & {
            /** @description The resource's current `version`. */
            current_version: number;
        };
        /** @description `422 validation_failed`. */
        ValidationProblem: components["schemas"]["Problem"] & {
            errors: {
                /** @description Dotted path, e.g. `price.max`. */
                field: string;
                message: string;
            }[];
        };
        /** @description `409` from a trash restore. `blocking_parent` is present for `parent_in_trash`. */
        RestoreConflictProblem: components["schemas"]["Problem"] & {
            blocking_parent?: components["schemas"]["PathSegment"];
        };
        Page: {
            limit: number;
            offset: number;
            /** @description Total rows matching, ignoring limit and offset. */
            total: number;
        };
        PathSegment: {
            /** @enum {string} */
            type: "folder" | "list";
            /** Format: uuid */
            id: string;
            name: string;
        };
        /** @description An ancestor of a search result (F012-B1). `icon` and `icon_color` are the list's own (list segments); both are `null` on folder segments. */
        SearchPathSegment: {
            /** @enum {string} */
            type: "folder" | "list";
            /** Format: uuid */
            id: string;
            name: string;
            icon: components["schemas"]["ListIcon"];
            icon_color: components["schemas"]["ListIconColor"];
        };
        /**
         * @description A price in responses: always `min`, `max` and `currency`. A single price has `min` equal to `max`. Money is a decimal string
         *     (D-062). An open range (only one bound) can exist for prices created before 0.3.0.
         */
        Price: {
            /** @example 12.00 */
            min: string | null;
            /** @example 15.00 */
            max: string | null;
            /** @example EUR */
            currency: string;
        } | null;
        /**
         * @description A price in requests, either a single price `{amount, currency}` or a range `{min, max, currency}`. `amount` and `min`/`max`
         *     are mutually exclusive (`422 validation_failed` when mixed); `min` must not exceed `max`; a range needs at least one bound.
         *     `null` clears the price. Money is a decimal string (D-062).
         */
        PriceInput: {
            /**
             * @description Single price. Stored as `min` = `max`.
             * @example 12.00
             */
            amount?: string;
            /** @example 12.00 */
            min?: string | null;
            /** @example 15.00 */
            max?: string | null;
            /** @example EUR */
            currency: string;
        } | null;
        UrlImage: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            source: "url";
            url: string;
        };
        UploadImage: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            source: "upload";
            /** Format: uuid */
            attachment_id: string;
            /** @description Always `/api/v1/attachments/{id}/file`. */
            url: string;
            /** @description Always `/api/v1/attachments/{id}/thumbnail`. */
            thumbnail_url: string;
            width: number;
            height: number;
            original_filename: string | null;
        };
        /** @description An item image, either an external URL or an uploaded attachment. `null` when the item has no image. */
        Image: (components["schemas"]["UrlImage"] | components["schemas"]["UploadImage"]) | null;
        /** @description The image reduced for list rows and search. `thumbnail_url` is present for uploads only. */
        ImageSummary: {
            url: string;
            thumbnail_url?: string;
        } | null;
        /** Format: binary */
        BinaryFile: string;
        TypeField: {
            key: string;
            label: string;
            /** @enum {string} */
            type: "text" | "number" | "date" | "boolean" | "link" | "streaming" | "stores";
            position: number;
            is_locked: boolean;
            version: number;
        };
        TypeDefinition: {
            key: string;
            name: string;
            default_icon?: string | null;
            allows_price: boolean;
            default_sort_field?: string | null;
            default_pinned_fields?: string[] | null;
            is_locked: boolean;
            version: number;
            fields: components["schemas"]["TypeField"][];
        };
        CreateTypeRequest: {
            name: string;
            default_icon?: string | null;
            allows_price?: boolean;
            default_sort_field?: string | null;
            default_pinned_fields?: string[] | null;
        };
        UpdateTypeRequest: {
            name?: string;
            default_icon?: string | null;
            allows_price?: boolean;
            default_sort_field?: string | null;
            default_pinned_fields?: string[] | null;
        };
        CreateTypeFieldRequest: {
            label: string;
            /** @enum {string} */
            type: "text" | "number" | "date" | "boolean" | "link";
        };
        UpdateTypeFieldRequest: {
            label: string;
        };
        ReorderTypeFieldsRequest: {
            keys: string[];
        };
        TypeFieldDeletePreview: {
            /** @description Number of items, including trashed items, with a value for this field. */
            populated_item_count: number;
        };
        Settings: {
            workspace_name: string;
            streaming_country_code: string;
            metadata_language: components["schemas"]["MetadataLanguage"];
            /** @description Whether this server has TMDB lookup (movies and TV) configured. */
            readonly lookup_available: boolean;
            /** @description Whether book lookup (Open Library) is available. It needs no key and is always on. */
            readonly book_lookup_available: boolean;
            markdown_history_limit: number;
            trash_retention_days: number | null;
            preferred_store: components["schemas"]["StoreKey"];
            version: number;
        };
        UpdateSettingsRequest: {
            workspace_name?: string;
            streaming_country_code?: string;
            metadata_language?: components["schemas"]["MetadataLanguage"];
            markdown_history_limit?: number;
            trash_retention_days?: number | null;
            preferred_store?: components["schemas"]["StoreKey"];
        };
        /**
         * @description ISO 639-1 language (`xx`), optionally with an uppercase region (`xx-YY`), passed to TMDB.
         * @example it-IT
         */
        MetadataLanguage: string;
        /**
         * @description A store a `stores` field or the `preferred_store` setting can name (F-016, D-096). Open Library is not a store since 0.13.0. Its display name comes from `GET /api/v1/store-providers`.
         * @enum {string}
         */
        StoreKey: "amazon" | "bookshop" | "apple_books" | "google_play_books" | "kobo";
        StoreProvider: {
            key: components["schemas"]["StoreKey"];
            /** @description Display name. */
            name: string;
        };
        StoreProviders: {
            /** @description Every store, in the fixed display order. */
            providers: components["schemas"]["StoreProvider"][];
        };
        Tree: {
            folders: components["schemas"]["Folder"][];
            lists: components["schemas"]["List"][];
        };
        Folder: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            parent_folder_id: string | null;
            name: string;
            sort_order: number;
            version: number;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        CreateFolderRequest: {
            name: string;
            /** Format: uuid */
            parent_folder_id?: string | null;
        };
        UpdateFolderRequest: {
            name?: string;
        };
        MoveFolderRequest: {
            /**
             * Format: uuid
             * @description `null` = root.
             */
            parent_folder_id: string | null;
        };
        ReorderFoldersRequest: {
            /**
             * Format: uuid
             * @description `null` = root.
             */
            parent_folder_id: string | null;
            ids: string[];
        };
        /** @enum {string} */
        DisplayMode: "compact" | "thumbnail" | "grid";
        /** @description One of `manual`, `title`, `updated`, `price`, or a field key from the list type. The manual order is kept when the mode changes. */
        SortMode: string;
        /**
         * @description The fields a list shows in its rows, in order (F009-B2; replaces the `{under, right}` slots of F-002; up to three since API 0.12.0,
         *     F-016). With one key it sits beside the title. With two, the first sits beside the title and the second at the far right. With three,
         *     the first two sit beside the title and the third at the far right. `null` means the type default. `[]` pins nothing, which is different
         *     from `null`, and a single-element list is valid. Any field defined for the type can be pinned; `price` is also available when the type
         *     allows it. At most 3 unique keys (`422 validation_failed` on `pinned_fields[i]`), else `422`. Changing the list's `type` resets it to `null`.
         * @example [
         *       "release_year",
         *       "runtime_minutes"
         *     ]
         */
        PinnedFields: string[] | null;
        /**
         * @description The icon of a list (F012-B1): an emoji (one grapheme) or `i:<name>` for a built-in icon key. `null` is the default icon.
         *     Lists only. The service checks the value: `422 validation_failed` on `icon` for anything else.
         * @example i:film
         */
        ListIcon: string | null;
        /**
         * @description The colour of a built-in icon, one of ten palette names (F012-B1). `null` is the normal text colour. Allowed only when `icon`
         *     is a built-in icon: `422 validation_failed` on `icon_color` otherwise. It is cleared when the icon changes to an emoji or to `null`.
         * @example indigo
         * @enum {string|null}
         */
        ListIconColor: "red" | "orange" | "amber" | "green" | "teal" | "blue" | "indigo" | "purple" | "pink" | "gray" | null;
        List: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            folder_id: string | null;
            name: string;
            type: components["schemas"]["ItemType"];
            /** @description Markdown, up to 64 KiB (UTF-8 bytes). */
            description: string | null;
            display_mode: components["schemas"]["DisplayMode"];
            sort_mode: components["schemas"]["SortMode"];
            pinned_fields: components["schemas"]["PinnedFields"];
            icon: components["schemas"]["ListIcon"];
            icon_color: components["schemas"]["ListIconColor"];
            sort_order: number;
            /** @description Number of active items. */
            item_count: number;
            version: number;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
            /** @description Ancestor folders. Present on `getList` only. */
            path?: components["schemas"]["PathSegment"][];
        };
        CreateListRequest: {
            name: string;
            type?: components["schemas"]["ItemType"];
            /** Format: uuid */
            folder_id?: string | null;
            /** @description Markdown, up to 64 KiB (UTF-8 bytes). */
            description?: string | null;
            display_mode?: components["schemas"]["DisplayMode"];
            sort_mode?: components["schemas"]["SortMode"];
            pinned_fields?: components["schemas"]["PinnedFields"];
            icon?: components["schemas"]["ListIcon"];
            icon_color?: components["schemas"]["ListIconColor"];
        };
        UpdateListRequest: {
            name?: string;
            type?: components["schemas"]["ItemType"];
            /** @description Markdown, up to 64 KiB (UTF-8 bytes). */
            description?: string | null;
            display_mode?: components["schemas"]["DisplayMode"];
            sort_mode?: components["schemas"]["SortMode"];
            pinned_fields?: components["schemas"]["PinnedFields"];
            icon?: components["schemas"]["ListIcon"];
            icon_color?: components["schemas"]["ListIconColor"];
        };
        MoveListRequest: {
            /**
             * Format: uuid
             * @description `null` = root.
             */
            folder_id: string | null;
        };
        ReorderListsRequest: {
            /**
             * Format: uuid
             * @description `null` = root.
             */
            folder_id: string | null;
            ids: string[];
        };
        /**
         * @description The type of a list: the key of a type defined in the workspace, or `null` for a list with no type (nothing selected; the default
         *     on create). Items have no type of their own: theirs is read-only and derived from their list (`null` for a list with no type). A list
         *     with no type has no custom fields, no price, only the built-in sort modes and no pinned fields; its items' `metadata` is `{}`. Changing the
         *     type of a list that has items (to another type or to/from `null`) clears the `metadata` of all its items.
         */
        ItemType: string | null;
        /** @description Fields shared by every item type. `type` (read-only, derived from the list) and `metadata` are added by the per-type schemas. */
        ItemBase: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            list_id: string;
            title: string;
            image: components["schemas"]["Image"];
            price: components["schemas"]["Price"];
            website: string | null;
            /** @description Current Markdown version (0 = empty). For display only; use the content endpoints to edit. */
            content_version: number;
            sort_order: number;
            version: number;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
            /** @description Ancestor folders and the list. Present on `getItem` only. */
            path?: components["schemas"]["PathSegment"][];
        };
        MovieItem: components["schemas"]["ItemBase"] & {
            /** @enum {string} */
            readonly type: "movie";
            metadata: components["schemas"]["MovieMetadata"];
        };
        TvShowItem: components["schemas"]["ItemBase"] & {
            /** @enum {string} */
            readonly type: "tv_show";
            metadata: components["schemas"]["TvShowMetadata"];
        };
        VehicleItem: components["schemas"]["ItemBase"] & {
            /** @enum {string} */
            readonly type: "vehicle";
            metadata: components["schemas"]["VehicleMetadata"];
        };
        WishlistItem: components["schemas"]["ItemBase"] & {
            /** @enum {string} */
            readonly type: "wishlist";
            metadata: components["schemas"]["WishlistMetadata"];
        };
        /** @description An item. `type` is read-only and derived from the item's list; `metadata` is validated against that workspace type's field definitions. For a type with a `stores` field (F-016, D-096) the response `metadata` also carries a read-only `store_links` object (on the full item and on the rows of list items, search and recent items; since 0.14.0): provider key to URL, one entry per selected store that has a link (built from the item's title and `isbn`, never stored). Links follow the workspace country (`streaming_country_code`): Amazon uses the country's storefront (amazon.it for `IT`, amazon.com for countries without one), Bookshop.org uses its UK site for `GB`, Google Play Books adds the country; other stores are global. Because links are computed on read, changing the country changes them. Sending `store_links` in `metadata` is rejected as an unknown field (`400 unknown_field`, path `metadata.store_links`). A book item also carries the read-only `metadata.openlibrary_id`: it is set by lookup, used by refresh and by clients to build the Open Library link (`https://openlibrary.org/works/<id>`), and must not be edited. The built-in book type has no first publication year (removed in 0.13.0; a suggestion's `year` is display only). */
        Item: components["schemas"]["ItemBase"] & {
            /** @description `null` when the list has no type. */
            readonly type: string | null;
            metadata: {
                [key: string]: unknown;
            };
        };
        /** @description An item row in lists, search and recent items: the same `metadata` object as the full item, including the read-only `store_links` for a type with a `stores` field and the read-only `streaming.platform_links` for a streaming item, and the image is reduced. */
        ItemSummary: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            list_id: string;
            title: string;
            type: components["schemas"]["ItemType"];
            image: components["schemas"]["ImageSummary"];
            price: components["schemas"]["Price"];
            website: string | null;
            /** @description Same object as `metadata` on the full item, with the read-only `store_links` when the type has a `stores` field; its shape depends on `type` (see the `*Metadata` schemas). */
            metadata: {
                [key: string]: unknown;
            };
            content_version: number;
            sort_order: number;
            version: number;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        ItemPage: {
            data: components["schemas"]["ItemSummary"][];
            page: components["schemas"]["Page"];
        };
        SearchResult: {
            item: components["schemas"]["ItemSummary"];
            /** @description The display name from this workspace's type definition, `null` when the list has no type. */
            type_name: string | null;
            path: components["schemas"]["SearchPathSegment"][];
        };
        SearchPage: {
            data: components["schemas"]["SearchResult"][];
            page: components["schemas"]["Page"];
        };
        RecentItems: {
            data: components["schemas"]["SearchResult"][];
        };
        CreateItemRequest: {
            title: string;
            /**
             * @description For movie, TV and book lists, run lookup during creation. Ignored on other types.
             * @default true
             */
            lookup: boolean;
            /** @description Optional selected TMDB suggestion. Used only when lookup runs on a movie or TV item. */
            tmdb_id?: number;
            /** @description Optional selected Open Library work id (from `GET /books/suggestions`). Used only when lookup runs on a book item. */
            source_id?: string;
            price?: components["schemas"]["PriceInput"];
            website?: string | null;
            /** @description Free-form here because its shape depends on the list's type. Validated against that type: see the `*Metadata` schemas. */
            metadata?: {
                [key: string]: unknown;
            };
        };
        UpdateItemRequest: {
            title?: string;
            price?: components["schemas"]["PriceInput"];
            website?: string | null;
            /** @description Free-form here because its shape depends on the list's type. Validated against that type: see the `*Metadata` schemas. */
            metadata?: {
                [key: string]: unknown;
            };
        };
        MoveItemRequest: {
            /** Format: uuid */
            list_id: string;
        };
        ReorderItemsRequest: {
            ids: string[];
        };
        LookupItemRequest: {
            /**
             * @default fill
             * @enum {string}
             */
            mode: "fill" | "rematch" | "refresh";
            /** @description Selects a known TMDB match (movie and TV items). Without it, fill/rematch searches by title and refresh uses stored metadata.tmdb_id. */
            tmdb_id?: number;
            /** @description Selects a known Open Library work (book items). Without it, fill/rematch searches by title and refresh uses stored metadata.openlibrary_id. */
            source_id?: string;
        };
        /** @enum {string} */
        TmdbType: "movie" | "tv_show";
        TmdbSuggestion: {
            tmdb_id: number;
            title: string;
            original_title: string;
            year: number | null;
            /** Format: uri */
            poster_url: string | null;
            overview: string;
        };
        TmdbSuggestions: {
            available: boolean;
            results: components["schemas"]["TmdbSuggestion"][];
        };
        BookSuggestion: {
            /** @description The Open Library work id. */
            source_id: string;
            title: string;
            /** @description The authors joined with a comma; empty when Open Library lists none. */
            authors: string;
            /** @description First publication year. */
            year: number | null;
            /** @description Median number of pages over the work's editions. */
            pages: number | null;
            /** Format: uri */
            cover_url: string | null;
            /** @description The first 13-digit ISBN of the work's editions, else the first ISBN. */
            isbn: string | null;
        };
        BookSuggestions: {
            available: boolean;
            results: components["schemas"]["BookSuggestion"][];
        };
        Streaming: {
            /** @description ISO 3166-1 alpha-2. */
            country: string;
            /** @description Unique case-insensitively. */
            platforms?: string[];
            /** @description Platforms available only through per-title rental or purchase, not subscription, free, or ad-supported offers. Each entry must match (case-insensitively) an entry of `platforms` and is stored with that entry's casing. Unique case-insensitively. Omitted, null or empty means none paid. */
            paid_platforms?: string[];
            /**
             * Format: uri
             * @description The JustWatch page of the title for `country` (an https://www.justwatch.com URL), filled and refreshed by the TMDB lookup with the other imported streaming values and dropped with them when TMDB data expires (D-089). `null` or absent when there is none. Read-only for clients: a `link` sent in a write is ignored (not rejected), and the stored one is kept while `country` is unchanged, so a client can round-trip the whole `streaming` object. Changing the workspace `streaming_country_code` clears every item's link until its next lookup refresh. TMDB attributes this data to JustWatch.
             */
            readonly link?: string | null;
            /** @description Computed on read and never stored (since 0.15.0): maps each name in `platforms` (exactly as stored) to an https URL that opens that streaming service's search for the item's title, so clicking a platform finds the title. Built from the title (URL-escaped) and the platform name; a platform that is not in the server's built-in table has no entry (clients fall back to `link`), and an item with an empty title has none. Present on the full item and on the rows of list items, search and recent items, and identical across them; an empty object when no platform has a link. Read-only: a `platform_links` sent in a write is ignored (not rejected) and never persisted, so a client can round-trip the whole `streaming` object. Changing the item's title changes the links. */
            readonly platform_links?: {
                [key: string]: string;
            };
        };
        MovieMetadata: {
            release_year?: number;
            runtime_minutes?: number;
            /** @description Movie directors joined with a comma when TMDB returns several. */
            director?: string;
            imdb_url?: string;
            streaming?: components["schemas"]["Streaming"];
            /** @description Stored provider identity used by refresh. */
            tmdb_id?: number;
            /** @description Per-item opt-out from automatic TMDB lookup. */
            lookup_disabled?: boolean;
        };
        TvShowMetadata: {
            first_air_year?: number;
            /** @description At least `first_air_year`. Absent = ongoing. */
            end_year?: number;
            seasons?: number;
            episodes_per_season?: number;
            /** @description Average episode duration in minutes. */
            episode_minutes?: number;
            imdb_url?: string;
            streaming?: components["schemas"]["Streaming"];
            /** @description Stored provider identity used by refresh. */
            tmdb_id?: number;
            /** @description Per-item opt-out from automatic TMDB lookup. */
            lookup_disabled?: boolean;
        };
        VehicleMetadata: {
            make?: string;
            model?: string;
            /** @description Labelled Year. */
            model_year?: number;
            /** @description Engine size in cc. */
            displacement_cc?: number;
            /** @description Power in hp, one decimal. */
            power_hp?: number;
        };
        /** @description No type-specific fields. The price is the item's `price` (a wishlist type allows one). */
        WishlistMetadata: Record<string, never>;
        UploadImageRequest: {
            /**
             * Format: binary
             * @description JPEG, PNG or WebP, up to 10 MiB.
             */
            file: string;
        };
        SetImageUrlRequest: {
            /** @description An https URL. */
            url: string;
        };
        Content: {
            /** Format: uuid */
            item_id: string;
            /** @description 0 = never saved. */
            version: number;
            /** @description Markdown source, up to 1 MiB UTF-8. */
            body: string;
            /**
             * Format: date-time
             * @description When this version was saved. `null` for version 0.
             */
            updated_at: string | null;
        };
        UpdateContentRequest: {
            /** @description Up to 1 MiB UTF-8 (the server checks bytes). */
            body: string;
        };
        RestoreContentRequest: {
            version: number;
        };
        ContentVersionInfo: {
            version: number;
            size_bytes: number;
            /** Format: date-time */
            created_at: string;
        };
        ContentVersionList: {
            data: components["schemas"]["ContentVersionInfo"][];
        };
        TrashEntry: {
            /**
             * Format: uuid
             * @description The trash batch ID.
             */
            id: string;
            /** @enum {string} */
            root_type: "folder" | "list" | "item";
            /** Format: uuid */
            root_id: string;
            root_name: string;
            former_path: components["schemas"]["PathSegment"][];
            /** Format: date-time */
            deleted_at: string;
            counts: {
                folders: number;
                lists: number;
                items: number;
            };
            /** @description False when the original parent is trashed or gone. */
            restorable_in_place: boolean;
        };
        TrashPage: {
            data: components["schemas"]["TrashEntry"][];
            page: components["schemas"]["Page"];
        };
        RestoreTrashRequest: {
            /** @description `folder_id` for a folder or list root (`null` = workspace root), `list_id` for an item root. */
            destination?: {
                /** Format: uuid */
                folder_id?: string | null;
                /** Format: uuid */
                list_id?: string;
            };
        };
        RestoreResult: {
            /** @enum {string} */
            root_type: "folder" | "list" | "item";
            /** Format: uuid */
            root_id: string;
        };
    };
    responses: {
        /** @description Malformed JSON, unknown field or invalid path/query parameter */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The resource is missing or trashed */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The destination is the folder itself or a descendant, or is missing or trashed */
        FolderMoveConflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The destination folder or list is missing or trashed */
        DestinationUnavailable: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The destination list is missing or trashed, or has another type than the item's list */
        ItemMoveConflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description `ids` is not exactly the current set of active siblings */
        OrderStale: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The original parent is in the trash (or gone), or the chosen destination is unusable */
        RestoreConflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["RestoreConflictProblem"];
            };
        };
        /** @description `If-Match` is stale */
        VersionConflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["VersionConflictProblem"];
            };
        };
        /** @description JSON body over the route limit, Markdown over 1 MiB, or image over 10 MiB */
        PayloadTooLarge: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description The upload is not a JPEG, PNG or WebP image (SVG is always rejected) */
        UnsupportedMediaType: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description A field rule was violated */
        ValidationFailed: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["ValidationProblem"];
            };
        };
        /** @description An explicit lookup cannot run because lookup is disabled or the upstream service (TMDB or Open Library) is unavailable */
        LookupUnavailable: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description `If-Match` is missing (or `*`) */
        PreconditionRequired: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description Unexpected server error. Never contains SQL, paths or stack traces */
        InternalError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
    };
    parameters: {
        /** @description Resource ID. */
        Id: string;
        /** @description Trash batch ID (`TrashEntry.id`). */
        BatchId: string;
        /** @description Content version number. */
        Version: number;
        /**
         * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
         *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
         * @example "i-7"
         */
        IfMatch: string;
        /** @description Page size. */
        Limit: number;
        /** @description Number of rows to skip. */
        Offset: number;
    };
    requestBodies: never;
    headers: {
        /**
         * @description Typed ETag derived from `version` (`"f-N"`, `"l-N"`, `"i-N"`, `"c-N"`, `"s-N"`). Use it as `If-Match`.
         * @example "i-3"
         */
        ETag: string;
        /**
         * @description URL of the created resource.
         * @example /api/v1/items/7c1e5a10-0000-4000-8000-000000000101
         */
        Location: string;
        /**
         * @description Always `private, max-age=31536000, immutable`.
         * @example private, max-age=31536000, immutable
         */
        ImmutableCacheControl: string;
    };
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    checkHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The process is up */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
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
            /** @description Ready */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Database or storage unavailable */
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
    listTypes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Definitions */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TypeDefinition"][];
                };
            };
        };
    };
    createType: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTypeRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    Location: components["headers"]["Location"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TypeDefinition"];
                };
            };
            400: components["responses"]["BadRequest"];
            409: components["responses"]["FolderMoveConflict"];
            422: components["responses"]["ValidationFailed"];
        };
    };
    deleteType: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            409: components["responses"]["FolderMoveConflict"];
        };
    };
    updateType: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTypeRequest"];
            };
        };
        responses: {
            /** @description Updated */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TypeDefinition"];
                };
            };
            422: components["responses"]["ValidationFailed"];
        };
    };
    createTypeField: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTypeFieldRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TypeField"];
                };
            };
        };
    };
    reorderTypeFields: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReorderTypeFieldsRequest"];
            };
        };
        responses: {
            /** @description Reordered */
            204: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    previewDeleteTypeField: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
                fieldKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deletion preview */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TypeFieldDeletePreview"];
                };
            };
        };
    };
    deleteTypeField: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                key: string;
                fieldKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TypeFieldDeletePreview"];
                };
            };
        };
    };
    updateTypeField: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                key: string;
                fieldKey: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTypeFieldRequest"];
            };
        };
        responses: {
            /** @description Updated */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TypeField"];
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
            /** @description The settings, including the workspace name */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Settings"];
                };
            };
            500: components["responses"]["InternalError"];
        };
    };
    updateSettings: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
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
            /** @description The updated settings */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Settings"];
                };
            };
            400: components["responses"]["BadRequest"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
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
            /** @description The providers */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StoreProviders"];
                };
            };
            500: components["responses"]["InternalError"];
        };
    };
    listTmdbSuggestions: {
        parameters: {
            query: {
                type: components["schemas"]["TmdbType"];
                q: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Ranked suggestions, or an unavailable result when no key is configured */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TmdbSuggestions"];
                };
            };
            400: components["responses"]["BadRequest"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["LookupUnavailable"];
        };
    };
    searchBookSuggestions: {
        parameters: {
            query: {
                q: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Ranked suggestions, or an unavailable result when book lookup is off */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookSuggestions"];
                };
            };
            400: components["responses"]["BadRequest"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["LookupUnavailable"];
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
            /** @description Active folders and lists */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Tree"];
                };
            };
            500: components["responses"]["InternalError"];
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
                    ETag: components["headers"]["ETag"];
                    Location: components["headers"]["Location"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Folder"];
                };
            };
            400: components["responses"]["BadRequest"];
            409: components["responses"]["DestinationUnavailable"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            500: components["responses"]["InternalError"];
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
            /** @description Reordered */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["OrderStale"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            500: components["responses"]["InternalError"];
        };
    };
    getFolder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The folder */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Folder"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalError"];
        };
    };
    deleteFolder: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Moved to the trash */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    updateFolder: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateFolderRequest"];
            };
        };
        responses: {
            /** @description The updated folder */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Folder"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    moveFolder: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MoveFolderRequest"];
            };
        };
        responses: {
            /** @description The moved folder */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Folder"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["FolderMoveConflict"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
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
                    ETag: components["headers"]["ETag"];
                    Location: components["headers"]["Location"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["List"];
                };
            };
            400: components["responses"]["BadRequest"];
            409: components["responses"]["DestinationUnavailable"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            500: components["responses"]["InternalError"];
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
            /** @description Reordered */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["OrderStale"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            500: components["responses"]["InternalError"];
        };
    };
    getList: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The list */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["List"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalError"];
        };
    };
    deleteList: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Moved to the trash */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    updateList: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateListRequest"];
            };
        };
        responses: {
            /** @description The updated list */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["List"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    moveList: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MoveListRequest"];
            };
        };
        responses: {
            /** @description The moved list */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["List"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["DestinationUnavailable"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    listItems: {
        parameters: {
            query?: {
                /** @description Defaults to the list's `sort_mode`; may be a field key of the list type. */
                sort?: string;
                /** @description Case-insensitive title filter; on movie lists it also matches `metadata.director`. */
                q?: string;
                /** @description Type field key to filter. Requires value or range parameters matching the field type. */
                filter_field?: string;
                /** @description Text/link substring or boolean (`true`/`false`) filter value. */
                filter_value?: string;
                /** @description Inclusive lower bound for number or ISO date field filters. */
                filter_min?: string;
                /** @description Inclusive upper bound for number or ISO date field filters. */
                filter_max?: string;
                /** @description Page size. */
                limit?: components["parameters"]["Limit"];
                /** @description Number of rows to skip. */
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of item summaries */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItemPage"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalError"];
        };
    };
    createItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
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
                    ETag: components["headers"]["ETag"];
                    Location: components["headers"]["Location"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["LookupUnavailable"];
        };
    };
    reorderListItems: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReorderItemsRequest"];
            };
        };
        responses: {
            /** @description Reordered */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["OrderStale"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            500: components["responses"]["InternalError"];
        };
    };
    getItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The item */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalError"];
        };
    };
    deleteItem: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Moved to the trash */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    updateItem: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateItemRequest"];
            };
        };
        responses: {
            /** @description The updated item */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    lookupItemMetadata: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LookupItemRequest"];
            };
        };
        responses: {
            /** @description The updated item, or the unchanged item when no result matched */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["LookupUnavailable"];
        };
    };
    moveItem: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MoveItemRequest"];
            };
        };
        responses: {
            /** @description The moved item */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["ItemMoveConflict"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    setItemImage: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["UploadImageRequest"];
                "application/json": components["schemas"]["SetImageUrlRequest"];
            };
        };
        responses: {
            /** @description The updated item */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            415: components["responses"]["UnsupportedMediaType"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    deleteItemImage: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The updated item */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    getAttachmentFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The original image */
            200: {
                headers: {
                    "Cache-Control": components["headers"]["ImmutableCacheControl"];
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": components["schemas"]["BinaryFile"];
                    "image/png": components["schemas"]["BinaryFile"];
                    "image/webp": components["schemas"]["BinaryFile"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalError"];
        };
    };
    getAttachmentThumbnail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The thumbnail */
            200: {
                headers: {
                    "Cache-Control": components["headers"]["ImmutableCacheControl"];
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": components["schemas"]["BinaryFile"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalError"];
        };
    };
    getItemContent: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The current content */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalError"];
        };
    };
    updateItemContent: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateContentRequest"];
            };
        };
        responses: {
            /** @description The saved content */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    listContentVersions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The version list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContentVersionList"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalError"];
        };
    };
    getContentVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
                /** @description Content version number. */
                version: components["parameters"]["Version"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The content of that version */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalError"];
        };
    };
    restoreContentVersion: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description **Required.** The typed ETag of the resource being changed (`"i-7"`, `"c-3"`, …). Declared optional only so the generated server
                 *     does not answer 400 itself: a missing header (or `*`) returns `428 precondition_required`, a stale one `412 version_conflict`.
                 * @example "i-7"
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                /** @description Resource ID. */
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RestoreContentRequest"];
            };
        };
        responses: {
            /** @description The new current content */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            412: components["responses"]["VersionConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            428: components["responses"]["PreconditionRequired"];
            500: components["responses"]["InternalError"];
        };
    };
    searchItems: {
        parameters: {
            query: {
                q: string;
                /** @description Page size. */
                limit?: components["parameters"]["Limit"];
                /** @description Number of rows to skip. */
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of matches with their paths */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchPage"];
                };
            };
            400: components["responses"]["BadRequest"];
            500: components["responses"]["InternalError"];
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
            /** @description The most recently updated items with their paths */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecentItems"];
                };
            };
            400: components["responses"]["BadRequest"];
            500: components["responses"]["InternalError"];
        };
    };
    listTrash: {
        parameters: {
            query?: {
                /** @description Page size. */
                limit?: components["parameters"]["Limit"];
                /** @description Number of rows to skip. */
                offset?: components["parameters"]["Offset"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of trash entries */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrashPage"];
                };
            };
            400: components["responses"]["BadRequest"];
            500: components["responses"]["InternalError"];
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
            /** @description Trash emptied */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            500: components["responses"]["InternalError"];
        };
    };
    restoreTrashBatch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Trash batch ID (`TrashEntry.id`). */
                batch_id: components["parameters"]["BatchId"];
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["RestoreTrashRequest"];
            };
        };
        responses: {
            /** @description Restored */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RestoreResult"];
                };
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["RestoreConflict"];
            413: components["responses"]["PayloadTooLarge"];
            422: components["responses"]["ValidationFailed"];
            500: components["responses"]["InternalError"];
        };
    };
    purgeTrashBatch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Trash batch ID (`TrashEntry.id`). */
                batch_id: components["parameters"]["BatchId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Purged */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            500: components["responses"]["InternalError"];
        };
    };
}
