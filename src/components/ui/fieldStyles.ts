// Shared control styling for TextField, TextArea, Select and Combobox.
export const controlBase =
  'w-full rounded-md border bg-fill text-sm text-text placeholder:text-text-muted transition-colors hover:border-text-muted focus:bg-surface focus-within:bg-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border-strong'

export const controlBorder = (invalid: boolean) =>
  invalid ? 'border-danger' : 'border-border-strong'
