import { cx } from '../../lib/cx'

/** Loading placeholder shaped like the final content. Size it with className. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-sm bg-fill-hover', className)} />
}
