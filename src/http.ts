import { operations, type OperationDef, type OperationKey } from './generated/operations.ts'
import {
  SefConnectionError,
  errorForStatus,
  type SefErrorBody,
} from './errors.ts'

export const ENVIRONMENTS = {
  production: 'https://efaktura.mfin.gov.rs',
  demo: 'https://demoefaktura.mfin.gov.rs',
} as const

export type SefEnvironment = keyof typeof ENVIRONMENTS

export interface SefClientOptions {
  /** API key from Podešavanja → API menadžment. Demo and production differ. */
  apiKey: string
  /** Defaults to `'production'`. Ignored when `baseUrl` is given. */
  environment?: SefEnvironment
  /** Override the base URL entirely (useful for a proxy or a mock server). */
  baseUrl?: string
  /** Per-request timeout in ms. Default 60_000. `0` disables. */
  timeout?: number
  /** Retry attempts after the first try, for 429/5xx/network errors. Default 3. */
  maxRetries?: number
  /** Base delay in ms for exponential backoff. Default 500. */
  retryDelay?: number
  /** Swap in a custom fetch (tests, proxies, instrumentation). */
  fetch?: typeof globalThis.fetch
  /** Extra headers merged into every request. */
  headers?: Record<string, string>
  /**
   * Client-side pacing, requests per second. Default 3, which is SEF's
   * documented server-side limit. Set to `0` to disable.
   */
  requestsPerSecond?: number
}

export interface RequestOptions {
  signal?: AbortSignal
  /** Overrides the client-level timeout for this call. */
  timeout?: number
  headers?: Record<string, string>
}

type QueryValue = string | number | boolean | Date | null | undefined

export interface CallArgs {
  path?: Record<string, string | number>
  query?: Record<string, QueryValue>
  body?: unknown
}

/**
 * SEF returns JSON with PascalCase keys (`"InvoiceId"`) but accepts camelCase
 * on the way in, and its own OpenAPI spec describes everything camelCase.
 *
 * Every one of the 501 property names in the spec is camelCase and none begins
 * with a multi-capital run, so lowercasing only the first character is an exact
 * inverse — and a no-op if SEF ever starts replying in camelCase.
 */
export function normalizeKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map(normalizeKeys) as T
  if (value === null || typeof value !== 'object') return value
  // Leave non-plain objects (Date, Uint8Array, ...) alone.
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return value
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key.charAt(0).toLowerCase() + key.slice(1)] = normalizeKeys(v)
  }
  return out as T
}

function serializeQuery(query: Record<string, QueryValue> | undefined, allowed: readonly string[]): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (!allowed.includes(key)) {
      throw new TypeError(
        `Unknown query parameter '${key}'. This operation accepts: ${allowed.join(', ') || '(none)'}`,
      )
    }
    params.set(key, value instanceof Date ? value.toISOString() : String(value))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

function buildPath(op: OperationDef, path: Record<string, string | number> | undefined): string {
  return op.path.replace(/\{(.+?)\}/g, (_, name: string) => {
    const value = path?.[name]
    if (value === undefined || value === null || value === '') {
      throw new TypeError(`Missing path parameter '${name}' for ${op.method} ${op.path}`)
    }
    return encodeURIComponent(String(value))
  })
}

function encodeBody(op: OperationDef, body: unknown): { body: BodyInit | undefined; type?: string } {
  if (op.body === 'none' || body === undefined || body === null) return { body: undefined }
  if (op.body === 'json') return { body: JSON.stringify(body), type: 'application/json' }
  if (op.body === 'xml') {
    if (typeof body !== 'string' && !(body instanceof Uint8Array)) {
      throw new TypeError(`${op.method} ${op.path} expects a UBL XML string`)
    }
    // Content-Type must be application/xml — SEF answers 415 without it.
    return { body: body as BodyInit, type: 'application/xml' }
  }
  // multipart: let the runtime set the boundary, so no explicit Content-Type.
  const form = new FormData()
  const field = op.bodyPart ?? 'file'
  if (body instanceof Blob) {
    form.set(field, body, (body as File).name ?? 'invoice.xml')
  } else if (typeof body === 'string' || body instanceof Uint8Array) {
    form.set(field, new Blob([body as BlobPart], { type: 'text/xml' }), 'invoice.xml')
  } else if (body instanceof FormData) {
    return { body }
  } else {
    throw new TypeError(`${op.method} ${op.path} expects a string, Uint8Array, Blob, or FormData`)
  }
  return { body: form }
}

/** Parse `Retry-After` (delta-seconds or HTTP-date) into milliseconds. */
function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(header)
  if (Number.isFinite(date)) return Math.max(0, date - Date.now())
  return undefined
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })

/**
 * SEF enforces a hard limit of 3 requests per second (in force since
 * 2023-01-01) and answers 429 above it. The limit is not in the OpenAPI spec
 * and no `X-RateLimit-*` headers are sent, so the client paces itself.
 */
class RateLimiter {
  #capacity: number
  #tokens: number
  #refillPerMs: number
  #last = Date.now()
  #queue: Array<{ resolve: () => void; cancelled: boolean }> = []
  #draining = false

  constructor(perSecond: number) {
    this.#capacity = Math.max(1, perSecond)
    this.#tokens = this.#capacity
    this.#refillPerMs = perSecond / 1000
  }

  #refill() {
    const now = Date.now()
    this.#tokens = Math.min(this.#capacity, this.#tokens + (now - this.#last) * this.#refillPerMs)
    this.#last = now
  }

  /**
   * Wait for a slot. Passing the caller's signal lets a cancelled request give
   * up its place instead of holding one: without it, an aborted request still
   * waits its turn and spends a token, delaying live requests behind it.
   */
  async acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw signal.reason
    this.#refill()
    if (this.#tokens >= 1 && this.#queue.length === 0) {
      this.#tokens -= 1
      return
    }
    await new Promise<void>((resolve, reject) => {
      const entry = { resolve, cancelled: false }
      this.#queue.push(entry)
      signal?.addEventListener(
        'abort',
        () => {
          entry.cancelled = true
          reject(signal.reason)
        },
        { once: true },
      )
      this.#drain()
    })
  }

  #drain() {
    if (this.#draining) return
    this.#draining = true
    const step = () => {
      this.#refill()
      while (this.#tokens >= 1 && this.#queue.length) {
        const entry = this.#queue.shift()!
        // A cancelled waiter is dropped without spending its token.
        if (entry.cancelled) continue
        this.#tokens -= 1
        entry.resolve()
      }
      // Trailing cancelled waiters would otherwise keep the timer alive.
      while (this.#queue.length && this.#queue[0]!.cancelled) this.#queue.shift()
      if (this.#queue.length) {
        setTimeout(step, Math.ceil((1 - this.#tokens) / this.#refillPerMs) || 1)
      } else {
        this.#draining = false
      }
    }
    step()
  }
}

export class SefHttp {
  readonly baseUrl: string
  readonly #apiKey: string
  readonly #timeout: number
  readonly #maxRetries: number
  readonly #retryDelay: number
  readonly #fetch: typeof globalThis.fetch
  readonly #headers: Record<string, string>
  readonly #limiter: RateLimiter | undefined

  constructor(options: SefClientOptions) {
    if (!options?.apiKey) throw new TypeError('apiKey is required')
    this.#apiKey = options.apiKey
    this.baseUrl = (options.baseUrl ?? ENVIRONMENTS[options.environment ?? 'production']).replace(/\/+$/, '')
    this.#timeout = options.timeout ?? 60_000
    this.#maxRetries = options.maxRetries ?? 3
    this.#retryDelay = options.retryDelay ?? 500
    this.#fetch = options.fetch ?? globalThis.fetch
    this.#headers = options.headers ?? {}
    const rps = options.requestsPerSecond ?? 3
    this.#limiter = rps > 0 ? new RateLimiter(rps) : undefined
    if (typeof this.#fetch !== 'function') {
      throw new TypeError('No global fetch available; pass options.fetch')
    }
  }

  /** Invoke a generated operation by key. */
  async call<T = unknown>(key: OperationKey, args: CallArgs = {}, options: RequestOptions = {}): Promise<T> {
    const op: OperationDef = operations[key]
    const url =
      this.baseUrl + buildPath(op, args.path) + serializeQuery(args.query, op.query)
    const encoded = encodeBody(op, args.body)

    const headers: Record<string, string> = {
      ApiKey: this.#apiKey,
      Accept: op.response === 'binary' ? '*/*' : 'application/json',
      ...this.#headers,
      ...options.headers,
    }
    if (encoded.type) headers['Content-Type'] = encoded.type

    const requestId = typeof args.query?.['requestId'] === 'string' ? args.query['requestId'] : undefined
    const timeout = options.timeout ?? this.#timeout

    let attempt = 0
    for (;;) {
      const signals: AbortSignal[] = []
      if (options.signal) signals.push(options.signal)
      if (timeout > 0) signals.push(AbortSignal.timeout(timeout))
      const signal = signals.length ? AbortSignal.any(signals) : undefined

      await this.#limiter?.acquire(options.signal)

      let response: Response
      try {
        response = await this.#fetch(url, {
          method: op.method,
          headers,
          body: encoded.body,
          signal,
        })
      } catch (cause) {
        // A caller-initiated abort is final; anything else may be transient.
        if (options.signal?.aborted) throw cause
        if (attempt < this.#maxRetries) {
          await sleep(this.#backoff(attempt), options.signal)
          attempt++
          continue
        }
        throw new SefConnectionError({ url, method: op.method, cause })
      }

      if (response.ok) return this.#decode<T>(response, op)

      const retryAfter = retryAfterMs(response.headers.get('retry-after'))
      const retryable = response.status === 429 || response.status >= 500
      if (retryable && attempt < this.#maxRetries) {
        await response.body?.cancel().catch(() => {})
        await sleep(retryAfter ?? this.#backoff(attempt), options.signal)
        attempt++
        continue
      }

      throw await this.#error(response, url, op.method, requestId, retryAfter)
    }
  }

  #backoff(attempt: number): number {
    // Exponential with full jitter, so a fleet of clients does not resynchronise.
    const ceiling = Math.min(this.#retryDelay * 2 ** attempt, 30_000)
    return Math.random() * ceiling
  }

  async #decode<T>(response: Response, op: OperationDef): Promise<T> {
    if (op.response === 'binary') {
      return new Uint8Array(await response.arrayBuffer()) as T
    }
    const text = await response.text()
    if (!text) return undefined as T
    if (op.response === 'text') {
      // These endpoints return a bare GUID, sometimes JSON-quoted.
      try {
        const parsed: unknown = JSON.parse(text)
        return (typeof parsed === 'string' ? parsed : text) as T
      } catch {
        return text as T
      }
    }
    try {
      return normalizeKeys(JSON.parse(text)) as T
    } catch {
      // Spec says JSON but SEF sent something else; hand back the raw text.
      return text as T
    }
  }

  async #error(
    response: Response,
    url: string,
    method: string,
    requestId: string | undefined,
    retryAfter: number | undefined,
  ) {
    let raw = ''
    try {
      raw = await response.text()
    } catch {
      /* body already consumed or absent */
    }
    let body: SefErrorBody | null = null
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') body = normalizeKeys(parsed) as SefErrorBody
      } catch {
        body = { message: raw.slice(0, 500) }
      }
    }
    return errorForStatus({
      status: response.status,
      statusText: response.statusText,
      url,
      method,
      body,
      raw: raw || undefined,
      requestId,
      retryAfter: retryAfter === undefined ? undefined : retryAfter / 1000,
    })
  }
}
