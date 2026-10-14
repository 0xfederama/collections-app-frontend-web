import { HttpResponse } from 'msw/http'

/** A problem+json error response for `server.use(http.patch(…, () => problemResponse(412, …)))`. */
export function problemResponse(
  status: number,
  code: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  return HttpResponse.json(
    {
      type: `https://collection-app.invalid/problems/${code.replaceAll('_', '-')}`,
      title: code,
      status,
      code,
      ...extra,
    },
    { status, headers: { 'Content-Type': 'application/problem+json', ...headers } },
  )
}
