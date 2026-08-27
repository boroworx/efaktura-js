import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectInvoice, buildInvoiceXml, TAX_CATEGORY } from '../src/ubl/index.ts'
import type { Invoice } from '../src/ubl/index.ts'

const valid = (): Invoice => ({
  invoiceNumber: '2026-001',
  issueDate: '2026-08-27',
  deliveryDate: '2026-08-27',
  supplier: { name: 'Dobavljač d.o.o.', vatId: '111560838', registrationId: '21502243' },
  customer: { name: 'Kupac d.o.o.', vatId: '108213413', registrationId: '17862146' },
  lines: [{ name: 'Usluga', quantity: 10, unitPrice: '1000.00', vatRate: 20 }],
})

const errors = (r: ReturnType<typeof inspectInvoice>) => r.findings.filter((f) => f.severity === 'error')

test('a valid document passes', () => {
  const r = inspectInvoice(buildInvoiceXml(valid()))
  assert.equal(r.ok, true, JSON.stringify(errors(r), null, 1))
  assert.equal(r.differences.length, 0)
  assert.ok(r.findings.some((f) => f.code === 'Uredu'))
})

test('never throws on malformed input', () => {
  for (const junk of ['', 'not xml', '<a><b></a>', '<Order/>', '{"json":true}']) {
    const r = inspectInvoice(junk)
    assert.equal(r.ok, false)
    assert.ok(r.findings.length > 0, `nema nalaza za: ${junk}`)
  }
})

test('catches tax computed per line instead of on the grouped base', () => {
  // Three lines of 0.33: per-line rounding gives 0.06, grouped base gives 0.20.
  const invoice = valid()
  invoice.lines = ['a', 'b', 'c'].map((name) => ({ name, quantity: 1, unitPrice: '0.33', vatRate: 20 }))
  const xml = buildInvoiceXml(invoice)
    .replace('<cbc:TaxAmount currencyID="RSD">0.20</cbc:TaxAmount>', '<cbc:TaxAmount currencyID="RSD">0.06</cbc:TaxAmount>')

  const r = inspectInvoice(xml)
  assert.equal(r.ok, false)
  assert.ok(r.findings.some((f) => f.code === 'IznosiSeNeSlazu'))
  const razlika = r.differences.find((d) => d.field === 'Ukupan PDV')
  assert.ok(razlika, JSON.stringify(r.differences, null, 1))
  assert.equal(razlika.declared, '0.06')
  assert.equal(razlika.computed, '0.20')
  assert.equal(razlika.difference, '0.14')
})

test('flags a wrong CustomizationID', () => {
  const xml = buildInvoiceXml(valid()).replace(
    'urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2021',
    'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0',
  )
  const r = inspectInvoice(xml)
  assert.ok(errors(r).some((f) => f.code === 'PogresanCustomizationID'))
})

test('flags a missing delivery date', () => {
  const invoice = valid()
  delete invoice.deliveryDate
  const r = inspectInvoice(buildInvoiceXml(invoice))
  assert.ok(errors(r).some((f) => f.code === 'NemaDatumPrometa'))
})

test('reports a rule violation for a zero-tax category with no exemption reason', () => {
  // Built with a reason, then stripped — the shape SEF rejects.
  const invoice = valid()
  invoice.lines = [{
    name: 'Izvoz', quantity: 1, unitPrice: '1000.00',
    vatCategory: TAX_CATEGORY.ReverseCharge, exemptionReasonCode: 'PDV-RS-10-2-1',
  }]
  const xml = buildInvoiceXml(invoice).replace(/<cbc:TaxExemptionReasonCode>.*?<\/cbc:TaxExemptionReasonCode>\n?/, '')
  const r = inspectInvoice(xml)
  assert.equal(r.ok, false)
  assert.ok(errors(r).some((f) => f.code === 'PrekrsenoPravilo'))
})

test('warns about a malformed PIB', () => {
  const invoice = valid()
  invoice.customer.vatId = '123'
  const r = inspectInvoice(buildInvoiceXml(invoice))
  assert.ok(r.findings.some((f) => f.code === 'PibNijeDevetCifara' && f.severity === 'warning'))
})

test('reads a document wrapped in DocumentEnvelope', () => {
  const inner = buildInvoiceXml(valid()).replace(/^<\?xml[^>]*\?>\n/, '')
  const wrapped =
    `<?xml version="1.0" encoding="UTF-8"?>\n<env:DocumentEnvelope xmlns:env="urn:sef">` +
    `<env:DocumentHeader><env:DocumentId>abc</env:DocumentId></env:DocumentHeader>` +
    `<env:DocumentBody>${inner}</env:DocumentBody></env:DocumentEnvelope>`
  const r = inspectInvoice(wrapped)
  assert.equal(r.ok, true, JSON.stringify(errors(r), null, 1))
  assert.equal(r.invoice?.invoiceNumber, '2026-001')
  assert.ok(r.findings.some((f) => f.code === 'Omot'))
})
