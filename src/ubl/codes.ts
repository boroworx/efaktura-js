/**
 * Code lists used by the Serbian UBL profile.
 *
 * `TAX_CATEGORY` and `INVOICE_TYPE_CODE` are UNTDID lists fixed by EN 16931.
 * The VAT exemption reason *keys* are a Serbian codebook that changes over
 * time — fetch the authoritative list at runtime with
 * `sef.salesInvoices.exemptionReasons()` rather than hard-coding keys.
 */

/** UNTDID 5305 tax category codes, as used by SEF. */
export const TAX_CATEGORY = {
  /** Standard rate (opšta stopa, 20%). */
  StandardRate: 'S',
  /** Reverse charge — recipient computes the VAT. Tax amount must be 0. */
  ReverseCharge: 'AE',
  /** Exempt from VAT (poresko oslobođenje bez prava na odbitak). */
  Exempt: 'E',
  /** Zero-rated, with the right to deduct (oslobođenje sa pravom na odbitak). */
  ZeroRated: 'Z',
  /** Outside the scope of VAT (nije predmet oporezivanja). */
  OutsideScope: 'O',
  /** Not subject to Serbian VAT — export. */
  Export: 'K',
  /** Special retail / margin schemes. */
  SpecialScheme: 'SS',
  /** Not subject to VAT under Art. 6/6a (posebni postupci oporezivanja). */
  NotSubject: 'N',
  /** Annex III — reduced rate (posebna stopa, 10%). */
  ReducedRate: 'AA',
} as const

export type TaxCategoryCode = (typeof TAX_CATEGORY)[keyof typeof TAX_CATEGORY]

/**
 * Categories that must carry a zero tax amount and no percentage, and that
 * require a `TaxExemptionReason`. SEF rejects a non-zero amount on these
 * (`UBLNotAllowedTaxAmountForRecipientCalculatesVAT` and friends).
 */
export const ZERO_TAX_CATEGORIES: readonly TaxCategoryCode[] = ['AE', 'E', 'Z', 'O', 'K', 'N']

export const requiresExemptionReason = (category: TaxCategoryCode): boolean =>
  ZERO_TAX_CATEGORIES.includes(category)

/** UNTDID 1001 document type codes. */
export const INVOICE_TYPE_CODE = {
  Invoice: '380',
  CreditNote: '381',
  DebitNote: '383',
  /** Avansni račun. */
  Prepayment: '386',
} as const

export type DocumentTypeName = keyof typeof INVOICE_TYPE_CODE

/** UNTDID 4461 payment means. `30` (credit transfer) covers most SEF invoices. */
export const PAYMENT_MEANS = {
  CreditTransfer: '30',
  Cash: '10',
  Cheque: '20',
  DebitTransfer: '31',
  CardPayment: '48',
  DirectDebit: '49',
  StandingAgreement: '57',
  Compensation: '97',
} as const

/**
 * A few common UN/ECE Rec 20 unit codes. The full list is available from
 * `sef.reference.unitMeasures()`.
 */
export const UNIT = {
  Piece: 'H87',
  Kilogram: 'KGM',
  Gram: 'GRM',
  Tonne: 'TNE',
  Litre: 'LTR',
  Metre: 'MTR',
  SquareMetre: 'MTK',
  CubicMetre: 'MTQ',
  Kilometre: 'KMT',
  Hour: 'HUR',
  Day: 'DAY',
  Month: 'MON',
  Year: 'ANN',
  KilowattHour: 'KWH',
  /** Dimensionless "service"/lump sum. */
  Service: 'E48',
} as const

/** ISO 6523 identifier scheme for Serbian tax ids. */
export const SERBIA_ENDPOINT_SCHEME = '9948'

/** The document reference types SEF recognises on corrective documents. */
export const DOCUMENT_REFERENCE_TYPE = {
  CreditNoteReferenceToInvoice: 'CreditNoteReferenceToInvoice',
  CreditNoteReferenceToPrepaymentInvoice: 'CreditNoteReferenceToPrepaymentInvoice',
  CreditNoteReferenceToPeriod: 'CreditNoteReferenceToPeriod',
  StornoInvoice: 'StornoInvoice',
  StornoPrepayment: 'StornoPrepayment',
  StornoDebitNote: 'StornoDebitNote',
} as const
