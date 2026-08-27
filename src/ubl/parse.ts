import { parse as parseXml, child, childrenNamed, text, textAt, attr, localName } from './xml.ts'
import type { XmlElement } from './xml.ts'
import { dec } from './decimal.ts'
import { INVOICE_TYPE_CODE, type DocumentTypeName, type TaxCategoryCode } from './codes.ts'
import type { Invoice, InvoiceLineInput, Party } from './build.ts'

/** An invoice read back off the wire, plus the totals the sender declared. */
export interface ParsedInvoice extends Invoice {
  /** Totals as stated in the document, not recomputed. */
  declaredTotals: {
    lineExtensionAmount?: string
    taxExclusiveAmount?: string
    taxInclusiveAmount?: string
    taxTotal?: string
    prepaidAmount?: string
    payableAmount?: string
  }
  /** Tax breakdown exactly as stated in `cac:TaxTotal`. */
  declaredTaxSubtotals: Array<{
    category?: TaxCategoryCode
    percent?: string
    taxableAmount?: string
    taxAmount?: string
    exemptionReasonCode?: string
    exemptionReasonText?: string
  }>
}

const typeNameFor = (code: string | undefined): DocumentTypeName => {
  for (const [name, value] of Object.entries(INVOICE_TYPE_CODE)) {
    if (value === code) return name as DocumentTypeName
  }
  return 'Invoice'
}

function readParty(wrapper: XmlElement | undefined): Party {
  const party = child(wrapper, 'Party')
  const address = child(party, 'PostalAddress')
  const taxId = textAt(party, 'PartyTaxScheme', 'CompanyID')
  const identification = textAt(party, 'PartyIdentification', 'ID')
  const contact = child(party, 'Contact')
  const result: Party = {
    name:
      textAt(party, 'PartyLegalEntity', 'RegistrationName') ??
      textAt(party, 'PartyName', 'Name') ??
      '',
  }
  // Strip the RS prefix the builder adds, so a parse/build round-trip is stable.
  if (taxId) result.vatId = taxId.replace(/^RS/, '')
  const registrationId = textAt(party, 'PartyLegalEntity', 'CompanyID')
  if (registrationId) result.registrationId = registrationId
  if (identification) result.budgetId = identification.replace(/^JBKJS:/, '')
  const endpoint = child(party, 'EndpointID')
  if (endpoint) {
    const scheme = attr(endpoint, 'schemeID')
    if (scheme) result.endpointSchemeId = scheme
    const value = text(endpoint)
    if (value && value !== result.vatId) result.endpointId = value
  }
  if (address) {
    const a: NonNullable<Party['address']> = {}
    const street = textAt(address, 'StreetName')
    const street2 = textAt(address, 'AdditionalStreetName')
    const city = textAt(address, 'CityName')
    const postalCode = textAt(address, 'PostalZone')
    const countryCode = textAt(address, 'Country', 'IdentificationCode')
    if (street) a.street = street
    if (street2) a.street2 = street2
    if (city) a.city = city
    if (postalCode) a.postalCode = postalCode
    if (countryCode) a.countryCode = countryCode
    if (Object.keys(a).length) result.address = a
  }
  if (contact) {
    const c: NonNullable<Party['contact']> = {}
    const name = textAt(contact, 'Name')
    const phone = textAt(contact, 'Telephone')
    const email = textAt(contact, 'ElectronicMail')
    if (name) c.name = name
    if (phone) c.phone = phone
    if (email) c.email = email
    if (Object.keys(c).length) result.contact = c
  }
  return result
}

function readLine(node: XmlElement, index: number): InvoiceLineInput {
  const item = child(node, 'Item')
  const category = child(item, 'ClassifiedTaxCategory')
  const quantityEl = child(node, 'InvoicedQuantity')
  const line: InvoiceLineInput = {
    id: textAt(node, 'ID') ?? String(index + 1),
    name: textAt(item, 'Name') ?? '',
    quantity: text(quantityEl) ?? '0',
    unitPrice: textAt(node, 'Price', 'PriceAmount') ?? '0',
  }
  const description = textAt(item, 'Description')
  if (description) line.description = description
  const unitCode = attr(quantityEl, 'unitCode')
  if (unitCode) line.unitCode = unitCode
  const categoryId = textAt(category, 'ID')
  if (categoryId) line.vatCategory = categoryId as TaxCategoryCode
  const percent = textAt(category, 'Percent')
  if (percent) line.vatRate = percent
  const sellersItemId = textAt(item, 'SellersItemIdentification', 'ID')
  if (sellersItemId) line.sellersItemId = sellersItemId
  const standardItemId = textAt(item, 'StandardItemIdentification', 'ID')
  if (standardItemId) line.standardItemId = standardItemId
  const allowance = childrenNamed(node, 'AllowanceCharge').find(
    (a) => textAt(a, 'ChargeIndicator') === 'false',
  )
  const discount = textAt(allowance, 'Amount')
  if (discount) line.discount = discount
  const period = child(node, 'InvoicePeriod')
  if (period) {
    const p: NonNullable<InvoiceLineInput['period']> = {}
    const start = textAt(period, 'StartDate')
    const end = textAt(period, 'EndDate')
    if (start) p.start = start
    if (end) p.end = end
    if (Object.keys(p).length) line.period = p
  }
  return line
}

/**
 * Read a SEF UBL 2.1 invoice back into the same shape `buildInvoiceXml` accepts.
 *
 * Accepts either a bare `<Invoice>` or one wrapped in SEF's
 * `<DocumentEnvelope>`, which is how invoices come back with metadata attached.
 */
export function parseInvoiceXml(xml: string | Uint8Array): ParsedInvoice {
  const source = typeof xml === 'string' ? xml : new TextDecoder().decode(xml)
  let root = parseXml(source)
  if (localName(root.name) === 'DocumentEnvelope') {
    const body = child(root, 'DocumentBody')
    const inner = (body?.children ?? []).find(
      (c): c is XmlElement => typeof c === 'object' && !!c,
    )
    if (!inner) throw new SyntaxError('DocumentEnvelope has no document in its DocumentBody')
    root = inner
  }
  const name = localName(root.name)
  if (name !== 'Invoice' && name !== 'CreditNote') {
    throw new SyntaxError(`Expected an <Invoice> or <CreditNote> root, got <${root.name}>`)
  }

  const totalEl = child(root, 'LegalMonetaryTotal')
  const taxTotalEl = child(root, 'TaxTotal')

  const invoice: ParsedInvoice = {
    invoiceNumber: textAt(root, 'ID') ?? '',
    issueDate: textAt(root, 'IssueDate') ?? '',
    documentType: typeNameFor(textAt(root, 'InvoiceTypeCode')),
    currency: textAt(root, 'DocumentCurrencyCode') ?? 'RSD',
    supplier: readParty(child(root, 'AccountingSupplierParty')),
    customer: readParty(child(root, 'AccountingCustomerParty')),
    lines: childrenNamed(root, 'InvoiceLine').map(readLine),
    declaredTotals: {
      lineExtensionAmount: textAt(totalEl, 'LineExtensionAmount'),
      taxExclusiveAmount: textAt(totalEl, 'TaxExclusiveAmount'),
      taxInclusiveAmount: textAt(totalEl, 'TaxInclusiveAmount'),
      taxTotal: textAt(taxTotalEl, 'TaxAmount'),
      prepaidAmount: textAt(totalEl, 'PrepaidAmount'),
      payableAmount: textAt(totalEl, 'PayableAmount'),
    },
    declaredTaxSubtotals: childrenNamed(taxTotalEl ?? { name: 'x', children: [] }, 'TaxSubtotal').map(
      (s) => {
        const cat = child(s, 'TaxCategory')
        return {
          category: textAt(cat, 'ID') as TaxCategoryCode | undefined,
          percent: textAt(cat, 'Percent'),
          taxableAmount: textAt(s, 'TaxableAmount'),
          taxAmount: textAt(s, 'TaxAmount'),
          exemptionReasonCode: textAt(cat, 'TaxExemptionReasonCode'),
          exemptionReasonText: textAt(cat, 'TaxExemptionReason'),
        }
      },
    ),
  }

  const uuid = textAt(root, 'UUID')
  if (uuid) invoice.uuid = uuid
  const dueDate = textAt(root, 'DueDate')
  if (dueDate) invoice.dueDate = dueDate
  const delivery =
    textAt(root, 'Delivery', 'ActualDeliveryDate') ?? textAt(root, 'TaxPointDate')
  if (delivery) invoice.deliveryDate = delivery
  const note = textAt(root, 'Note')
  if (note) invoice.note = note
  const buyerReference = textAt(root, 'BuyerReference')
  if (buyerReference) invoice.buyerReference = buyerReference

  const references: NonNullable<Invoice['references']> = {}
  const orderNumber = textAt(root, 'OrderReference', 'ID')
  if (orderNumber) references.orderNumber = orderNumber
  const contractNumber = textAt(root, 'ContractDocumentReference', 'ID')
  if (contractNumber) references.contractNumber = contractNumber
  for (const ref of childrenNamed(root, 'AdditionalDocumentReference')) {
    const kind = textAt(ref, 'DocumentType')
    const id = textAt(ref, 'ID')
    if (!id) continue
    if (kind === 'LOT') references.lotNumber = id
    if (kind === 'FRAMEWORK') references.frameworkAgreementNumber = id
  }
  if (Object.keys(references).length) invoice.references = references

  const billing = childrenNamed(root, 'BillingReference')
  if (billing.length) {
    invoice.documentReferences = billing.map((b) => {
      const doc = child(b, 'InvoiceDocumentReference')
      const entry: NonNullable<Invoice['documentReferences']>[number] = {
        id: textAt(doc, 'ID') ?? '',
      }
      const issueDate = textAt(doc, 'IssueDate')
      if (issueDate) entry.issueDate = issueDate
      const type = textAt(doc, 'DocumentTypeCode')
      if (type) entry.type = type
      return entry
    })
  }

  const means = child(root, 'PaymentMeans')
  if (means) {
    const account = textAt(means, 'PayeeFinancialAccount', 'ID')
    if (account) {
      const payment: NonNullable<Invoice['payment']> = { account }
      const meansCode = textAt(means, 'PaymentMeansCode')
      if (meansCode) payment.meansCode = meansCode
      const payeeName = textAt(means, 'PayeeFinancialAccount', 'Name')
      if (payeeName) payment.payeeName = payeeName
      const bankName = textAt(means, 'PayeeFinancialAccount', 'FinancialInstitutionBranch', 'Name')
      if (bankName) payment.bankName = bankName
      const paymentId = textAt(means, 'PaymentID')
      if (paymentId) {
        const [model, ...rest] = paymentId.split('-')
        payment.reference = rest.length ? { model, number: rest.join('-') } : { number: paymentId }
      }
      invoice.payment = payment
    }
  }

  const period = child(root, 'InvoicePeriod')
  if (period) {
    const p: NonNullable<Invoice['invoicePeriod']> = {}
    const start = textAt(period, 'StartDate')
    const end = textAt(period, 'EndDate')
    const descriptionCode = textAt(period, 'DescriptionCode')
    if (start) p.start = start
    if (end) p.end = end
    if (descriptionCode) p.descriptionCode = descriptionCode
    if (Object.keys(p).length) invoice.invoicePeriod = p
  }

  const prepaid = invoice.declaredTotals.prepaidAmount
  if (prepaid && !dec(prepaid).isZero()) {
    const refs = childrenNamed(root, 'AdditionalDocumentReference').filter(
      (r) => textAt(r, 'DocumentType') === 'PREPAYMENT',
    )
    invoice.prepayments = refs.map((r) => ({
      id: textAt(r, 'ID') ?? '',
      issueDate: textAt(r, 'IssueDate'),
      // The per-prepayment split is not carried in the document; the total is.
      amount: refs.length === 1 ? prepaid : '0',
    }))
  }

  return invoice
}
