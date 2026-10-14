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
         */
        patch: operations["updateSettings"];
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
         * @description Appended to the end of its siblings. `folder_id` absent or `null` creates it at the root. A missing or trashed folder returns `409 destination_unavailable`.
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
         * @description Requires `If-Match` (`"l-N"`). Send `description: null` to clear it.
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
         * @description Sorted by `sort` (default: the list's `sort_mode`), tie-break `id`. `q` filters by title.
         */
        get: operations["listItems"];
        put?: never;
        /**
         * Create an item
         * @description Appended to the end of the list. `kind` defaults to `generic`. Image and Markdown content are set through their own endpoints
         *     after creation. `metadata` is validated per kind (see the `*Metadata` schemas).
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
         * @description Requires `If-Match` (`"i-N"`). Any of `title, kind, summary, status, price, official_website_url, metadata`; send `null` to clear
         *     a nullable field. If `kind` changes and `metadata` is absent, metadata resets to `{}`. Image changes go through the image endpoints.
         */
        patch: operations["updateItem"];
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
         * @description Requires `If-Match` (`"i-N"`). Appended to the end of the destination list. A missing or trashed list returns `409 destination_unavailable`.
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
        delete?: never;
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
            code: "malformed_request" | "unknown_field" | "invalid_parameter" | "not_found" | "cycle_detected" | "parent_in_trash" | "destination_unavailable" | "order_stale" | "version_conflict" | "payload_too_large" | "unsupported_media_type" | "validation_failed" | "precondition_required" | "internal";
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
        /** @description At least one of `min` and `max` is set when a price exists. `min` must not exceed `max`. */
        Price: {
            /** @example 12.00 */
            min: string | null;
            /** @example 15.00 */
            max: string | null;
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
        Settings: {
            workspace_name: string;
            streaming_country_code: string;
            default_currency: string;
            markdown_history_limit: number;
            version: number;
        };
        UpdateSettingsRequest: {
            workspace_name?: string;
            streaming_country_code?: string;
            default_currency?: string;
            markdown_history_limit?: number;
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
        /** @enum {string} */
        SortMode: "manual" | "title" | "updated";
        List: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            folder_id: string | null;
            name: string;
            description: string | null;
            display_mode: components["schemas"]["DisplayMode"];
            sort_mode: components["schemas"]["SortMode"];
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
            /** Format: uuid */
            folder_id?: string | null;
            description?: string | null;
            display_mode?: components["schemas"]["DisplayMode"];
            sort_mode?: components["schemas"]["SortMode"];
        };
        UpdateListRequest: {
            name?: string;
            description?: string | null;
            display_mode?: components["schemas"]["DisplayMode"];
            sort_mode?: components["schemas"]["SortMode"];
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
        /** @enum {string} */
        ItemKind: "generic" | "movie" | "tv_show" | "motorcycle" | "car" | "camera";
        /** @description Fields shared by every item kind. `kind` and `metadata` are added by the per-kind schemas. */
        ItemBase: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            list_id: string;
            title: string;
            summary: string | null;
            status: string | null;
            image: components["schemas"]["Image"];
            price: components["schemas"]["Price"];
            official_website_url: string | null;
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
        GenericItem: components["schemas"]["ItemBase"] & {
            /** @enum {string} */
            kind: "generic";
            metadata: components["schemas"]["GenericMetadata"];
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "generic";
        };
        MovieItem: components["schemas"]["ItemBase"] & {
            /** @enum {string} */
            kind: "movie";
            metadata: components["schemas"]["MovieMetadata"];
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "movie";
        };
        TvShowItem: components["schemas"]["ItemBase"] & {
            /** @enum {string} */
            kind: "tv_show";
            metadata: components["schemas"]["TvShowMetadata"];
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "tv_show";
        };
        MotorcycleItem: components["schemas"]["ItemBase"] & {
            /** @enum {string} */
            kind: "motorcycle";
            metadata: components["schemas"]["MotorcycleMetadata"];
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "motorcycle";
        };
        CarItem: components["schemas"]["ItemBase"] & {
            /** @enum {string} */
            kind: "car";
            metadata: components["schemas"]["CarMetadata"];
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "car";
        };
        CameraItem: components["schemas"]["ItemBase"] & {
            /** @enum {string} */
            kind: "camera";
            metadata: components["schemas"]["CameraMetadata"];
        } & {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "camera";
        };
        /** @description An item. `metadata` has the shape of its `kind` (discriminated union). */
        Item: components["schemas"]["GenericItem"] | components["schemas"]["MovieItem"] | components["schemas"]["TvShowItem"] | components["schemas"]["MotorcycleItem"] | components["schemas"]["CarItem"] | components["schemas"]["CameraItem"];
        /** @description An item row in lists and search: no `metadata`, and the image is reduced. */
        ItemSummary: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            list_id: string;
            title: string;
            kind: components["schemas"]["ItemKind"];
            summary: string | null;
            status: string | null;
            image: components["schemas"]["ImageSummary"];
            price: components["schemas"]["Price"];
            official_website_url: string | null;
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
            path: components["schemas"]["PathSegment"][];
        };
        SearchPage: {
            data: components["schemas"]["SearchResult"][];
            page: components["schemas"]["Page"];
        };
        CreateItemRequest: {
            title: string;
            /**
             * @description One of the `ItemKind` values; validated in Go.
             * @default generic
             */
            kind: string;
            summary?: string | null;
            status?: string | null;
            price?: components["schemas"]["Price"];
            official_website_url?: string | null;
            /** @description Free-form here because `kind` may be absent. Validated per kind: see the `*Metadata` schemas. */
            metadata?: {
                [key: string]: unknown;
            };
        };
        UpdateItemRequest: {
            title?: string;
            kind?: string;
            summary?: string | null;
            status?: string | null;
            price?: components["schemas"]["Price"];
            official_website_url?: string | null;
            /** @description Free-form here because `kind` may be absent. Validated per kind: see the `*Metadata` schemas. */
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
        Streaming: {
            /** @description ISO 3166-1 alpha-2. */
            country: string;
            /** @description Unique case-insensitively. */
            platforms?: string[];
        };
        /** @description Must be `{}`. */
        GenericMetadata: Record<string, never>;
        MovieMetadata: {
            release_year?: number;
            runtime_minutes?: number;
            imdb_url?: string;
            streaming?: components["schemas"]["Streaming"];
        };
        TvShowMetadata: {
            first_air_year?: number;
            /** @description At least `first_air_year`. Absent = ongoing. */
            end_year?: number;
            seasons?: number;
            imdb_url?: string;
            streaming?: components["schemas"]["Streaming"];
        };
        MotorcycleMetadata: {
            make?: string;
            model?: string;
            model_year?: number;
            /** @description E.g. naked, adventure, sport-touring. */
            segment?: string;
            displacement_cc?: number;
            /** @description One decimal. */
            power_hp?: number;
            /** @description One decimal. */
            torque_nm?: number;
            wet_weight_kg?: number;
            seat_height_mm?: number;
            /** @enum {string} */
            license_class?: "AM" | "A1" | "A2" | "A";
        };
        CarMetadata: {
            make?: string;
            model?: string;
            trim?: string;
            model_year?: number;
            /** @description E.g. hatchback, SUV, estate. */
            body_type?: string;
            /** @enum {string} */
            fuel_type?: "petrol" | "diesel" | "hybrid" | "plugin_hybrid" | "electric" | "lpg" | "cng" | "hydrogen" | "other";
            /** @enum {string} */
            transmission?: "manual" | "automatic";
            /** @description One decimal. */
            power_hp?: number;
            seats?: number;
            /** @description Only allowed when `fuel_type` is `electric` or `plugin_hybrid` (or absent). */
            electric_range_km?: number;
        };
        CameraMetadata: {
            make?: string;
            model?: string;
            release_year?: number;
            /** @enum {string} */
            camera_type?: "mirrorless" | "dslr" | "compact" | "rangefinder" | "medium_format" | "film" | "action" | "other";
            /** @enum {string} */
            sensor_format?: "full_frame" | "aps_c" | "micro_four_thirds" | "one_inch" | "medium_format" | "film_35mm" | "other";
            /** @description One decimal. */
            megapixels?: number;
            /** @description E.g. Sony E, Fujifilm X. */
            lens_mount?: string;
            weight_g?: number;
        };
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
                /** @description Defaults to the list's `sort_mode`. */
                sort?: "manual" | "title" | "updated";
                /** @description Case-insensitive title filter. */
                q?: string;
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
            409: components["responses"]["DestinationUnavailable"];
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
