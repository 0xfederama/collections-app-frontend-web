import type { ComponentProps } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cx } from '../../lib/cx'
import { sanitizeUrl } from './sanitizeUrl'

type Tag = 'a' | 'img' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
type Props<T extends Tag> = Omit<ComponentProps<T>, 'node'> & { node?: unknown }

// The page's own title is the h1 and the detail has section headings, so the description's
// headings start at h3.
const heading =
  (Tag: 'h3' | 'h4' | 'h5' | 'h6', className: string) =>
  ({ node, ...props }: Props<'h1'>) => {
    void node
    return <Tag className={className} {...props} />
  }

const components = {
  h1: heading('h3', 'mt-4 mb-2 text-section font-semibold'),
  h2: heading('h3', 'mt-4 mb-2 text-section font-semibold'),
  h3: heading('h4', 'mt-3 mb-1 font-semibold'),
  h4: heading('h5', 'mt-3 mb-1 font-semibold'),
  h5: heading('h6', 'mt-3 mb-1 text-ui font-semibold'),
  h6: heading('h6', 'mt-3 mb-1 text-ui font-semibold'),
  a: ({ node, href, ...props }: Props<'a'>) => {
    void node
    // A link the sanitizer emptied is shown as plain text, not as a dead anchor.
    if (!href) return <span>{props.children}</span>
    return (
      // eslint-disable-next-line jsx-a11y/anchor-has-content -- the link text arrives in props.children (spread below from react-markdown), not as JSX children
      <a
        {...props}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-text underline underline-offset-2"
      />
    )
  },
  img: ({ node, src, alt, ...props }: Props<'img'>) => {
    void node
    if (!src) return null
    return (
      <img
        {...props}
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="my-2 h-auto max-w-full rounded-md"
      />
    )
  },
}

/**
 * Renders Markdown source (item descriptions; W-10 reuses it for Preview). Safe by construction:
 * raw HTML is dropped (`skipHtml`, no `rehype-raw`), every link and image URL goes through
 * `sanitizeUrl`, links open in a new tab with `noopener noreferrer`, images send no referrer.
 * GFM adds tables, strikethrough, task lists and autolinks.
 */
export function MarkdownView({ source, className }: { source: string; className?: string }) {
  return (
    <div
      className={cx(
        'text-body break-words [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-text-muted [&_code]:rounded-sm [&_code]:bg-border [&_code]:px-1 [&_code]:text-ui [&_hr]:my-4 [&_hr]:border-border [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-border [&_pre]:p-3 [&_pre_code]:bg-transparent [&_table]:my-2 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={sanitizeUrl}
        components={components}
      >
        {source}
      </Markdown>
    </div>
  )
}
