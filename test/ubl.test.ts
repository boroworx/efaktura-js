import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildInvoiceXml, computeTotals, parseInvoiceXml, CUSTOMIZATION_ID, TAX_CATEGORY, UNIT,
} from '../src/ubl/index.ts'
import type { Invoice } from '../src/ubl/index.ts'
import { parseXml, textAt, child, childrenNamed, attr } from '../src/ubl/index.ts'

const basic = (): Invoice => ({
  invoiceNumber: '2026-001',
  issueDate: '2026-08-27',
  dueDate: '2026-09-26',
  deliveryDate: '2026-08-27',
  supplier: {
    name: 'Dobavljač d.o.o.',
    vatId: '111560838',
    registrationId: '21502243',
    address: { street: 'Knez Mihailova 1', city: 'Beograd', postalCode: '11000' },
  },
  customer: {
    name: 'Kupac d.o.o.',
    vatId: '108213413',
    registrationId: '17862146',
    address: { street: 'Bulevar 2', city: 'Novi Sad', postalCode: '21000' },
  },
  payment: { account: '160-0000000000000-00', reference: { model: '97', number: '1234567' } },
  lines: [
    { name: 'Usluga razvoja', quantity: 10, unitPrice: '1000.00', vatRate: 20, unitCode: UNIT.Hour },
  ],
})

test('builds a document SEF will recognise', () => {
  const doc = parseXml(buildInvoiceXml(basic()))
  assert.equal(doc.name, 'Invoice')
  assert.equal(textAt(doc, 'CustomizationID'), CUSTOMIZATION_ID)
  assert.equal(textAt(doc, 'UBLVersionID'), '2.1')
  assert.equal(textAt(doc, 'ID'), '2026-001')
  assert.equal(textAt(doc, 'InvoiceTypeCode'), '380')
  assert.equal(textAt(doc, 'DocumentCurrencyCode'), 'RSD')
  // SEF invoices carry no ProfileID, unlike Peppol BIS.
  assert.equal(textAt(doc, 'ProfileID'), undefined)
})

test('prefixes the supplier tax id with RS but leaves the legal id bare', () => {
  const doc = parseXml(buildInvoiceXml(basic()))
  const supplier = child(doc, 'AccountingSupplierParty', 'Party')
  assert.equal(textAt(supplier, 'PartyTaxScheme', 'CompanyID'), 'RS111560838')
  assert.equal(textAt(supplier, 'PartyLegalEntity', 'CompanyID'), '21502243')
  assert.equal(attr(child(supplier, 'EndpointID'), 'schemeID'), '9948')
  assert.equal(textAt(supplier, 'EndpointID'), '111560838')
})

test('does not double-prefix an id already given as RS…', () => {
  const invoice = basic()
  invoice.supplier.vatId = 'RS111560838'
  const doc = parseXml(buildInvoiceXml(invoice))
  const supplier = child(doc, 'AccountingSupplierParty', 'Party')
  assert.equal(textAt(supplier, 'PartyTaxScheme', 'CompanyID'), 'RS111560838')
})

test('computes totals and VAT correctly', () => {
  const totals = computeTotals(basic())
  assert.equal(totals.lineExtensionAmount.toString(2), '10000.00')
  assert.equal(totals.taxTotal.toString(2), '2000.00')
  assert.equal(totals.taxInclusiveAmount.toString(2), '12000.00')
  assert.equal(totals.payableAmount.toString(2), '12000.00')
})

test('groups mixed VAT rates into one subtotal each', () => {
  const invoice = basic()
  invoice.lines = [
    { name: 'Standardna', quantity: 1, unitPrice: '1000.00', vatRate: 20 },
    { name: 'Snižena', quantity: 1, unitPrice: '500.00', vatRate: 10, vatCategory: TAX_CATEGORY.ReducedRate },
    { name: 'Još standardne', quantity: 2, unitPrice: '250.00', vatRate: 20 },
  ]
  const totals = computeTotals(invoice)
  assert.equal(totals.subtotals.length, 2)
  const standard = totals.subtotals.find((s) => s.category === 'S')!
  const reduced = totals.subtotals.find((s) => s.category === 'AA')!
  assert.equal(standard.taxableAmount.toString(2), '1500.00') // 1000 + 500
  assert.equal(standard.taxAmount.toString(2), '300.00')
  assert.equal(reduced.taxableAmount.toString(2), '500.00')
  assert.equal(reduced.taxAmount.toString(2), '50.00')
  assert.equal(totals.taxTotal.toString(2), '350.00')
})

test('computes tax on the grouped base, not per line', () => {
  // Three lines of 0.33 each: per-line rounding would give 0.06, the grouped
  // base (0.99 * 20% = 0.198 -> 0.20) is what SEF recomputes and expects.
  const invoice = basic()
  invoice.lines = [
    { name: 'a', quantity: 1, unitPrice: '0.33', vatRate: 20 },
    { name: 'b', quantity: 1, unitPrice: '0.33', vatRate: 20 },
    { name: 'c', quantity: 1, unitPrice: '0.33', vatRate: 20 },
  ]
  const totals = computeTotals(invoice)
  assert.equal(totals.lineExtensionAmount.toString(2), '0.99')
  assert.equal(totals.taxTotal.toString(2), '0.20')
})

test('subtracts line discounts before tax', () => {
  const invoice = basic()
  invoice.lines = [{ name: 'S popustom', quantity: 1, unitPrice: '1000.00', discount: '100.00', vatRate: 20 }]
  const totals = computeTotals(invoice)
  assert.equal(totals.lineExtensionAmount.toString(2), '900.00')
  assert.equal(totals.taxTotal.toString(2), '180.00')
})

test('deducts prepayments from the payable amount', () => {
  const invoice = basic()
  invoice.prepayments = [{ id: 'AV-1', amount: '2000.00', issueDate: '2026-08-01' }]
  const totals = computeTotals(invoice)
  assert.equal(totals.taxInclusiveAmount.toString(2), '12000.00')
  assert.equal(totals.prepaidAmount.toString(2), '2000.00')
  assert.equal(totals.payableAmount.toString(2), '10000.00')
  const doc = parseXml(buildInvoiceXml(invoice))
  assert.equal(textAt(child(doc, 'LegalMonetaryTotal'), 'PrepaidAmount'), '2000.00')
})

test('emits zero tax and an exemption reason for reverse charge', () => {
  const invoice = basic()
  invoice.lines = [{
    name: 'Usluga inostranstvu',
    quantity: 1,
    unitPrice: '1000.00',
    vatCategory: TAX_CATEGORY.ReverseCharge,
    exemptionReasonCode: 'PDV-RS-10-2-1',
    exemptionReasonText: 'Obveznik PDV nije obračunao PDV',
  }]
  const totals = computeTotals(invoice)
  assert.equal(totals.taxTotal.toString(2), '0.00')

  const doc = parseXml(buildInvoiceXml(invoice))
  const category = child(doc, 'TaxTotal', 'TaxSubtotal', 'TaxCategory')
  assert.equal(textAt(category, 'ID'), 'AE')
  // Percent must be absent for zero-tax categories.
  assert.equal(textAt(category, 'Percent'), undefined)
  assert.equal(textAt(category, 'TaxExemptionReasonCode'), 'PDV-RS-10-2-1')
})

test('refuses a zero-tax category without an exemption reason', () => {
  const invoice = basic()
  invoice.lines = [{ name: 'x', quantity: 1, unitPrice: '10.00', vatCategory: TAX_CATEGORY.Exempt }]
  assert.throws(() => computeTotals(invoice), /requires an\s+exemptionReasonCode/)
})

test('refuses a non-zero rate on a zero-tax category', () => {
  const invoice = basic()
  invoice.lines = [{
    name: 'x', quantity: 1, unitPrice: '10.00',
    vatCategory: TAX_CATEGORY.ReverseCharge, vatRate: 20, exemptionReasonCode: 'K',
  }]
  assert.throws(() => computeTotals(invoice), /must have a zero VAT rate/)
})

test('refuses two rates within one tax category', () => {
  // SEF permits exactly one TaxSubtotal per category.
  const invoice = basic()
  invoice.lines = [
    { name: 'a', quantity: 1, unitPrice: '100.00', vatRate: 20 },
    { name: 'b', quantity: 1, unitPrice: '100.00', vatRate: 10 },
  ]
  assert.throws(() => computeTotals(invoice), /only one TaxSubtotal per category/)
})

test('requires a contract or order reference for budget customers', () => {
  const invoice = basic()
  invoice.customer.budgetId = '10520'
  assert.throws(() => buildInvoiceXml(invoice), /budget user/)

  invoice.references = { contractNumber: 'UG-2026-1' }
  const doc = parseXml(buildInvoiceXml(invoice))
  assert.equal(textAt(doc, 'ContractDocumentReference', 'ID'), 'UG-2026-1')
  const customer = child(doc, 'AccountingCustomerParty', 'Party')
  assert.equal(textAt(customer, 'PartyIdentification', 'ID'), 'JBKJS:10520')
})

test('requires a document reference on credit and debit notes', () => {
  const invoice = basic()
  invoice.documentType = 'CreditNote'
  assert.throws(() => buildInvoiceXml(invoice), /must reference the document it corrects/)

  invoice.documentReferences = [{ id: '2026-001', issueDate: '2026-08-27', type: 'CreditNoteReferenceToInvoice' }]
  const doc = parseXml(buildInvoiceXml(invoice))
  assert.equal(textAt(doc, 'InvoiceTypeCode'), '381')
  const ref = child(doc, 'BillingReference', 'InvoiceDocumentReference')
  assert.equal(textAt(ref, 'ID'), '2026-001')
  assert.equal(textAt(ref, 'DocumentTypeCode'), 'CreditNoteReferenceToInvoice')
})

test('rejects an invoice with no lines or no number', () => {
  assert.throws(() => buildInvoiceXml({ ...basic(), lines: [] }), /at least one line/)
  assert.throws(() => buildInvoiceXml({ ...basic(), invoiceNumber: '' }), /invoiceNumber is required/)
})

test('escapes XML metacharacters in supplied text', () => {
  const invoice = basic()
  invoice.supplier.name = 'A & B <Co> "quoted"'
  const xml = buildInvoiceXml(invoice)
  assert.ok(xml.includes('A &amp; B &lt;Co&gt;'))
  const doc = parseXml(xml)
  const supplier = child(doc, 'AccountingSupplierParty', 'Party')
  assert.equal(textAt(supplier, 'PartyLegalEntity', 'RegistrationName'), 'A & B <Co> "quoted"')
})

test('embeds attachments as base64', () => {
  const invoice = basic()
  invoice.attachments = [{ filename: 'spec.pdf', mimeType: 'application/pdf', content: new Uint8Array([1, 2, 3]) }]
  const doc = parseXml(buildInvoiceXml(invoice))
  const ref = childrenNamed(doc, 'AdditionalDocumentReference')[0]!
  const binary = child(ref, 'Attachment', 'EmbeddedDocumentBinaryObject')
  assert.equal(attr(binary, 'mimeCode'), 'application/pdf')
  assert.equal(attr(binary, 'filename'), 'spec.pdf')
})

test('round-trips build -> parse without losing fields', () => {
  const original = basic()
  const parsed = parseInvoiceXml(buildInvoiceXml(original))

  assert.equal(parsed.invoiceNumber, original.invoiceNumber)
  assert.equal(parsed.issueDate, original.issueDate)
  assert.equal(parsed.dueDate, original.dueDate)
  assert.equal(parsed.deliveryDate, original.deliveryDate)
  assert.equal(parsed.documentType, 'Invoice')
  assert.equal(parsed.currency, 'RSD')

  assert.equal(parsed.supplier.name, original.supplier.name)
  assert.equal(parsed.supplier.vatId, original.supplier.vatId) // RS prefix stripped again
  assert.equal(parsed.supplier.registrationId, original.supplier.registrationId)
  assert.deepEqual(parsed.supplier.address, { ...original.supplier.address, countryCode: 'RS' })
  assert.equal(parsed.customer.name, original.customer.name)

  assert.equal(parsed.payment?.account, original.payment!.account)
  assert.deepEqual(parsed.payment?.reference, { model: '97', number: '1234567' })

  assert.equal(parsed.lines.length, 1)
  assert.equal(parsed.lines[0]!.name, 'Usluga razvoja')
  assert.equal(parsed.lines[0]!.unitCode, UNIT.Hour)
  assert.equal(String(parsed.lines[0]!.quantity), '10')
  assert.equal(String(parsed.lines[0]!.unitPrice), '1000.00')
  assert.equal(String(parsed.lines[0]!.vatRate), '20.00')

  assert.equal(parsed.declaredTotals.payableAmount, '12000.00')
  assert.equal(parsed.declaredTaxSubtotals[0]!.taxAmount, '2000.00')
})

test('a re-built round-tripped invoice is byte-identical', () => {
  // The strongest round-trip guarantee: parse must lose nothing the builder uses.
  const xml = buildInvoiceXml(basic())
  assert.equal(buildInvoiceXml(parseInvoiceXml(xml)), xml)
})

test('reads an invoice wrapped in a SEF DocumentEnvelope', () => {
  const inner = buildInvoiceXml(basic()).replace(/^<\?xml[^>]*\?>\n/, '')
  const wrapped =
    `<?xml version="1.0" encoding="UTF-8"?>\n<env:DocumentEnvelope xmlns:env="urn:sef">` +
    `<env:DocumentHeader><env:DocumentId>abc-123</env:DocumentId></env:DocumentHeader>` +
    `<env:DocumentBody>${inner}</env:DocumentBody></env:DocumentEnvelope>`
  assert.equal(parseInvoiceXml(wrapped).invoiceNumber, '2026-001')
})

test('rejects XML that is not an invoice', () => {
  assert.throws(() => parseInvoiceXml('<Order/>'), /Expected an <Invoice>/)
  assert.throws(() => parseInvoiceXml('<a><b></a>'), /Mismatched tags/)
})
