# quickadd

## Purpose

Quick add (F-002): one dialog to create an item from anywhere: a title, a destination list and optionally a website, a Markdown description and an image. It replaced the old "Add item" dialog. Spec: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `src/features/quickadd/QuickAddProvider.tsx`: mounted once in `AppShell`; owns the dialog, the `N` shortcut and `open()`.
- `QuickAddContext.tsx`: `QuickAddContext`, `useQuickAdd()`.
- `QuickAddDialog.tsx`: the form, validation, create-then-attach submit and navigation to the new item.
- `QuickAdd.test.tsx`: shortcut and submit tests.

## Interfaces

- `QuickAddProvider({ children })`: context provider plus the dialog; mounted by `layouts/AppShell.tsx`.
- `useQuickAdd(): { open(listId?) }`: opens the dialog; the sidebar "Quick add" button and `ListView` "Add item" call it.
- `QuickAddDialog({ initialListId?, onClose })`: rendered by the provider only while open.

## Gotchas

- `N` opens it unless focus is in a field, a modifier is held, a key repeats, or another dialog is open.
- Destination default: the `listId` passed to `open()`, else the open list, else the most recently updated list.
- Enter in a text field or Ctrl/Cmd+Enter adds; Esc cancels.
- The item is created first. The description and the image are separate requests after it; if one fails, the item still opens and a toast names what failed.
- Create errors: 422 maps to the title or website field; 409 means the list is gone or in Trash; network or 5xx says nothing was created.
- Client checks (image type and size, length limits) run before the request.
- No kind is chosen here: the item takes the list's kind.
