import { useSearchParams } from 'react-router'

/** `/search?q=`. W-11 builds the results here. */
export function SearchRoute() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  return (
    <section>
      <h1 className="font-display text-2xl font-semibold">Search</h1>
      <p className="mt-2 text-sm text-text-muted">
        {q ? `Results for “${q}” arrive with W-11.` : 'Search results arrive with W-11.'}
      </p>
    </section>
  )
}
