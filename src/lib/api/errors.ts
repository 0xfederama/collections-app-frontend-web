import type { components } from '../../generated/schema'

type Problem = components['schemas']['Problem']
type ProblemCode = Problem['code']
// The backend may send codes outside the spec enum (D-057), so any string is allowed at runtime.
export type ErrorCode = ProblemCode | 'unknown' | (string & Record<never, never>)
export type FieldError = { field: string; message: string }

/** The server answered with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number
  /** Stable machine-readable code, or `unknown` when the body was not a problem+json document. */
  readonly code: ErrorCode
  readonly title: string
  readonly detail?: string
  /** 412 only: the resource's current `version`, to show in the conflict UI. */
  readonly currentVersion?: number
  /** 422 only. */
  readonly errors?: FieldError[]
  /** From the `X-Request-Id` header (falls back to the problem's `request_id`). */
  readonly requestId?: string
  /** The parsed body: the problem document, or whatever non-problem body came back. */
  readonly raw: unknown

  constructor(init: {
    status: number
    code: ErrorCode
    title: string
    detail?: string
    currentVersion?: number
    errors?: FieldError[]
    requestId?: string
    raw: unknown
  }) {
    super(init.detail ?? init.title)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.title = init.title
    this.detail = init.detail
    this.currentVersion = init.currentVersion
    this.errors = init.errors
    this.requestId = init.requestId
    this.raw = init.raw
  }
}

/** The request never got an answer (server unreachable, connection dropped). Aborts are not wrapped. */
export class NetworkError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('The server could not be reached', options)
    this.name = 'NetworkError'
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const str = (value: unknown) => (typeof value === 'string' ? value : undefined)

/** Builds an ApiError from an error response and its already-read body (JSON-parsed if possible, else text). */
export function toApiError(response: Response, body: unknown): ApiError {
  const requestId = response.headers.get('X-Request-Id') ?? undefined
  if (isRecord(body) && typeof body.code === 'string') {
    const errors = Array.isArray(body.errors) ? (body.errors as FieldError[]) : undefined
    return new ApiError({
      status: response.status,
      code: body.code,
      title: str(body.title) ?? response.statusText,
      detail: str(body.detail),
      currentVersion: typeof body.current_version === 'number' ? body.current_version : undefined,
      errors,
      requestId: requestId ?? str(body.request_id),
      raw: body,
    })
  }
  return new ApiError({
    status: response.status,
    code: 'unknown',
    title: response.statusText || `HTTP ${response.status}`,
    detail: typeof body === 'string' && body ? body : undefined,
    requestId,
    raw: body,
  })
}
