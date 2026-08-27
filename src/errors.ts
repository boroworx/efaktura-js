import type { ErrorCodes } from './generated/enums.ts'

/** Shape SEF uses for business errors. Keys arrive PascalCase on the wire. */
export interface SefErrorBody {
  message?: string | null
  fieldName?: string | null
  errorCode?: ErrorCodes | string | null
}

export interface SefErrorInit {
  status: number
  statusText?: string
  url: string
  method: string
  body?: SefErrorBody | null
  raw?: string
  requestId?: string | undefined
}

/**
 * Any non-2xx response from SEF.
 *
 * SEF is inconsistent about error bodies: business errors return
 * `{Message, FieldName, ErrorCode}` but authentication failures return a
 * completely empty body, so `code` and `body` are frequently absent and the
 * message is synthesised from the status.
 */
export class SefError extends Error {
  readonly status: number
  readonly statusText: string
  readonly url: string
  readonly method: string
  /** SEF's `ErrorCode`, when the response carried one. */
  readonly code: ErrorCodes | string | null
  /** The offending field, when SEF named one. */
  readonly fieldName: string | null
  readonly body: SefErrorBody | null
  /** Raw response text, for diagnosing undocumented failures. */
  readonly raw: string | undefined
  /** The idempotency key sent with the request, if any. */
  readonly requestId: string | undefined

  constructor(init: SefErrorInit) {
    const detail = init.body?.message?.trim()
    const code = init.body?.errorCode ?? null
    const parts = [`SEF ${init.method} ${init.url} failed: ${init.status}`]
    if (init.statusText) parts[0] += ` ${init.statusText}`
    if (detail) parts.push(detail)
    if (code) parts.push(`(${code})`)
    if (init.body?.fieldName) parts.push(`[field: ${init.body.fieldName}]`)
    super(parts.join(' — '))
    this.name = new.target.name
    this.status = init.status
    this.statusText = init.statusText ?? ''
    this.url = init.url
    this.method = init.method
    this.code = code
    this.fieldName = init.body?.fieldName ?? null
    this.body = init.body ?? null
    this.raw = init.raw
    this.requestId = init.requestId
  }
}

/** 401/403 — missing, inactive, or wrong-environment API key. */
export class SefAuthError extends SefError {
  constructor(init: SefErrorInit) {
    super(init)
    if (!init.body?.message) {
      // 401 from SEF has an empty body; say something useful instead.
      Object.defineProperty(this, 'message', {
        value:
          `SEF ${init.method} ${init.url} failed: ${init.status} — ` +
          'API key missing, invalid, or not activated. Check that the key is set to ' +
          '"Aktivno" in Podešavanja → API menadžment, and that it belongs to this ' +
          'environment (demo and production keys are not interchangeable).',
        configurable: true,
        writable: true,
      })
    }
  }
}

/** 400/422 — SEF rejected the payload. `code` usually names the rule. */
export class SefValidationError extends SefError {}

/** 429 — throttled. */
export class SefRateLimitError extends SefError {
  /** Seconds to wait, when SEF sent `Retry-After`. */
  readonly retryAfter: number | undefined
  constructor(init: SefErrorInit & { retryAfter?: number | undefined }) {
    super(init)
    this.retryAfter = init.retryAfter
  }
}

/** 5xx — SEF is unwell. Retried automatically before surfacing. */
export class SefServerError extends SefError {}

/** The request never produced a response (network failure, timeout, abort). */
export class SefConnectionError extends Error {
  readonly url: string
  readonly method: string
  override readonly cause: unknown
  constructor(init: { url: string; method: string; cause: unknown }) {
    const reason = init.cause instanceof Error ? init.cause.message : String(init.cause)
    super(`SEF ${init.method} ${init.url} failed: ${reason}`)
    this.name = 'SefConnectionError'
    this.url = init.url
    this.method = init.method
    this.cause = init.cause
  }
}

export function errorForStatus(
  init: SefErrorInit & { retryAfter?: number | undefined },
): SefError {
  if (init.status === 401 || init.status === 403) return new SefAuthError(init)
  if (init.status === 429) return new SefRateLimitError(init)
  if (init.status >= 500) return new SefServerError(init)
  return new SefValidationError(init)
}
