import { el, leaf, serialize, type XmlElement, type XmlNode } from './xml.ts'
import { Decimal, dec } from './decimal.ts'
import {
  INVOICE_TYPE_CODE,
  PAYMENT_MEANS,
  SERBIA_ENDPOINT_SCHEME,
  TAX_CATEGORY,
  UNIT,
  requiresExemptionReason,
  type DocumentTypeName,
  type TaxCategoryCode,
} from './codes.ts'

/**
 * The Serbian CIUS over EN 16931, syntax UBL 2.1
 * (SRPS EN 16931-1:2019/A2:2020). SEF rejects any other CustomizationID.
 */
export const CUSTOMIZATION_ID = 'urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2021'

export const NS = {
  invoice: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  creditNote: 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  /** SEF's own extension namespace (srbdt). */
  sbt: 'http://mfin.gov.rs/srbdt/srbdtext',
} as const

export type Amount = Decimal | string | number
export type DateLike = Date | string

export interface Address {
  street?: string
  /** Second address line. */
  street2?: string
  city?: string
  postalCode?: string
  /** ISO 3166-1 alpha-2. Defaults to `RS`. */
  countryCode?: string
}

export interface Party {
  /** Registered legal name. */
  name: string
  /**
   * PIB — the 9-digit Serbian tax identification number. Give it bare
   * (`111560838`); the `RS` prefix required on `PartyTaxScheme` is added.
   */
  vatId?: string
  /** Matični broj — the 8-digit company registration number. */
  registrationId?: string
  /**
   * JBKJS — budget user identifier. Supplying it marks the party as a budget
   * user, which makes a contract or order reference mandatory on the invoice.
   */
  budgetId?: string
  address?: Address
  /** Overrides the ISO 6523 scheme on `EndpointID`. Defaults to `9948`. */
  endpointSchemeId?: string
  /** Electronic address, when it differs from the tax id. */
  endpointId?: string
  contact?: { name?: string; phone?: string; email?: string }
  /** Set when the party is registered for VAT but has no PIB-based scheme. */
  vatScheme?: string
}

export interface InvoiceLineInput {
  /** Line identifier; defaults to the 1-based position. */
  id?: string
  name: string
  description?: string
  quantity: Amount
  /** UN/ECE Rec 20 code. Defaults to `H87` (piece). */
  unitCode?: string
  unitPrice: Amount
  /** Rate as a percentage: `20`, not `0.2`. Defaults to 20 for category S. */
  vatRate?: Amount
  /** UNTDID 5305 category. Defaults to `S`. */
  vatCategory?: TaxCategoryCode
  /**
   * Required for every zero-tax category. Use the `key` from
   * `sef.salesInvoices.exemptionReasons()`.
   */
  exemptionReasonCode?: string
  exemptionReasonText?: string
  /** Line-level discount, subtracted from the line net. */
  discount?: Amount
  sellersItemId?: string
  standardItemId?: string
  /** Period this line covers, for recurring billing. */
  period?: { start?: DateLike; end?: DateLike }
}

export interface PaymentInput {
  /** Account number the buyer pays into. */
  account: string
  /** UNTDID 4461 code. Defaults to `30` (credit transfer). */
  meansCode?: string
  /** Poziv na broj — payment model and reference. */
  reference?: { model?: string; number?: string }
  payeeName?: string
  bankName?: string
}

export interface DocumentReferenceInput {
  /** Number of the referenced document. */
  id: string
  issueDate?: DateLike
  /**
   * SEF's `DocumentReferenceTypes`, e.g. `CreditNoteReferenceToInvoice`.
   * Required on credit and debit notes.
   */
  type?: string
}

export interface PrepaymentInput {
  /** Number of the prepayment invoice being deducted. */
  id: string
  issueDate?: DateLike
  /** Gross amount already paid. */
  amount: Amount
  /** Taxable base of the prepayment. */
  taxableAmount?: Amount
  taxAmount?: Amount
  vatRate?: Amount
  vatCategory?: TaxCategoryCode
}

export interface AttachmentInput {
  filename: string
  mimeType: string
  /** Base64 string, or bytes which will be base64-encoded. */
  content: string | Uint8Array
  description?: string
}

export interface Invoice {
  /** Your legal invoice number. Must be unique for the issuer. */
  invoiceNumber: string
  issueDate: DateLike
  dueDate?: DateLike
  /**
   * Date of supply (datum prometa). SEF requires this on ordinary invoices —
  * omitting it yields `InvoiceDeliveryDateMissing`.
   */
  deliveryDate?: DateLike
  /** Defaults to `Invoice`. */
  documentType?: DocumentTypeName
  /** ISO 4217. Defaults to `RSD`. */
  currency?: string
  supplier: Party
  customer: Party
  lines: InvoiceLineInput[]
  payment?: PaymentInput
  note?: string
  /** Free-form buyer reference. */
  buyerReference?: string
  references?: {
    /** Broj narudžbenice. */
    orderNumber?: string
    /** Broj ugovora — mandatory for budget users and CIR invoices. */
    contractNumber?: string
    /** Broj partije/lota. */
    lotNumber?: string
    /** Broj okvirnog sporazuma. */
    frameworkAgreementNumber?: string
  }
  /** Referenced documents; required on credit and debit notes. */
  documentReferences?: DocumentReferenceInput[]
  /** Prepayment invoices deducted from this one. */
  prepayments?: PrepaymentInput[]
  invoicePeriod?: { start?: DateLike; end?: DateLike; descriptionCode?: string }
  attachments?: AttachmentInput[]
  /** Overrides the computed rounding adjustment. */
  roundingAmount?: Amount
  /** Explicit UUID; one is generated when omitted. */
  uuid?: string
}

/** What `buildInvoice` computed, so callers can reconcile against their own totals. */
export interface InvoiceTotals {
  lineExtensionAmount: Decimal
  taxExclusiveAmount: Decimal
  taxTotal: Decimal
  taxInclusiveAmount: Decimal
  prepaidAmount: Decimal
  payableAmount: Decimal
  subtotals: TaxSubtotal[]
}

export interface TaxSubtotal {
  category: TaxCategoryCode
  percent: Decimal
  taxableAmount: Decimal
  taxAmount: Decimal
  exemptionReasonCode?: string
  exemptionReasonText?: string
}

const AMOUNT_SCALE = 2
const asDate = (d: DateLike): string =>
  typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)

const base64 = (content: string | Uint8Array): string => {
  if (typeof content === 'string') return content
  let binary = ''
  for (const byte of content) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function money(value: Amount, currency: string): { text: string; attrs: { currencyID: string } } {
  return { text: dec(value).round(AMOUNT_SCALE).toString(AMOUNT_SCALE), attrs: { currencyID: currency } }
}

const amountEl = (
  name: string,
  value: Amount,
  currency: string,
): XmlElement => {
  const m = money(value, currency)
  return el(name, m.attrs, m.text)
}

/**
 * Compute every monetary total for an invoice, without producing XML.
 *
 * Exposed separately so callers can reconcile against their own ledger before
 * sending, and so the totals can be unit-tested independently of serialization.
 */
export function computeTotals(invoice: Invoice): InvoiceTotals {
  const groups = new Map<string, TaxSubtotal>()
  let lineTotal = Decimal.zero(AMOUNT_SCALE)

  for (const [index, line] of invoice.lines.entries()) {
    const category = line.vatCategory ?? TAX_CATEGORY.StandardRate
    const zeroTax = requiresExemptionReason(category)
    const percent = dec(zeroTax ? 0 : (line.vatRate ?? 20))

    if (zeroTax && !line.exemptionReasonCode && !line.exemptionReasonText) {
      throw new TypeError(
        `Line ${index + 1} uses tax category '${category}', which requires an ` +
          'exemptionReasonCode (get valid keys from sef.salesInvoices.exemptionReasons()).',
      )
    }
    if (zeroTax && line.vatRate !== undefined && !dec(line.vatRate).isZero()) {
      throw new TypeError(
        `Line ${index + 1} uses tax category '${category}', which must have a zero VAT rate.`,
      )
    }

    const net = dec(line.quantity)
      .mul(dec(line.unitPrice))
      .sub(line.discount ?? 0)
      .round(AMOUNT_SCALE)
    lineTotal = lineTotal.add(net)

    // SEF allows exactly one TaxSubtotal per category, so lines are grouped by
    // category *and* rate; two rates within one category would be invalid input.
    const key = `${category}|${percent.toString(2)}`
    const existing = groups.get(key)
    if (existing) {
      existing.taxableAmount = existing.taxableAmount.add(net)
    } else {
      groups.set(key, {
        category,
        percent,
        taxableAmount: net,
        taxAmount: Decimal.zero(AMOUNT_SCALE),
        exemptionReasonCode: line.exemptionReasonCode,
        exemptionReasonText: line.exemptionReasonText,
      })
    }
  }

  const byCategory = new Map<TaxCategoryCode, number>()
  for (const s of groups.values()) {
    byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + 1)
  }
  for (const [category, count] of byCategory) {
    if (count > 1) {
      throw new TypeError(
        `Tax category '${category}' appears with more than one VAT rate. ` +
          'SEF permits only one TaxSubtotal per category.',
      )
    }
  }

  // Tax is computed on the grouped base, not per line, so the total matches the
  // base SEF recomputes from the TaxSubtotal.
  let taxTotal = Decimal.zero(AMOUNT_SCALE)
  for (const s of groups.values()) {
    s.taxAmount = s.taxableAmount.mul(s.percent).mul('0.01').round(AMOUNT_SCALE)
    taxTotal = taxTotal.add(s.taxAmount)
  }

  const prepaid = (invoice.prepayments ?? []).reduce(
    (a, p) => a.add(dec(p.amount)),
    Decimal.zero(AMOUNT_SCALE),
  )
  const taxExclusive = lineTotal
  const taxInclusive = taxExclusive.add(taxTotal)
  const rounding = invoice.roundingAmount ? dec(invoice.roundingAmount) : Decimal.zero(AMOUNT_SCALE)
  const payable = taxInclusive.sub(prepaid).add(rounding)

  return {
    lineExtensionAmount: lineTotal,
    taxExclusiveAmount: taxExclusive,
    taxTotal,
    taxInclusiveAmount: taxInclusive,
    prepaidAmount: prepaid,
    payableAmount: payable,
    subtotals: [...groups.values()],
  }
}

function partyElement(tag: string, party: Party, currency: string): XmlElement {
  void currency
  const scheme = party.endpointSchemeId ?? SERBIA_ENDPOINT_SCHEME
  const endpoint = party.endpointId ?? party.vatId
  const address = party.address
  const children: XmlNode[] = [
    endpoint ? el('cbc:EndpointID', { schemeID: scheme }, endpoint) : undefined,
    // JBKJS goes in PartyIdentification and is only permitted for budget users.
    party.budgetId
      ? el('cac:PartyIdentification', null, [leaf('cbc:ID', `JBKJS:${party.budgetId}`)])
      : undefined,
    el('cac:PartyName', null, [leaf('cbc:Name', party.name)]),
    el('cac:PostalAddress', null, [
      leaf('cbc:StreetName', address?.street),
      leaf('cbc:AdditionalStreetName', address?.street2),
      leaf('cbc:CityName', address?.city),
      leaf('cbc:PostalZone', address?.postalCode),
      el('cac:Country', null, [leaf('cbc:IdentificationCode', address?.countryCode ?? 'RS')]),
    ]),
    party.vatId
      ? el('cac:PartyTaxScheme', null, [
          // SEF requires the RS prefix here (UBLPartyTaxSchemeCompanyIdWithoutPrefix).
          leaf('cbc:CompanyID', party.vatId.startsWith('RS') ? party.vatId : `RS${party.vatId}`),
          el('cac:TaxScheme', null, [leaf('cbc:ID', party.vatScheme ?? 'VAT')]),
        ])
      : undefined,
    el('cac:PartyLegalEntity', null, [
      leaf('cbc:RegistrationName', party.name),
      leaf('cbc:CompanyID', party.registrationId),
    ]),
    party.contact
      ? el('cac:Contact', null, [
          leaf('cbc:Name', party.contact.name),
          leaf('cbc:Telephone', party.contact.phone),
          leaf('cbc:ElectronicMail', party.contact.email),
        ])
      : undefined,
  ]
  return el(tag, null, [el('cac:Party', null, children)])
}

function taxCategoryElement(subtotal: TaxSubtotal): XmlElement {
  const zeroTax = requiresExemptionReason(subtotal.category)
  return el('cac:TaxCategory', null, [
    leaf('cbc:ID', subtotal.category),
    // Percent is omitted entirely for zero-tax categories.
    zeroTax ? undefined : leaf('cbc:Percent', subtotal.percent.toString(2)),
    zeroTax ? leaf('cbc:TaxExemptionReasonCode', subtotal.exemptionReasonCode) : undefined,
    zeroTax ? leaf('cbc:TaxExemptionReason', subtotal.exemptionReasonText) : undefined,
    el('cac:TaxScheme', null, [leaf('cbc:ID', 'VAT')]),
  ])
}

/** Build the UBL document tree. Use `buildInvoiceXml` for a serialized string. */
export function buildInvoice(invoice: Invoice): { root: XmlElement; totals: InvoiceTotals } {
  if (!invoice.invoiceNumber) throw new TypeError('invoiceNumber is required')
  if (!invoice.lines?.length) throw new TypeError('An invoice needs at least one line')

  const currency = invoice.currency ?? 'RSD'
  const documentType = invoice.documentType ?? 'Invoice'
  const typeCode = INVOICE_TYPE_CODE[documentType]
  const totals = computeTotals(invoice)

  const isBudgetCustomer = Boolean(invoice.customer.budgetId)
  const refs = invoice.references
  if (isBudgetCustomer && !refs?.contractNumber && !refs?.orderNumber && !refs?.lotNumber) {
    throw new TypeError(
      'The customer is a budget user (budgetId is set), so references.contractNumber, ' +
        'references.orderNumber, or references.lotNumber is mandatory.',
    )
  }
  if (documentType !== 'Invoice' && !invoice.documentReferences?.length) {
    throw new TypeError(
      `A ${documentType} must reference the document it corrects via documentReferences.`,
    )
  }

  const lines: XmlElement[] = invoice.lines.map((line, index) => {
    const category = line.vatCategory ?? TAX_CATEGORY.StandardRate
    const zeroTax = requiresExemptionReason(category)
    const net = dec(line.quantity).mul(dec(line.unitPrice)).sub(line.discount ?? 0).round(AMOUNT_SCALE)
    return el('cac:InvoiceLine', null, [
      leaf('cbc:ID', line.id ?? String(index + 1)),
      el('cbc:InvoicedQuantity', { unitCode: line.unitCode ?? UNIT.Piece }, dec(line.quantity).toString()),
      amountEl('cbc:LineExtensionAmount', net, currency),
      line.period
        ? el('cac:InvoicePeriod', null, [
            leaf('cbc:StartDate', line.period.start ? asDate(line.period.start) : undefined),
            leaf('cbc:EndDate', line.period.end ? asDate(line.period.end) : undefined),
          ])
        : undefined,
      line.discount
        ? el('cac:AllowanceCharge', null, [
            leaf('cbc:ChargeIndicator', 'false'),
            amountEl('cbc:Amount', line.discount, currency),
          ])
        : undefined,
      el('cac:Item', null, [
        leaf('cbc:Description', line.description),
        leaf('cbc:Name', line.name),
        line.sellersItemId
          ? el('cac:SellersItemIdentification', null, [leaf('cbc:ID', line.sellersItemId)])
          : undefined,
        line.standardItemId
          ? el('cac:StandardItemIdentification', null, [leaf('cbc:ID', line.standardItemId)])
          : undefined,
        el('cac:ClassifiedTaxCategory', null, [
          leaf('cbc:ID', category),
          zeroTax ? undefined : leaf('cbc:Percent', dec(line.vatRate ?? 20).toString(2)),
          el('cac:TaxScheme', null, [leaf('cbc:ID', 'VAT')]),
        ]),
      ]),
      el('cac:Price', null, [amountEl('cbc:PriceAmount', line.unitPrice, currency)]),
    ])
  })

  const root = el(
    'Invoice',
    {
      xmlns: NS.invoice,
      'xmlns:cac': NS.cac,
      'xmlns:cbc': NS.cbc,
      'xmlns:ext': NS.ext,
      'xmlns:sbt': NS.sbt,
    },
    [
      leaf('cbc:UBLVersionID', '2.1'),
      leaf('cbc:CustomizationID', CUSTOMIZATION_ID),
      leaf('cbc:ID', invoice.invoiceNumber),
      leaf('cbc:UUID', invoice.uuid),
      leaf('cbc:IssueDate', asDate(invoice.issueDate)),
      leaf('cbc:DueDate', invoice.dueDate ? asDate(invoice.dueDate) : undefined),
      leaf('cbc:InvoiceTypeCode', typeCode),
      leaf('cbc:Note', invoice.note),
      leaf('cbc:TaxPointDate', invoice.deliveryDate ? asDate(invoice.deliveryDate) : undefined),
      leaf('cbc:DocumentCurrencyCode', currency),
      leaf('cbc:BuyerReference', invoice.buyerReference),
      invoice.invoicePeriod
        ? el('cac:InvoicePeriod', null, [
            leaf('cbc:StartDate', invoice.invoicePeriod.start ? asDate(invoice.invoicePeriod.start) : undefined),
            leaf('cbc:EndDate', invoice.invoicePeriod.end ? asDate(invoice.invoicePeriod.end) : undefined),
            leaf('cbc:DescriptionCode', invoice.invoicePeriod.descriptionCode),
          ])
        : undefined,
      refs?.orderNumber
        ? el('cac:OrderReference', null, [leaf('cbc:ID', refs.orderNumber)])
        : undefined,
      ...(invoice.documentReferences ?? []).map((ref) =>
        el('cac:BillingReference', null, [
          el('cac:InvoiceDocumentReference', null, [
            leaf('cbc:ID', ref.id),
            leaf('cbc:IssueDate', ref.issueDate ? asDate(ref.issueDate) : undefined),
            leaf('cbc:DocumentTypeCode', ref.type),
          ]),
        ]),
      ),
      refs?.contractNumber
        ? el('cac:ContractDocumentReference', null, [leaf('cbc:ID', refs.contractNumber)])
        : undefined,
      refs?.lotNumber
        ? el('cac:AdditionalDocumentReference', null, [
            leaf('cbc:ID', refs.lotNumber),
            leaf('cbc:DocumentType', 'LOT'),
          ])
        : undefined,
      refs?.frameworkAgreementNumber
        ? el('cac:AdditionalDocumentReference', null, [
            leaf('cbc:ID', refs.frameworkAgreementNumber),
            leaf('cbc:DocumentType', 'FRAMEWORK'),
          ])
        : undefined,
      ...(invoice.attachments ?? []).map((att) =>
        el('cac:AdditionalDocumentReference', null, [
          leaf('cbc:ID', att.filename),
          leaf('cbc:DocumentDescription', att.description),
          el('cac:Attachment', null, [
            el(
              'cbc:EmbeddedDocumentBinaryObject',
              { mimeCode: att.mimeType, filename: att.filename },
              base64(att.content),
            ),
          ]),
        ]),
      ),
      partyElement('cac:AccountingSupplierParty', invoice.supplier, currency),
      partyElement('cac:AccountingCustomerParty', invoice.customer, currency),
      invoice.deliveryDate
        ? el('cac:Delivery', null, [leaf('cbc:ActualDeliveryDate', asDate(invoice.deliveryDate))])
        : undefined,
      invoice.payment
        ? el('cac:PaymentMeans', null, [
            leaf('cbc:PaymentMeansCode', invoice.payment.meansCode ?? PAYMENT_MEANS.CreditTransfer),
            leaf(
              'cbc:PaymentID',
              invoice.payment.reference?.number
                ? `${invoice.payment.reference.model ?? '97'}-${invoice.payment.reference.number}`
                : undefined,
            ),
            el('cac:PayeeFinancialAccount', null, [
              leaf('cbc:ID', invoice.payment.account),
              leaf('cbc:Name', invoice.payment.payeeName),
              invoice.payment.bankName
                ? el('cac:FinancialInstitutionBranch', null, [leaf('cbc:Name', invoice.payment.bankName)])
                : undefined,
            ]),
          ])
        : undefined,
      // Prepayments are deducted via PrepaidAmount and declared as references.
      ...(invoice.prepayments ?? []).map((pre) =>
        el('cac:AdditionalDocumentReference', null, [
          leaf('cbc:ID', pre.id),
          leaf('cbc:DocumentType', 'PREPAYMENT'),
          leaf('cbc:IssueDate', pre.issueDate ? asDate(pre.issueDate) : undefined),
        ]),
      ),
      el('cac:TaxTotal', null, [
        amountEl('cbc:TaxAmount', totals.taxTotal, currency),
        ...totals.subtotals.map((s) =>
          el('cac:TaxSubtotal', null, [
            amountEl('cbc:TaxableAmount', s.taxableAmount, currency),
            amountEl('cbc:TaxAmount', s.taxAmount, currency),
            taxCategoryElement(s),
          ]),
        ),
      ]),
      el('cac:LegalMonetaryTotal', null, [
        amountEl('cbc:LineExtensionAmount', totals.lineExtensionAmount, currency),
        amountEl('cbc:TaxExclusiveAmount', totals.taxExclusiveAmount, currency),
        amountEl('cbc:TaxInclusiveAmount', totals.taxInclusiveAmount, currency),
        totals.prepaidAmount.isZero()
          ? undefined
          : amountEl('cbc:PrepaidAmount', totals.prepaidAmount, currency),
        invoice.roundingAmount
          ? amountEl('cbc:PayableRoundingAmount', invoice.roundingAmount, currency)
          : undefined,
        amountEl('cbc:PayableAmount', totals.payableAmount, currency),
      ]),
      ...lines,
    ],
  )

  return { root, totals }
}

/** Build a SEF-ready UBL 2.1 invoice document. */
export function buildInvoiceXml(invoice: Invoice): string {
  return serialize(buildInvoice(invoice).root)
}
