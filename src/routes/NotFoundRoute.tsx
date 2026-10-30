import { Link } from 'react-router'

export function NotFoundRoute() {
  return (
    <section>
      <h1 className="font-display text-heading">Page not found</h1>
      <p className="mt-2">
        <Link to="/" className="text-accent-text underline underline-offset-2">
          Back to home
        </Link>
      </p>
    </section>
  )
}
