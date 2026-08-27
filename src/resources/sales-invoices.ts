import { Resource, asDate, asDateTime, range, mapConcurrent } from './common.ts'
import type { DateInput, DateRange, RequestOptions } from './common.ts'
import type {
  MiniInvoiceDto,
  SimpleSalesInvoiceDto,
  SalesInvoicesDto,
  SalesInvoiceStatusChangeDto,
  InvoiceDto,
  ValueAddedTaxExemptionReasonDto,
  CirHistoryDto,
  InvoiceHistoryDto,
} from '../generated/types.ts'
import type { SalesInvoiceStatus } from '../generated/enums.ts'
import { buildInvoiceXml } from '../ubl/build.ts'
import type { Invoice } from '../ubl/build.ts'

/**
 * `sendToCir` decides whether the invoice is forwarded to the Central Invoice
 * Register. Mandatory when the buyer is a budget user.
 *
 * The OpenAPI spec declares only `Yes`/`No`, while the official PDF documents
 * `Default`/`Auto` as well. Both are accepted here; prefer `Yes`/`No`, which
 * every source agrees on.
 */
export type SendToCirValue = 'Yes' | 'No' | 'Default' | 'Auto' | boolean

export interface ImportOptions extends RequestOptions {
  /**
   * Idempotency key. SEF returns the original response when the same
   * `requestId` is replayed, so reuse it when retrying an uncertain failure.
   * One is generated automatically when omitted.
   */
  requestId?: string
  sendToCir?: SendToCirValue
  /** Ask SEF to validate before accepting. */
  executeValidation?: boolean
}

const cir = (v: SendToCirValue | undefined): string | undefined => {
  if (v === undefined) return undefined
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return v
}

const importQuery = (o: ImportOptions) => ({
  requestId: o.requestId ?? crypto.randomUUID(),
  sendToCir: cir(o.sendToCir),
  executeValidation: o.executeValidation,
})

export interface SalesInvoiceListFilter extends DateRange {
  status?: SalesInvoiceStatus | string
}

export class SalesInvoices extends Resource {
  /**
   * Build UBL from a plain invoice object and send it. The convenient path:
   * equivalent to `importUbl(buildInvoiceXml(invoice), options)`.
   */
  async send(invoice: Invoice, options: ImportOptions = {}): Promise<MiniInvoiceDto> {
    return this.importUbl(buildInvoiceXml(invoice), options)
  }

  /** Send a UBL 2.1 document you already have, as raw `application/xml`. */
  async importUbl(xml: string, options: ImportOptions = {}): Promise<MiniInvoiceDto> {
    return this.http.call('postSalesInvoiceUbl', { query: importQuery(options), body: xml }, options)
  }

  /** Same as `importUbl` but sent as a `multipart/form-data` file upload. */
  async uploadUbl(
    file: string | Uint8Array | Blob,
    options: ImportOptions = {},
  ): Promise<MiniInvoiceDto> {
    return this.http.call('postSalesInvoiceUblUpload', { query: importQuery(options), body: file }, options)
  }

  async get(invoiceId: number, options?: RequestOptions): Promise<SimpleSalesInvoiceDto> {
    return this.http.call('getSalesInvoice', { query: { invoiceId } }, options)
  }

  /** The invoice as UBL XML bytes. */
  async xml(invoiceId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call('getSalesInvoiceXml', { query: { invoiceId } }, options)
  }

  /** Human-readable PDF; SEF generates it on first request. */
  async pdf(invoiceId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call('getSalesInvoicePdf', { query: { invoiceId } }, options)
  }

  /** The SEF-signed (XAdES) document. */
  async signature(invoiceId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call('getSalesInvoiceSignature', { query: { invoiceId } }, options)
  }

  async statusHistoryPdf(invoiceId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call(
      'getSalesInvoiceStatusHistoryByInvoiceIdPdf',
      { path: { invoiceId } },
      options,
    )
  }

  /** IDs only — use `iterate()` to walk the documents themselves. */
  async ids(filter: SalesInvoiceListFilter, options?: RequestOptions): Promise<number[]> {
    const res = await this.http.call<SalesInvoicesDto>(
      'postSalesInvoiceIds',
      { query: { status: filter.status, ...range(filter) } },
      options,
    )
    return res?.salesInvoiceIds ?? []
  }

  /**
   * Status changes for a single past day. SEF keeps roughly one month of
   * history. This is the polling equivalent of the status-change callback.
   */
  async changes(date: DateInput, options?: RequestOptions): Promise<SalesInvoiceStatusChangeDto[]> {
    return this.http.call('postSalesInvoiceChanges', { query: { date: asDate(date) } }, options)
  }

  /** Allowed only from Draft, New, or Mistake. `comment` is mandatory. */
  async cancel(invoiceId: number, comment: string, options?: RequestOptions): Promise<InvoiceDto> {
    return this.http.call(
      'postSalesInvoiceCancel',
      { body: { invoiceId, cancelComments: comment } },
      options,
    )
  }

  /** Allowed only from Approved, Rejected, or Sent. `comment` is mandatory. */
  async storno(
    invoiceId: number,
    comment: string,
    opts: { stornoNumber?: string } & RequestOptions = {},
  ): Promise<InvoiceDto> {
    return this.http.call(
      'postSalesInvoiceStorno',
      { body: { invoiceId, stornoComment: comment, stornoNumber: opts.stornoNumber } },
      opts,
    )
  }

  /** Delete drafts/new invoices in bulk. Anything else is silently ignored. */
  async delete(invoiceIds: readonly number[], options?: RequestOptions): Promise<number[]> {
    return this.http.call('deleteSalesInvoice', { body: invoiceIds }, options)
  }

  async deleteOne(invoiceId: number, options?: RequestOptions): Promise<number> {
    return this.http.call('deleteSalesInvoiceByInvoiceId', { path: { invoiceId } }, options)
  }

  /** The VAT exemption codebook `cbc:TaxExemptionReason` keys are drawn from. */
  async exemptionReasons(options?: RequestOptions): Promise<ValueAddedTaxExemptionReasonDto[]> {
    return this.http.call('getSalesInvoiceGetValueAddedTaxExemptionReasonList', {}, options)
  }

  /**
   * Walk full invoices for a window. SEF only offers an ID list, so this pairs
   * `ids()` with concurrent `get()`s (the client paces itself to 3 req/s).
   */
  async *iterate(
    filter: SalesInvoiceListFilter & { concurrency?: number },
    options?: RequestOptions,
  ): AsyncGenerator<SimpleSalesInvoiceDto> {
    const ids = await this.ids(filter, options)
    yield* mapConcurrent(ids, filter.concurrency ?? 3, (id) => this.get(id, options))
  }

  /** CIR/CRF views of a sales invoice, keyed by the CIR id (not the SEF id). */
  readonly cir = {
    assignationHistory: (cirInvoiceId: string, options?: RequestOptions): Promise<InvoiceHistoryDto> =>
      this.http.call(
        'getSalesCirInvoiceGetSalesInvoiceAssignationHistoryByCirInvoiceId',
        { path: { cirInvoiceId } },
        options,
      ),
    paymentsAndHistory: (cirInvoiceId: string, options?: RequestOptions): Promise<CirHistoryDto> =>
      this.http.call(
        'getSalesCirInvoiceGetInvoicePaymentsAndHistoryByCirInvoiceId',
        { path: { cirInvoiceId } },
        options,
      ),
  }
}

export { asDateTime }
