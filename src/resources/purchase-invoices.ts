import { Resource, asDate, range, mapConcurrent } from './common.ts'
import type { DateInput, DateRange, RequestOptions } from './common.ts'
import type {
  SimplePurchaseInvoiceDto,
  PurchaseInvoicesDto,
  PurchaseInvoiceStatusChangeDto,
  PurchaseInvoiceOverviewDto,
  PurchaseInvoiceDto,
  AcceptRejectResponse,
  AcceptRejectPurchaseInvoiceResponse,
  CirHistoryDto,
  InvoiceHistoryDto,
} from '../generated/types.ts'
import type { PurchaseInvoiceStatus } from '../generated/enums.ts'

export interface PurchaseInvoiceListFilter extends DateRange {
  status?: PurchaseInvoiceStatus | string
}

export class PurchaseInvoices extends Resource {
  async get(invoiceId: number, options?: RequestOptions): Promise<SimplePurchaseInvoiceDto> {
    return this.http.call('getPurchaseInvoice', { query: { invoiceId } }, options)
  }

  async xml(invoiceId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call('getPurchaseInvoiceXml', { query: { invoiceId } }, options)
  }

  /** UBL fetched by CIR/CRF id rather than SEF invoice id. */
  async xmlByCirId(cirInvoiceId: string, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call('getPurchaseInvoiceUblByCirInvoiceId', { path: { cirInvoiceId } }, options)
  }

  async pdf(invoiceId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call('getPurchaseInvoicePdf', { query: { invoiceId } }, options)
  }

  async signature(invoiceId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call('getPurchaseInvoiceSignature', { query: { invoiceId } }, options)
  }

  async statusHistoryPdf(invoiceId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call(
      'getPurchaseInvoiceStatusHistoryByInvoiceIdPdf',
      { path: { invoiceId } },
      options,
    )
  }

  async ids(filter: PurchaseInvoiceListFilter, options?: RequestOptions): Promise<number[]> {
    const res = await this.http.call<PurchaseInvoicesDto>(
      'postPurchaseInvoiceIds',
      { query: { status: filter.status, ...range(filter) } },
      options,
    )
    return res?.purchaseInvoiceIds ?? []
  }

  /**
   * Richer than `ids()` — one call returns supplier, amounts, and dates for the
   * whole window, so prefer it when syncing inbound invoices.
   */
  async overview(
    filter: PurchaseInvoiceListFilter,
    options?: RequestOptions,
  ): Promise<PurchaseInvoiceOverviewDto[]> {
    return this.http.call(
      'getPurchaseInvoiceOverview',
      { query: { status: filter.status, ...range(filter) } },
      options,
    )
  }

  async changes(
    date: DateInput,
    options?: RequestOptions,
  ): Promise<PurchaseInvoiceStatusChangeDto[]> {
    return this.http.call('postPurchaseInvoiceChanges', { query: { date: asDate(date) } }, options)
  }

  /** Accept an inbound invoice. `comment` is optional when accepting. */
  async accept(
    invoiceId: number,
    comment?: string,
    options?: RequestOptions,
  ): Promise<AcceptRejectResponse> {
    return this.#acceptReject(invoiceId, true, comment, options)
  }

  /** Reject an inbound invoice. SEF requires a comment when rejecting. */
  async reject(
    invoiceId: number,
    comment: string,
    options?: RequestOptions,
  ): Promise<AcceptRejectResponse> {
    if (!comment?.trim()) throw new TypeError('A comment is required when rejecting an invoice')
    return this.#acceptReject(invoiceId, false, comment, options)
  }

  #acceptReject(
    invoiceId: number,
    accepted: boolean,
    comment: string | undefined,
    options?: RequestOptions,
  ): Promise<AcceptRejectResponse> {
    return this.http.call(
      'postPurchaseInvoiceAcceptRejectPurchaseInvoice',
      { body: { invoiceId, accepted, comment } },
      options,
    )
  }

  async acceptByCirId(
    cirInvoiceId: string,
    comment?: string,
    options?: RequestOptions,
  ): Promise<AcceptRejectPurchaseInvoiceResponse> {
    return this.http.call(
      'postPurchaseInvoiceAcceptRejectPurchaseInvoiceByCirInvoiceId',
      { body: { cirInvoiceId, accepted: true, comment } },
      options,
    )
  }

  async rejectByCirId(
    cirInvoiceId: string,
    comment: string,
    options?: RequestOptions,
  ): Promise<AcceptRejectPurchaseInvoiceResponse> {
    if (!comment?.trim()) throw new TypeError('A comment is required when rejecting an invoice')
    return this.http.call(
      'postPurchaseInvoiceAcceptRejectPurchaseInvoiceByCirInvoiceId',
      { body: { cirInvoiceId, accepted: false, comment } },
      options,
    )
  }

  /**
   * Record VAT the recipient calculated, for a reverse-charge (category AE)
   * invoice.
   */
  async vatReverseCharge(
    purchaseInvoiceId: number,
    vatAmount: number,
    options?: RequestOptions,
  ): Promise<void> {
    return this.http.call(
      'postPurchaseInvoiceVatReverseCharge',
      { body: { purchaseInvoiceId, vatAmount } },
      options,
    )
  }

  /** Assign a CIR invoice to a budget user (ustupanje). */
  async assign(
    cirInvoiceId: string,
    assignation: { assignerPartyJBKJS: string; assignationContractNumber: string },
    options?: RequestOptions,
  ): Promise<PurchaseInvoiceDto> {
    return this.http.call(
      'postPurchaseInvoiceByCirInvoiceIdAssign',
      {
        path: { cirInvoiceId },
        query: {
          AssignerPartyJBKJS: assignation.assignerPartyJBKJS,
          AssignationContractNumber: assignation.assignationContractNumber,
        },
      },
      options,
    )
  }

  /** Undo an assignment. SEF exposes this as a GET even though it mutates. */
  async cancelAssign(cirInvoiceId: string, options?: RequestOptions): Promise<PurchaseInvoiceDto> {
    return this.http.call(
      'getPurchaseInvoiceByCirInvoiceIdCancelassign',
      { path: { cirInvoiceId } },
      options,
    )
  }

  async *iterate(
    filter: PurchaseInvoiceListFilter & { concurrency?: number },
    options?: RequestOptions,
  ): AsyncGenerator<SimplePurchaseInvoiceDto> {
    const ids = await this.ids(filter, options)
    yield* mapConcurrent(ids, filter.concurrency ?? 3, (id) => this.get(id, options))
  }

  readonly cir = {
    assignationHistory: (cirInvoiceId: string, options?: RequestOptions): Promise<InvoiceHistoryDto> =>
      this.http.call(
        'getPurchaseCirInvoiceGetPurchaseInvoiceAssignationHistoryByCirInvoiceId',
        { path: { cirInvoiceId } },
        options,
      ),
    paymentsAndHistory: (cirInvoiceId: string, options?: RequestOptions): Promise<CirHistoryDto> =>
      this.http.call(
        'getPurchaseCirInvoiceGetInvoicePaymentsAndHistoryByCirInvoiceId',
        { path: { cirInvoiceId } },
        options,
      ),
  }
}
