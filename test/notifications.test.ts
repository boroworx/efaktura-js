import test from 'node:test'
import assert from 'node:assert/strict'
import { parseNotification, verifyNotification } from '../src/index.ts'

const KEY = '4214d5b5-a1db-42a5-b4e1-135e90224abb'

test('parses a callback body and normalizes its PascalCase keys', () => {
  // SEF POSTs exactly what the `changes` endpoint returns.
  const body = JSON.stringify([
    { EventId: 1, NewInvoiceStatus: 'Approved', SalesInvoiceId: 4831, SubscriptionKey: KEY },
  ])
  const [event] = parseNotification(body)
  assert.equal(event!.eventId, 1)
  assert.equal(event!.newInvoiceStatus, 'Approved')
  assert.equal(event!.subscriptionKey, KEY)
})

test('accepts a single object as well as an array', () => {
  assert.equal(parseNotification({ EventId: 7 }).length, 1)
  assert.equal(parseNotification([{ EventId: 7 }, { EventId: 8 }]).length, 2)
  assert.deepEqual(parseNotification('null'), [])
})

test('verifies the subscription key and rejects mismatches', () => {
  assert.ok(verifyNotification({ subscriptionKey: KEY } as never, KEY))
  assert.ok(!verifyNotification({ subscriptionKey: 'wrong' } as never, KEY))
  assert.ok(!verifyNotification({ subscriptionKey: null } as never, KEY))
  assert.ok(!verifyNotification({} as never, KEY))
  // Same length, different content — the constant-time path.
  const almost = KEY.slice(0, -1) + 'c'
  assert.ok(!verifyNotification({ subscriptionKey: almost } as never, KEY))
})
