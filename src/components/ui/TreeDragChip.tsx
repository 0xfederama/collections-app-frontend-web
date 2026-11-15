/** The label that follows the pointer during a tree drag (the row itself stays where it is). */
export function TreeDragChip({ point, label }: { point: { x: number; y: number }; label: string }) {
  return (
    <div
      aria-hidden
      data-tree-drag-chip
      style={{ left: `${point.x + 14}px`, top: `${point.y + 10}px` }}
      className="pointer-events-none fixed z-50 max-w-56 truncate rounded-md bg-surface-raised px-2 py-1 text-ui text-text shadow-md"
    >
      {label}
    </div>
  )
}
