import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { clampSidebarWidth, SIDEBAR_WIDTH } from './useSidebarState'

const KEY_STEP = 16

/**
 * Vertical splitter between the sidebar and the content (WAI-ARIA window splitter): drag it with
 * a pointer, or focus it and use the arrow keys (Home / End jump to the limits).
 */
export function SidebarResizer({
  width,
  onWidthChange,
  controls,
}: {
  width: number
  onWidthChange: (width: number) => void
  controls: string
}) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, startWidth: width }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    onWidthChange(clampSidebarWidth(drag.current.startWidth + event.clientX - drag.current.startX))
  }
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = {
      ArrowLeft: width - KEY_STEP,
      ArrowRight: width + KEY_STEP,
      Home: SIDEBAR_WIDTH.min,
      End: SIDEBAR_WIDTH.max,
    }[event.key]
    if (target === undefined) return
    event.preventDefault()
    onWidthChange(clampSidebarWidth(target))
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-controls={controls}
      aria-valuenow={width}
      aria-valuemin={SIDEBAR_WIDTH.min}
      aria-valuemax={SIDEBAR_WIDTH.max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className="group -ml-1 flex w-2 shrink-0 cursor-col-resize touch-none justify-center"
    >
      <span
        aria-hidden
        className="w-px bg-border transition-colors group-hover:bg-accent group-focus-visible:bg-accent"
      />
    </div>
  )
}
