import test from 'node:test'
import assert from 'node:assert/strict'
import { SefHttp, normalizeKeys, ENVIRONMENTS } from '../src/http.ts'
import {
  SefAuthError, SefValidationError, SefRateLimitError, SefServerError, SefConnectionError,
} from '../src/errors.ts'

interface Call { url: string; init: RequestInit }

/** A fetch stub that records calls and replays queued responses. */
function stub(responses: Array<Response | (() => Response | Promise<Response>)>) {
  const calls: Call[] = []
  const fetchImpl = (async (url: string | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init })
    const next = responses.shift()
    if (!next) throw new Error('stub: no response queued')
    return typeof next === 'function' ? next() : next
  }) as unknown as typeof globalThis.fetch
  return { calls, fetchImpl }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

const client = (fetchImpl: typeof globalThis.fetch, extra = {}) =>
  new SefHttp({
    apiKey: 'test-key',
    environment: 'demo',
    fetch: fetchImpl,
    retryDelay: 1,
    requestsPerSecond: 0, // no pacing in tests
    ...extra,
  })

test('sends the ApiKey header and hits the right environment', async () => {
  const { calls, fetchImpl } = stub([json({ InvoiceId: 1 })])
  await client(fetchImpl).call('getSalesInvoice', { query: { invoiceId: 42 } })
  assert.equal(calls.length, 1)
  assert.ok(calls[0]!.url.startsWith(ENVIRONMENTS.demo))
  assert.equal((calls[0]!.init.headers as Record<string, string>)['ApiKey'], 'test-key')
})

test('normalizes SEF PascalCase responses to camelCase', async () => {
  const { fetchImpl } = stub([
    json({ InvoiceId: 4831, CirStatus: 'None', CancelComment: '', Nested: { SalesInvoiceIds: [1, 2] } }),
  ])
  const res = await client(fetchImpl).call<Record<string, unknown>>('getSalesInvoice', {
    query: { invoiceId: 1 },
  })
  assert.equal(res['invoiceId'], 4831)
  assert.equal(res['cirStatus'], 'None')
  assert.deepEqual((res['nested'] as Record<string, unknown>)['salesInvoiceIds'], [1, 2])
})

test('key normalization preserves trailing capitals and is idempotent', () => {
  // 'hasISP' and 'prepayedVAT' are real spec property names.
  assert.deepEqual(normalizeKeys({ HasISP: true, PrepayedVAT: 1 }), { hasISP: true, prepayedVAT: 1 })
  const once = normalizeKeys({ InvoiceId: 1 })
  assert.deepEqual(normalizeKeys(once), once)
  assert.deepEqual(normalizeKeys([{ A: 1 }, { B: 2 }]), [{ a: 1 }, { b: 2 }])
  assert.equal(normalizeKeys(null), null)
})

test('serializes query params and converts Dates to ISO', async () => {
  const { calls, fetchImpl } = stub([json({ SalesInvoiceIds: [] })])
  await client(fetchImpl).call('postSalesInvoiceIds', {
    query: { status: 'Sent', dateFrom: new Date('2026-01-01T00:00:00Z'), dateTo: '2026-02-01' },
  })
  const url = new URL(calls[0]!.url)
  assert.equal(url.searchParams.get('status'), 'Sent')
  assert.equal(url.searchParams.get('dateFrom'), '2026-01-01T00:00:00.000Z')
  assert.equal(url.searchParams.get('dateTo'), '2026-02-01')
})

test('rejects query params the operation does not declare', async () => {
  const { fetchImpl } = stub([json({})])
  await assert.rejects(
    () => client(fetchImpl).call('getSalesInvoice', { query: { nope: 1 } }),
    /Unknown query parameter 'nope'/,
  )
})

test('fills path parameters and refuses to leave one blank', async () => {
  const { calls, fetchImpl } = stub([new Response(new Uint8Array([1, 2]), { status: 200 })])
  await client(fetchImpl).call('getSalesInvoiceStatusHistoryByInvoiceIdPdf', {
    path: { invoiceId: 77 },
  })
  assert.ok(calls[0]!.url.endsWith('/sales-invoice/status-history/77/pdf'))
  await assert.rejects(
    () => client(fetchImpl).call('getSalesInvoiceStatusHistoryByInvoiceIdPdf', {}),
    /Missing path parameter 'invoiceId'/,
  )
})

test('sends UBL as application/xml', async () => {
  const { calls, fetchImpl } = stub([json({ SalesInvoiceId: 5 })])
  await client(fetchImpl).call('postSalesInvoiceUbl', {
    query: { requestId: 'abc' },
    body: '<Invoice/>',
  })
  const headers = calls[0]!.init.headers as Record<string, string>
  assert.equal(headers['Content-Type'], 'application/xml')
  assert.equal(calls[0]!.init.body, '<Invoice/>')
})

test('sends an upload as multipart under the spec-declared field name', async () => {
  const { calls, fetchImpl } = stub([json({ SalesInvoiceId: 5 })])
  await client(fetchImpl).call('postSalesInvoiceUblUpload', {
    query: { requestId: 'abc' },
    body: '<Invoice/>',
  })
  const body = calls[0]!.init.body as FormData
  assert.ok(body instanceof FormData)
  assert.ok(body.get('ublFile') instanceof Blob) // 'ublFile' comes from the spec
  // The runtime must set the multipart boundary itself.
  assert.equal((calls[0]!.init.headers as Record<string, string>)['Content-Type'], undefined)
})

test('returns bytes for binary downloads', async () => {
  const { fetchImpl } = stub([new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 })])
  const pdf = await client(fetchImpl).call<Uint8Array>('getSalesInvoicePdf', { query: { invoiceId: 1 } })
  assert.ok(pdf instanceof Uint8Array)
  assert.deepEqual([...pdf], [0x25, 0x50, 0x44, 0x46])
})

test('unwraps a JSON-quoted string for text responses', async () => {
  const key = '4214d5b5-a1db-42a5-b4e1-135e90224abb'
  const { fetchImpl } = stub([new Response(JSON.stringify(key), { status: 200 })])
  assert.equal(await client(fetchImpl).call('postSubscribe', {}), key)
  const { fetchImpl: bare } = stub([new Response(key, { status: 200 })])
  assert.equal(await client(bare).call('postSubscribe', {}), key)
})

test('maps 401 with an empty body to an actionable auth error', async () => {
  const { fetchImpl } = stub([new Response(null, { status: 401 })])
  await assert.rejects(
    () => client(fetchImpl).call('getSalesInvoice', { query: { invoiceId: 1 } }),
    (err: unknown) => {
      assert.ok(err instanceof SefAuthError)
      assert.equal(err.status, 401)
      // SEF sends no body here, so the message has to be synthesised.
      assert.match(err.message, /API key missing, invalid, or not activated/)
      assert.match(err.message, /demo and production keys are not interchangeable/)
      return true
    },
  )
})

test('surfaces SEF business errors with their code and field', async () => {
  const { fetchImpl } = stub([
    json({ Message: 'Invoice number already used', FieldName: 'invoiceNumber', ErrorCode: 'EInvoiceNumberDublicate' }, 400),
  ])
  await assert.rejects(
    () => client(fetchImpl).call('postSalesInvoiceUbl', { body: '<Invoice/>' }),
    (err: unknown) => {
      assert.ok(err instanceof SefValidationError)
      assert.equal(err.code, 'EInvoiceNumberDublicate')
      assert.equal(err.fieldName, 'invoiceNumber')
      assert.match(err.message, /Invoice number already used/)
      return true
    },
  )
})

test('retries 5xx then succeeds', async () => {
  const { calls, fetchImpl } = stub([
    json({ Message: 'boom' }, 503),
    json({ Message: 'boom' }, 503),
    json({ InvoiceId: 9 }),
  ])
  const res = await client(fetchImpl).call<{ invoiceId: number }>('getSalesInvoice', {
    query: { invoiceId: 9 },
  })
  assert.equal(res.invoiceId, 9)
  assert.equal(calls.length, 3)
})

test('gives up after maxRetries and throws the server error', async () => {
  const { calls, fetchImpl } = stub([
    json({}, 500), json({}, 500), json({}, 500), json({}, 500),
  ])
  await assert.rejects(
    () => client(fetchImpl, { maxRetries: 3 }).call('getSalesInvoice', { query: { invoiceId: 1 } }),
    (err: unknown) => err instanceof SefServerError,
  )
  assert.equal(calls.length, 4) // initial attempt + 3 retries
})

test('honours Retry-After on 429 and reports it when exhausted', async () => {
  const { calls, fetchImpl } = stub([
    json({}, 429, { 'retry-after': '0' }),
    json({ InvoiceId: 1 }),
  ])
  await client(fetchImpl).call('getSalesInvoice', { query: { invoiceId: 1 } })
  assert.equal(calls.length, 2)

  const { fetchImpl: always } = stub([json({}, 429, { 'retry-after': '2' })])
  await assert.rejects(
    () => client(always, { maxRetries: 0 }).call('getSalesInvoice', { query: { invoiceId: 1 } }),
    (err: unknown) => {
      assert.ok(err instanceof SefRateLimitError)
      assert.equal(err.retryAfter, 2)
      return true
    },
  )
})

test('does not retry a 400', async () => {
  const { calls, fetchImpl } = stub([json({ Message: 'bad' }, 400)])
  await assert.rejects(() => client(fetchImpl).call('getSalesInvoice', { query: { invoiceId: 1 } }))
  assert.equal(calls.length, 1)
})

test('retries network failures, then wraps as a connection error', async () => {
  const boom = () => { throw new TypeError('network down') }
  const { calls, fetchImpl } = stub([boom, boom, boom, boom])
  await assert.rejects(
    () => client(fetchImpl, { maxRetries: 3 }).call('getSalesInvoice', { query: { invoiceId: 1 } }),
    (err: unknown) => {
      assert.ok(err instanceof SefConnectionError)
      assert.match(err.message, /network down/)
      return true
    },
  )
  assert.equal(calls.length, 4)
})

test('an aborted request fails immediately without retrying', async () => {
  const controller = new AbortController()
  const { calls, fetchImpl } = stub([
    () => { controller.abort(); throw new DOMException('Aborted', 'AbortError') },
  ])
  await assert.rejects(() =>
    client(fetchImpl).call('getSalesInvoice', { query: { invoiceId: 1 } }, { signal: controller.signal }),
  )
  assert.equal(calls.length, 1)
})

test('paces requests to the configured rate', async () => {
  const responses = Array.from({ length: 6 }, () => json({ InvoiceId: 1 }))
  const { fetchImpl } = stub(responses)
  const http = new SefHttp({
    apiKey: 'k', environment: 'demo', fetch: fetchImpl, requestsPerSecond: 3,
  })
  const started = Date.now()
  await Promise.all(
    Array.from({ length: 6 }, () => http.call('getSalesInvoice', { query: { invoiceId: 1 } })),
  )
  // Bucket holds 3; the remaining 3 refill at 3/s, so this cannot be instant.
  assert.ok(Date.now() - started >= 250, `expected pacing, took ${Date.now() - started}ms`)
})

test('requires an API key', () => {
  assert.throws(() => new SefHttp({ apiKey: '' }), /apiKey is required/)
})
