# quickadd

## Purpose

Quick add (F-002): one dialog to create an item from anywhere: a title, destination list and optional metadata match (TMDB picker for movie and TV, Open Library lookup on commit for books), nothing else: since web 2.29.2 the website, description and image are added on the item page. It replaced the old "Add item" dialog. Spec: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `index.ts`: public face (`useQuickAdd`, `QuickAddProvider`).
- `QuickAddProvider.tsx`: mounted once in `AppShell`; owns the dialog, the `N` shortcut and `open()`.
- `QuickAddContext.tsx`: `QuickAddContext`, `useQuickAdd()`.
- `QuickAddDialog.tsx`: the form, title suggestions, validation, create submit and navigation to the new item (not on phones).
- `model.ts`: pure form model (`QuickAddInput`, error `Field`); `ListPicker.tsx` ("In [list]", `useListChoices`); `QuickAddFooter.tsx` (lookup status, errors, buttons).
- `QuickAdd.test.tsx`: shortcut and submit tests.

## Interfaces

- `QuickAddProvider({ children })`: context provider plus the dialog; mounted by `layouts/AppShell.tsx`.
- `useQuickAdd(): { open(listId?) }`: opens the dialog; the sidebar "Quick add" button calls it. A list's "New item" uses the inline draft instead (see [items](items.md)).
- `QuickAddDialog({ initialListId?, onClose })`: rendered by the provider only while open.

## Gotchas

- `N` opens it unless focus is in a field, a modifier is held, a key repeats, or another dialog is open.
- Destination default: the `listId` passed to `open()`, else the open list, else the most recently updated list.
- Enter in a text field adds; Esc cancels.
- Phones (< 768 px): the user stays on the current page after a create; the toast's "Open" action opens the item. The toast is `ADDED_TOAST` (3 s, replaces the previous "Added" toast).
- Create errors: 422 maps to the title field (other messages go to the banner); 409 `duplicate_title` shows inline under the title (text kept, dialog stays open; `describeCreateFailure(caught, listType)`); other 409 means the list is gone or in Trash; network or 5xx says nothing was created.
- Client checks (title blank or over the length limit, no list) run before the request.
- No type is chosen here: the item takes the list's type.
- Title suggestions (`TitleLookupField`) come from TMDB for movie and TV only, when the server reports it available; selecting one creates the item with the suggested title and `tmdb_id` (see `items/lookup.ts`). Books have no picker: the title is a plain input and Enter posts `lookup: true` without `source_id`; while the create is pending a `role="status"` line ("Looking up details…") shows and Add stays pending, then the dialog closes and opens the item. Typing a title and pressing Enter keeps the existing submit behavior.
- If lookup becomes unavailable during creation, the dialog preserves the typed title and offers retrying lookup or creating without metadata.
