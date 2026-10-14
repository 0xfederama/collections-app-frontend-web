import { Link } from 'react-router'
import { ChevronRight } from './icons'

export interface BreadcrumbItem {
  label: string
  /** Omit on the current page (last item). */
  to?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-text-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${index}-${item.label}`} className="flex items-center gap-1">
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="rounded-sm underline-offset-2 hover:text-text hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={last ? 'font-medium text-text' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight aria-hidden className="size-4" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
