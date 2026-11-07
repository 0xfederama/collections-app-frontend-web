import { useState } from 'react'
import { cx } from '../lib/cx'
import { Globe } from './ui/icons'

export interface SiteIconProps {
  /** The site's favicon URL, or `null` when there is none (the generic globe). */
  src: string | null
  /** Width and height in px. */
  size?: number
  /** Draw it inside a row tile (the frame and inset of `ServiceIcon`) instead of a bare icon. */
  tile?: boolean
}

/**
 * The icon in front of a website link (roadmap 28). It shows the favicon when it has a URL, and
 * the globe that website tiles already use otherwise, or when the image fails to load. It is
 * decorative: the link carries the name.
 */
export function SiteIcon({ src, size = 16, tile = false }: SiteIconProps) {
  // Remember the URL that failed, not a flag: a different `src` gets its own try.
  const [failed, setFailed] = useState<string | null>(null)
  const url = src !== null && src !== failed ? src : null
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cx(
        'inline-flex shrink-0 items-center justify-center',
        tile && 'rounded-sm border border-border bg-fill p-[18%]',
      )}
    >
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailed(url)}
          className="size-full object-contain"
        />
      ) : (
        <Globe className="size-full text-text-muted" />
      )}
    </span>
  )
}
