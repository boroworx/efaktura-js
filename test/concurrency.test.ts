import test from 'node:test'
import assert from 'node:assert/strict'
import { mapConcurrent } from '../src/resources/common.ts'
import { SefHttp } from '../src/http.ts'

/**
 * Runs `fn` while watching for unhandled rejections.
 *
 * These crash the process by default, so a regression here is not a failed
 * assertion — it is a dead test run. The listener has to be installed to catch
 * it as a value.
 */
async function withoutUnhandledRejection(fn: () => Promise<void>): Promise<unknown[]> {
  const seen: unknown[] = []
  const onUnhandled = (err: unknown) => seen.push(err)
  process.on('unhandledRejection', onUnhandled)
  try {
    await fn()
    // Rejections surface a turn later than the code that abandoned them.
    await new Promise((r) => setTimeout(r, 50))
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
  return seen
}

test('a consumer breaking early does not leave an unhandled rejection', async () => {
  const unhandled = await withoutUnhandledRejection(async () => {
    const worker = async (i: number) => {
      if (i === 3) {
        await new Promise((r) => setTimeout(r, 20))
        throw new Error('item 3 failed')
      }
      await new Promise((r) => setTimeout(r, 5))
      return i
    }
    for await (const value of mapConcurrent([0, 1, 2, 3, 4, 5], 4, worker)) {
      assert.equal(value, 0)
      break // found what we wanted, stop early
    }
  })
  assert.deepEqual(unhandled, [], 'in-flight failures must not escape as unhandled rejections')
})

test('an early failure does not leave later in-flight failures unhandled', async () => {
  const unhandled = await withoutUnhandledRejection(async () => {
    const worker = async (i: number) => {
      if (i === 0) {
        await new Promise((r) => setTimeout(r, 5))
        throw new Error('item 0 failed')
      }
      if (i === 4) {
        await new Promise((r) => setTimeout(r, 30))
        throw new Error('item 4 failed')
      }
      await new Promise((r) => setTimeout(r, 5))
      return i
    }
    await assert.rejects(async () => {
      for await (const _ of mapConcurrent([0, 1, 2, 3, 4, 5], 5, worker)) void _
    }, /item 0 failed/)
  })
  assert.deepEqual(unhandled, [], 'the second failure must not escape')
})

test('results are emitted in order, with bounded concurrency', async () => {
  let running = 0
  let peak = 0
  const worker = async (i: number) => {
    running++
    peak = Math.max(peak, running)
    await new Promise((r) => setTimeout(r, 10 - i)) // later items finish sooner
    running--
    return i
  }
  const out: number[] = []
  for await (const v of mapConcurrent([0, 1, 2, 3, 4, 5], 3, worker)) out.push(v)
  assert.deepEqual(out, [0, 1, 2, 3, 4, 5], 'order must follow the input, not completion')
  assert.ok(peak <= 3, `concurrency exceeded the limit: ${peak}`)
})

test('an empty list yields nothing', async () => {
  const out: unknown[] = []
  for await (const v of mapConcurrent([], 3, async () => 1)) out.push(v)
  assert.deepEqual(out, [])
})

test('an aborted request does not hold a rate-limit slot', async () => {
  let sent = 0
  const fetchImpl = (async (_url: string, init: RequestInit = {}) => {
    if (init.signal?.aborted) throw init.signal.reason
    sent++
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof globalThis.fetch

  const http = new SefHttp({
    apiKey: 'k', environment: 'demo', fetch: fetchImpl, requestsPerSecond: 2,
  })

  const controller = new AbortController()
  const calls = Array.from({ length: 6 }, (_, i) =>
    http
      .call('getSalesInvoice', { query: { invoiceId: i } }, i >= 2 ? { signal: controller.signal } : {})
      .then(() => 'ok', () => 'aborted'),
  )
  controller.abort()

  const started = Date.now()
  const results = await Promise.all(calls)
  const elapsed = Date.now() - started

  assert.deepEqual(results, ['ok', 'ok', 'aborted', 'aborted', 'aborted', 'aborted'])
  assert.equal(sent, 2, 'aborted requests must not reach the network')
  // At 2/s the bucket holds 2; if the aborted four had queued they would have
  // taken ~2s to drain.
  assert.ok(elapsed < 500, `aborted requests still occupied the queue (${elapsed}ms)`)
})

test('pacing still applies to live requests', async () => {
  const fetchImpl = (async () =>
    new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  ) as unknown as typeof globalThis.fetch
  const http = new SefHttp({ apiKey: 'k', environment: 'demo', fetch: fetchImpl, requestsPerSecond: 3 })

  const started = Date.now()
  await Promise.all(
    Array.from({ length: 6 }, () => http.call('getSalesInvoice', { query: { invoiceId: 1 } })),
  )
  assert.ok(Date.now() - started >= 250, 'rate limiting must still hold for live requests')
})
