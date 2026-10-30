// Shared control styling for TextField, TextArea, Select and Combobox.
export const controlBase =
  'w-full rounded-md border bg-surface text-ui text-text placeholder:text-text-muted transition-colors hover:border-text-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border-strong'

// Invalid: danger. Otherwise the strong border: an input's edge is the only cue that it is a field,
// so it must reach 3:1 on the page (the `border-border` hairline does not, see tokens.css).
export const controlBorder = (invalid: boolean) =>
  invalid ? 'border-danger' : 'border-border-strong'
