import test from 'node:test'
import assert from 'node:assert/strict'
import { EFaktura, SefError } from '../src/index.ts'
import type { Invoice } from '../src/index.ts'

/**
 * Opt-in smoke test against the SEF **demo** environment.
 *
 *   SEF_API_KEY=<demo key> node --test test/live.test.ts
 *
 * Skipped entirely without a key so CI stays offline. Set SEF_LIVE_SEND=1 to
 * also send a real invoice — that creates a document in the demo company, so it
 * is off by default.
 */
const apiKey = process.env['SEF_API_KEY']
const options = { skip: apiKey ? false : 'set SEF_API_KEY to run live demo tests' }

const sef = () => new EFaktura({ apiKey: apiKey!, environment: 'demo' })

test('reads the eFaktura version', options, async () => {
  const version = await sef().reference.version()
  assert.ok(version.version, `expected a version string, got ${JSON.stringify(version)}`)
})

test('reads the VAT exemption reason codebook', options, async () => {
  const reasons = await sef().salesInvoices.exemptionReasons()
  assert.ok(Array.isArray(reasons) && reasons.length > 0)
  assert.ok(reasons[0]!.key, 'exemption reasons should carry a key')
})

test('rejects a bad API key with SefAuthError', options, async () => {
  const bad = new EFaktura({ apiKey: '00000000-0000-0000-0000-000000000000', environment: 'demo' })
  await assert.rejects(() => bad.reference.version(), (err: unknown) => {
    assert.ok(err instanceof SefError)
    assert.equal(err.status, 401)
    return true
  })
})

test('lists sales invoices for the last 30 days', options, async () => {
  const dateTo = new Date()
  const dateFrom = new Date(dateTo.getTime() - 30 * 24 * 3600 * 1000)
  const ids = await sef().salesInvoices.ids({ dateFrom, dateTo, status: 'Sent' })
  assert.ok(Array.isArray(ids))
})

test(
  'sends a UBL invoice the demo environment accepts',
  { skip: options.skip || (process.env['SEF_LIVE_SEND'] ? false : 'set SEF_LIVE_SEND=1 to send') },
  async () => {
    const supplierVatId = process.env['SEF_SUPPLIER_VAT_ID']
    const customerVatId = process.env['SEF_CUSTOMER_VAT_ID']
    assert.ok(supplierVatId && customerVatId, 'set SEF_SUPPLIER_VAT_ID and SEF_CUSTOMER_VAT_ID')

    const invoice: Invoice = {
      invoiceNumber: `TEST-${Date.now()}`,
      issueDate: new Date(),
      deliveryDate: new Date(),
      supplier: { name: 'Test dobavljač', vatId: supplierVatId },
      customer: { name: 'Test kupac', vatId: customerVatId },
      lines: [{ name: 'Test usluga', quantity: 1, unitPrice: '1000.00', vatRate: 20 }],
    }

    const created = await sef().salesInvoices.send(invoice, { executeValidation: true })
    assert.ok(created.salesInvoiceId, 'SEF should return a sales invoice id')

    const fetched = await sef().salesInvoices.get(created.salesInvoiceId)
    assert.equal(fetched.invoiceId, created.salesInvoiceId)

    const xml = await sef().salesInvoices.xml(created.salesInvoiceId)
    assert.ok(xml.byteLength > 0)
  },
)
