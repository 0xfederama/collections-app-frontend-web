/**
 * One look for the controls of the view-options toolbar (F021): 36 px high, md radius, a hairline border
 * on the surface, like the secondary button. The "+ Make this the default sort" button uses it as is.
 */
const controlBase =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface text-ui font-medium text-text transition-colors hover:bg-fill-hover disabled:cursor-not-allowed disabled:opacity-50'

export const toolbarControl = `${controlBase} h-9 px-3 pointer-coarse:min-h-11`

/**
 * The icon-only toolbar buttons (Filter, Sort): the same square as the + New item button (36 px, 44 px
 * on touch), so the row reads as one set of equal controls (F-025 W8).
 */
export const toolbarIconControl = `${controlBase} size-9 shrink-0 pointer-coarse:size-11`
