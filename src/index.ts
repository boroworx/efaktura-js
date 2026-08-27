export { EFaktura, parseNotification, verifyNotification } from './client.ts'
export type { StatusChangeNotification } from './client.ts'

export {
  SefHttp, ENVIRONMENTS, normalizeKeys,
} from './http.ts'
export type {
  SefClientOptions, SefEnvironment, RequestOptions, CallArgs,
} from './http.ts'

export {
  SefError, SefAuthError, SefValidationError, SefRateLimitError, SefServerError,
  SefConnectionError,
} from './errors.ts'
export type { SefErrorBody } from './errors.ts'

export { operations } from './generated/operations.ts'
export type { OperationDef, OperationKey } from './generated/operations.ts'
export * from './generated/enums.ts'
export type * from './generated/types.ts'

// UBL layer. Also importable on its own via `efaktura-js/ubl` when you only need
// to build or read documents.
export {
  buildInvoice, buildInvoiceXml, computeTotals, parseInvoiceXml, inspectInvoice,
  CUSTOMIZATION_ID, NS,
  TAX_CATEGORY, INVOICE_TYPE_CODE, PAYMENT_MEANS, UNIT,
  DOCUMENT_REFERENCE_TYPE, SERBIA_ENDPOINT_SCHEME,
  ZERO_TAX_CATEGORIES, requiresExemptionReason,
  Decimal,
} from './ubl/index.ts'
export type {
  Invoice, InvoiceLineInput, Party, Address, PaymentInput,
  DocumentReferenceInput, PrepaymentInput, AttachmentInput,
  InvoiceTotals, TaxSubtotal, ParsedInvoice,
  Inspection, Finding, Severity, AmountDifference,
  TaxCategoryCode, DocumentTypeName,
} from './ubl/index.ts'

export type { DateRange, DateInput } from './resources/common.ts'
export type { SalesInvoiceListFilter, ImportOptions, SendToCirValue } from './resources/sales-invoices.ts'
export type { PurchaseInvoiceListFilter } from './resources/purchase-invoices.ts'
export {
  VAT_PERIOD_V2, VAT_RECORDING_STATUS_V2, DOCUMENT_DIRECTION_V2, DOCUMENT_TYPE_V2,
  INTERNAL_INVOICE_OPTION_V2, RELATED_INVOICE_OPTION_V2, RELATED_INTERNAL_INVOICE_OPTION_V2,
} from './resources/vat.ts'
