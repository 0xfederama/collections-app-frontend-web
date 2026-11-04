import { Link } from 'react-router'

export function NotFoundRoute() {
  return (
    <section>
      <div className="flex items-center gap-3">
        <h1 className="font-display text-heading">Page not found</h1>
      </div>
      <p className="mt-2">
        <Link to="/" className="text-accent-text underline underline-offset-2">
          Back to home
        </Link>
      </p>
    </section>
  )
}
