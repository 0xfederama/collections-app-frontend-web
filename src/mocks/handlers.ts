import { http, HttpResponse } from 'msw/http'
import { exampleResponses, type ExampleResponse } from './fixtures'

// Stand-in for the two attachment endpoints, whose spec has no example (binary body).
const PLACEHOLDER_IMAGE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#888"/></svg>'

function respond({ status, contentType, body }: ExampleResponse) {
  if (contentType?.startsWith('image/')) {
    return new HttpResponse(PLACEHOLDER_IMAGE, {
      status,
      headers: { 'Content-Type': 'image/svg+xml' },
    })
  }
  if (body === undefined) return new HttpResponse(null, { status })
  if (typeof body === 'string') {
    return new HttpResponse(body, {
      status,
      headers: { 'Content-Type': contentType ?? 'text/plain' },
    })
  }
  return HttpResponse.json(body, { status })
}

// `/api/v1/items/{id}` -> `/api/v1/items/:id`, absolute so Node (tests) and the browser agree.
const toMswPath = (path: string) =>
  `${globalThis.location?.origin ?? ''}${path.replace(/\{(\w+)\}/g, ':$1')}`

/** One stateless handler per spec operation, answering with the spec's first success example. */
export const handlers = Object.values(exampleResponses).map((example) =>
  http[example.method](toMswPath(example.path), () => respond(example)),
)
