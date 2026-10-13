import { Link } from 'react-router'

export function NotFoundRoute() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2">
        <Link to="/" className="underline">
          Back to home
        </Link>
      </p>
    </section>
  )
}
