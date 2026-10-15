/**
 * One look for the controls of the view-options bar (F008-W6): 36 px high, md radius (concentric with
 * the bar's lg radius minus its 6 px padding), the fill background and no border, like the segmented
 * control. Sort (a Select) and the filter field are overridden to match it in `ListHeader`.
 */
export const toolbarControl =
  'inline-flex h-9 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md bg-fill px-3 text-sm font-medium text-text transition-colors hover:bg-fill-hover disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11'
