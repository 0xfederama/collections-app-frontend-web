/**
 * The offer to save the chosen sort as the list's default (D-063), on its own line under the
 * toolbar and drawn like the applied filter chips, so the one-row toolbar (F-025) never wraps.
 */
export function DefaultSortChip({
  label,
  onClick,
  pending,
}: {
  label: string
  onClick: () => void
  pending: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex max-w-full items-center rounded-full border border-accent-tint bg-accent-tint px-3 py-0.5 text-left text-ui text-accent-text hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-focus-ring disabled:opacity-60 pointer-coarse:py-1.5"
    >
      Make “{label}” the default sort for this list
    </button>
  )
}
