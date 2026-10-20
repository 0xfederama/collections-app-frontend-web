import { useEffect } from 'react'

/** Renders nothing; tells its owner once that the dialog's target is gone. */
export function Vanished({ onGone }: { onGone: () => void }) {
  useEffect(() => onGone(), [onGone])
  return null
}
