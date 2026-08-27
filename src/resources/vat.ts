import { Resource, range } from './common.ts'
import type { DateRange, RequestOptions } from './common.ts'
import type {
  IndividualVatRecordDto,
  IndividualVatRecordResponseDto,
  IndividualVatRecordListItemDto,
  GroupVatRecordDto,
  GroupVatRecordResponseDto,
  IndividualVatAddDto,
  IndividualVatDto,
  IndividualVatListDto,
  GroupVatAddDto,
  GroupVatDto,
  GroupVatListDto,
} from '../generated/types.ts'

/**
 * Individual VAT records (pojedinačna evidencija PDV), v2 — the surface in
 * force since the 2024 "elektronsko evidentiranje obračuna PDV" rules.
 *
 * Note that v2 encodes its enums as integers, unlike v1's strings; see
 * `VAT_PERIOD_V2` and friends in this module.
 */
class IndividualVatV2 extends Resource {
  async record(
    body: IndividualVatRecordDto,
    options?: RequestOptions,
  ): Promise<IndividualVatRecordResponseDto> {
    return this.http.call('v2PostVatRecordingIndividual', { body }, options)
  }

  /** Supersede a recorded entry. Only `Recorded` records may be corrected. */
  async correct(
    individualVatId: number,
    body: IndividualVatRecordDto,
    options?: RequestOptions,
  ): Promise<IndividualVatRecordResponseDto> {
    return this.http.call(
      'v2PostVatRecordingIndividualCorrectionByIndividualVatId',
      { path: { individualVatId }, body },
      options,
    )
  }

  /** Cancels every version of the record. */
  async cancel(individualVatId: number, options?: RequestOptions): Promise<number> {
    return this.http.call(
      'v2PostVatRecordingIndividualCancelByIndividualVatId',
      { path: { individualVatId } },
      options,
    )
  }

  async get(
    individualVatId: number,
    options?: RequestOptions,
  ): Promise<IndividualVatRecordResponseDto> {
    return this.http.call(
      'v2GetVatRecordingIndividualByIndividualVatId',
      { path: { individualVatId } },
      options,
    )
  }

  async list(
    window: DateRange,
    options?: RequestOptions,
  ): Promise<IndividualVatRecordListItemDto[]> {
    return this.http.call('v2GetVatRecordingIndividual', { query: range(window) }, options)
  }

  async pdf(individualVatId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call(
      'v2GetVatRecordingIndividualByIndividualVatIdPdf',
      { path: { individualVatId } },
      options,
    )
  }
}

/** Group / summary VAT records (zbirna evidencija PDV), v2. */
class GroupVatV2 extends Resource {
  async record(body: GroupVatRecordDto, options?: RequestOptions): Promise<GroupVatRecordResponseDto> {
    return this.http.call('v2PostVatRecordingGroup', { body }, options)
  }

  async correct(
    groupVatId: number,
    body: GroupVatRecordDto,
    options?: RequestOptions,
  ): Promise<GroupVatRecordResponseDto> {
    return this.http.call(
      'v2PostVatRecordingGroupCorrectionByGroupVatId',
      { path: { groupVatId }, body },
      options,
    )
  }

  async cancel(groupVatId: number, options?: RequestOptions): Promise<number> {
    return this.http.call(
      'v2PostVatRecordingGroupCancelByGroupVatId',
      { path: { groupVatId } },
      options,
    )
  }

  async get(groupVatId: number, options?: RequestOptions): Promise<GroupVatRecordResponseDto> {
    return this.http.call('v2GetVatRecordingGroupByGroupVatId', { path: { groupVatId } }, options)
  }

  async list(window: DateRange, options?: RequestOptions): Promise<GroupVatRecordResponseDto[]> {
    return this.http.call('v2GetVatRecordingGroup', { query: range(window) }, options)
  }

  async pdf(groupVatId: number, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.call('v2GetVatRecordingGroupByGroupVatIdPdf', { path: { groupVatId } }, options)
  }
}

/**
 * The pre-September-2024 VAT recording surface. Kept because records created
 * under the old rules are still readable and cancellable through it.
 */
class IndividualVatV1 extends Resource {
  /** Passing `individualVatId` turns the call into a correction. */
  async record(
    body: IndividualVatAddDto,
    opts: { individualVatId?: number } & RequestOptions = {},
  ): Promise<IndividualVatDto> {
    return this.http.call(
      'postVatRecordingIndividual',
      { query: { individualVatId: opts.individualVatId }, body },
      opts,
    )
  }

  async get(individualVatId: number, options?: RequestOptions): Promise<IndividualVatDto> {
    return this.http.call(
      'getVatRecordingIndividualByIndividualVatId',
      { path: { individualVatId } },
      options,
    )
  }

  async list(window: DateRange, options?: RequestOptions): Promise<IndividualVatListDto[]> {
    return this.http.call('getVatRecordingIndividual', { query: range(window) }, options)
  }

  async cancel(individualVatId: number, options?: RequestOptions): Promise<number> {
    return this.http.call(
      'postVatRecordingIndividualCancelByIndividualVatId',
      { path: { individualVatId } },
      options,
    )
  }
}

class GroupVatV1 extends Resource {
  async record(
    body: GroupVatAddDto,
    opts: { groupVatId?: number } & RequestOptions = {},
  ): Promise<GroupVatDto> {
    return this.http.call('postVatRecordingGroup', { query: { groupVatId: opts.groupVatId }, body }, opts)
  }

  async get(groupVatId: number, options?: RequestOptions): Promise<GroupVatDto> {
    return this.http.call('getVatRecordingGroupByGroupVatId', { path: { groupVatId } }, options)
  }

  async list(window: DateRange, options?: RequestOptions): Promise<GroupVatListDto[]> {
    return this.http.call('getVatRecordingGroup', { query: range(window) }, options)
  }

  async cancel(groupVatId: number, options?: RequestOptions): Promise<number> {
    return this.http.call(
      'postVatRecordingGroupCancelByGroupVatId',
      { path: { groupVatId } },
      options,
    )
  }
}

/**
 * VAT recording. `vat.individual` / `vat.group` are the current (v2) API;
 * `vat.v1.*` is the legacy surface.
 */
export class Vat extends Resource {
  readonly individual = new IndividualVatV2(this.http)
  readonly group = new GroupVatV2(this.http)
  readonly v1 = {
    individual: new IndividualVatV1(this.http),
    group: new GroupVatV1(this.http),
  }
}

/**
 * v2 encodes enums as plain integers with no named schema, so these tables come
 * from the official specification PDF rather than the OpenAPI document.
 *
 * `DOCUMENT_TYPE_V2` uses UNTDID 1001 codes; note that `VAT_RECORDING_STATUS_V2`
 * numbering does not match the ordering of v1's string enum.
 */
export const VAT_PERIOD_V2 = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
  FirstQuarter: 13, SecondQuarter: 14, ThirdQuarter: 15, FourthQuarter: 16,
} as const

export const VAT_RECORDING_STATUS_V2 = {
  Draft: 0, Recorded: 10, Replaced: 20, Cancelled: 30,
} as const

export const DOCUMENT_DIRECTION_V2 = { Inbound: 0, Outbound: 1 } as const

export const DOCUMENT_TYPE_V2 = {
  Invoice: 380,
  CreditNote: 381,
  DebitNote: 383,
  PrepaymentInvoice: 386,
  InternalAccountForTurnoverOfForeigner: 400,
  OtherInternalStatement: 401,
} as const

export const INTERNAL_INVOICE_OPTION_V2 = {
  None: 0, Turnover: 1, Prepayment: 2, Increase: 3, Reduction: 4,
} as const

export const RELATED_INVOICE_OPTION_V2 = {
  None: 0, Invoice: 1, Period: 2, PrepaymentInvoice: 3,
} as const

export const RELATED_INTERNAL_INVOICE_OPTION_V2 = {
  None: 0, InternalInvoiceForTurnover: 1, InternalInvoiceForPrepayment: 2,
} as const
