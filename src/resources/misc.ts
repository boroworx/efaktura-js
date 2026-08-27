import { Resource, asDate, range } from './common.ts'
import type { DateInput, DateRange, RequestOptions } from './common.ts'
import type {
  CirTicketListResponse,
  CirTicketSearchParameter,
  AddCirTicketRequest,
  CirTicketHistoryDto,
  FiscalBillOutputApiDto,
  FiscalBillViewDto,
  SenderRecipientsNoticeRequest,
  FullSenderRecipientsNoticeAPIDto,
  FullReceiverRecipientsNoticeAPIDto,
  CustomsDeclarationIdsResponse,
  CustomsDeclarationStatusChangeResponse,
  CustomsDeclarationDto,
  CustomsDeclarationItemDto,
  SimplePurchaseInvoiceDto,
  PurchaseInvoicesDto,
  PurchaseInvoiceStatusChangeDto,
  CompanyAccountIdentificationDto,
  CompanyAccountOnEfAkturaDto,
} from '../generated/types.ts'

/** Tickets raised against invoices in the Central Invoice Register (CRF/CIR). */
export class CirTickets extends Resource {
  async byInvoice(
    cirInvoiceId: string,
    onlyActiveTickets = true,
    options?: RequestOptions,
  ): Promise<CirTicketListResponse> {
    return this.http.call(
      'getCirTicketsByCirInvoiceIdByOnlyActiveTickets',
      { path: { cirInvoiceId, onlyActiveTickets: String(onlyActiveTickets) } },
      options,
    )
  }

  async find(
    search: CirTicketSearchParameter,
    options?: RequestOptions,
  ): Promise<CirTicketListResponse> {
    return this.http.call('postCirTicketsFind', { body: search }, options)
  }

  async create(ticket: AddCirTicketRequest, options?: RequestOptions): Promise<number> {
    return this.http.call('postCirTicketsAddCirTicket', { body: ticket }, options)
  }

  async history(cirTicketId: number, options?: RequestOptions): Promise<CirTicketHistoryDto> {
    return this.http.call(
      'getCirTicketsGetCirTicketHistoryByCirTicketId',
      { path: { cirTicketId } },
      options,
    )
  }
}

/**
 * Fiscal bills (e-fiskalizacija) linked to this company.
 *
 * `byNumber` and `byDate` share one route template on SEF's side and are told
 * apart by the value's format, so pass a well-formed bill number or date.
 */
export class Fiscal extends Resource {
  readonly sales = {
    byNumber: (fiscalBillNumber: string, options?: RequestOptions): Promise<FiscalBillOutputApiDto> =>
      this.http.call(
        'getEfiscalizationSalesFiscalBillByFiscalBillNumber',
        { path: { fiscalBillNumber } },
        options,
      ),
    byDate: (date: DateInput, options?: RequestOptions): Promise<FiscalBillViewDto> =>
      this.http.call(
        'getEfiscalizationSalesFiscalBillByDateToGet',
        { path: { dateToGet: asDate(date) } },
        options,
      ),
  }

  readonly purchase = {
    byNumber: (fiscalBillNumber: string, options?: RequestOptions): Promise<FiscalBillOutputApiDto> =>
      this.http.call(
        'getEfiscalizationPurchaseFiscalBillByFiscalBillNumber',
        { path: { fiscalBillNumber } },
        options,
      ),
    byDate: (date: DateInput, options?: RequestOptions): Promise<FiscalBillViewDto> =>
      this.http.call(
        'getEfiscalizationPurchaseFiscalBillByDateToGet',
        { path: { dateToGet: asDate(date) } },
        options,
      ),
  }
}

/** Recipient's notice on input VAT (obaveštenje primaoca o prethodnom porezu). */
export class Notices extends Resource {
  readonly sent = {
    send: (
      notice: SenderRecipientsNoticeRequest,
      options?: RequestOptions,
    ): Promise<FullSenderRecipientsNoticeAPIDto> =>
      this.http.call('postRecipientsNoticeOnInputVatSenderSend', { body: notice }, options),

    get: (noticeId: number, options?: RequestOptions): Promise<FullSenderRecipientsNoticeAPIDto> =>
      this.http.call(
        'getRecipientsNoticeOnInputVatSenderByNoticeId',
        { path: { noticeId } },
        options,
      ),

    list: (
      window: DateRange,
      options?: RequestOptions,
    ): Promise<FullSenderRecipientsNoticeAPIDto[]> =>
      this.http.call(
        'getRecipientsNoticeOnInputVatSenderDateRange',
        { query: range(window) },
        options,
      ),

    /** Notices that failed to send. */
    mistakes: (options?: RequestOptions): Promise<FullSenderRecipientsNoticeAPIDto[]> =>
      this.http.call('getRecipientsNoticeOnInputVatSenderMistakeStatus', {}, options),

    pdf: (noticeId: number, options?: RequestOptions): Promise<Uint8Array> =>
      this.http.call(
        'getRecipientsNoticeOnInputVatSenderByNoticeIdPdf',
        { path: { noticeId } },
        options,
      ),
  }

  readonly received = {
    get: (noticeId: number, options?: RequestOptions): Promise<FullReceiverRecipientsNoticeAPIDto> =>
      this.http.call(
        'getRecipientsNoticeOnInputVatRecipientByNoticeId',
        { path: { noticeId } },
        options,
      ),

    list: (
      window: DateRange,
      options?: RequestOptions,
    ): Promise<FullReceiverRecipientsNoticeAPIDto[]> =>
      this.http.call(
        'getRecipientsNoticeOnInputVatRecipientDateRange',
        { query: range(window) },
        options,
      ),

    pdf: (noticeId: number, options?: RequestOptions): Promise<Uint8Array> =>
      this.http.call(
        'getRecipientsNoticeOnInputVatRecipientByNoticeIdPdf',
        { path: { noticeId } },
        options,
      ),
  }
}

/** Customs import declarations (uvozne carinske deklaracije). */
export class Customs extends Resource {
  async ids(
    filter: DateRange & { duties?: boolean },
    options?: RequestOptions,
  ): Promise<CustomsDeclarationIdsResponse> {
    return this.http.call(
      'postCustomsAdministrationImportDeclarationsIds',
      { query: { duties: filter.duties, ...range(filter) } },
      options,
    )
  }

  async changes(
    date: DateInput,
    options?: RequestOptions,
  ): Promise<CustomsDeclarationStatusChangeResponse> {
    return this.http.call(
      'getCustomsAdministrationImportDeclarationsChanges',
      { query: { date: asDate(date) } },
      options,
    )
  }

  /** The currently active version of a declaration. */
  async get(
    customsDeclarationId: string,
    options?: RequestOptions,
  ): Promise<CustomsDeclarationDto> {
    return this.http.call(
      'getCustomsAdministrationImportDeclarationsByCustomsDeclarationId',
      { path: { customsDeclarationId } },
      options,
    )
  }

  async getVersion(
    customsDeclarationId: string,
    version: number,
    options?: RequestOptions,
  ): Promise<CustomsDeclarationDto> {
    return this.http.call(
      'getCustomsAdministrationImportDeclarationsByCustomsDeclarationIdVersionByVersion',
      { path: { customsDeclarationId, version } },
      options,
    )
  }

  async item(
    customsDeclarationId: string,
    version: number,
    itemOrdinalNumber: number,
    options?: RequestOptions,
  ): Promise<CustomsDeclarationItemDto> {
    return this.http.call(
      'getCustomsAdministrationImportDeclarationsByCustomsDeclarationIdVersionByVersionItemsByItemOrdinalNumber',
      { path: { customsDeclarationId, version, itemOrdinalNumber } },
      options,
    )
  }
}

/**
 * Invoices visible to the signer of a public-procurement contract, where this
 * company is the contractor rather than the buyer.
 */
export class PublicPurchaseInvoices extends Resource {
  async get(invoiceId: number, options?: RequestOptions): Promise<SimplePurchaseInvoiceDto> {
    return this.http.call('getPublicPurchaseContractorInvoice', { query: { invoiceId } }, options)
  }

  async xml(invoiceId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call('getPublicPurchaseContractorInvoiceXml', { query: { invoiceId } }, options)
  }

  async signature(invoiceId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call(
      'getPublicPurchaseContractorInvoiceSignature',
      { query: { invoiceId } },
      options,
    )
  }

  async ids(
    filter: DateRange & { status?: string },
    options?: RequestOptions,
  ): Promise<number[]> {
    const res = await this.http.call<PurchaseInvoicesDto>(
      'postPublicPurchaseContractorInvoiceIds',
      { query: { status: filter.status, ...range(filter) } },
      options,
    )
    return res?.purchaseInvoiceIds ?? []
  }

  async changes(
    date: DateInput,
    options?: RequestOptions,
  ): Promise<PurchaseInvoiceStatusChangeDto[]> {
    return this.http.call(
      'postPublicPurchaseContractorInvoiceChanges',
      { query: { date: asDate(date) } },
      options,
    )
  }
}

export class Company extends Resource {
  /**
   * Whether a company has an active eFaktura account — check this before
   * invoicing a new counterparty. `jbkjs` is required for budget users.
   *
   * This endpoint needs no API key.
   */
  async isRegistered(
    identification: CompanyAccountIdentificationDto,
    options?: RequestOptions,
  ): Promise<boolean> {
    const res = await this.http.call<CompanyAccountOnEfAkturaDto>(
      'postCompanyCheckIfCompanyRegisteredOnEfaktura',
      { body: identification },
      options,
    )
    return res?.eFakturaRegisteredCompany ?? false
  }

  /** Ask SEF to refresh this company's data from the source registers. */
  async update(options?: RequestOptions): Promise<void> {
    return this.http.call('putCompanyUpdateCompany', {}, options)
  }
}

/** Codebooks and registry data. */
export class Reference extends Resource {
  /** UN/ECE Rec 20 unit-of-measure codes. All fields should be treated as optional. */
  async unitMeasures(options?: RequestOptions): Promise<unknown[]> {
    return this.http.call('getGetUnitMeasures', {}, options)
  }

  /**
   * Every company registered on SEF. This is a multi-megabyte response and
   * needs no API key.
   */
  async companies(
    opts: { includeAllStatuses?: boolean } & RequestOptions = {},
  ): Promise<unknown[]> {
    return this.http.call(
      'getGetAllCompanies',
      { query: { includeAllStatuses: opts.includeAllStatuses } },
      opts,
    )
  }

  /** The same registry as a downloadable file rather than JSON. */
  async downloadCompanies(
    opts: { includeAllStatuses?: boolean } & RequestOptions = {},
  ): Promise<Uint8Array> {
    return this.http.call(
      'getDownloadAllCompanies',
      { query: { includeAllStatuses: opts.includeAllStatuses } },
      opts,
    )
  }

  /** The running SEF version, e.g. `{ version: '3.7' }`. */
  async version(options?: RequestOptions): Promise<{ version?: string }> {
    return this.http.call('getGetEfakturaVersion', {}, options)
  }
}
