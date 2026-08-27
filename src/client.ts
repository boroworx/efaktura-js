import { SefHttp, type SefClientOptions, type RequestOptions } from './http.ts'
import { SalesInvoices } from './resources/sales-invoices.ts'
import { PurchaseInvoices } from './resources/purchase-invoices.ts'
import { Vat } from './resources/vat.ts'
import {
  CirTickets, Fiscal, Notices, Customs, PublicPurchaseInvoices, Company, Reference,
} from './resources/misc.ts'
import { normalizeKeys } from './http.ts'
import type {
  SalesInvoiceStatusChangeDto,
  PurchaseInvoiceStatusChangeDto,
} from './generated/types.ts'

/**
 * Client for Serbia's eFaktura / SEF (Sistem elektronskih faktura) API.
 *
 * ```ts
 * const sef = new EFaktura({ apiKey: process.env.SEF_API_KEY!, environment: 'demo' })
 * const { salesInvoiceId } = await sef.salesInvoices.send(invoice)
 * ```
 *
 * One API key addresses exactly one company; SEF has no tenant header, so serve
 * several companies with several clients.
 */
export class EFaktura {
  readonly http: SefHttp

  readonly salesInvoices: SalesInvoices
  readonly purchaseInvoices: PurchaseInvoices
  readonly vat: Vat
  /** Invoices where this company is the public-procurement contractor. */
  readonly publicPurchaseInvoices: PublicPurchaseInvoices
  /** Central Invoice Register (CRF/CIR) tickets. */
  readonly cirTickets: CirTickets
  /** Fiscal bills from e-fiskalizacija. */
  readonly fiscal: Fiscal
  /** Recipient notices on input VAT. */
  readonly notices: Notices
  readonly customs: Customs
  readonly company: Company
  readonly reference: Reference

  constructor(options: SefClientOptions) {
    this.http = new SefHttp(options)
    this.salesInvoices = new SalesInvoices(this.http)
    this.purchaseInvoices = new PurchaseInvoices(this.http)
    this.vat = new Vat(this.http)
    this.publicPurchaseInvoices = new PublicPurchaseInvoices(this.http)
    this.cirTickets = new CirTickets(this.http)
    this.fiscal = new Fiscal(this.http)
    this.notices = new Notices(this.http)
    this.customs = new Customs(this.http)
    this.company = new Company(this.http)
    this.reference = new Reference(this.http)
  }

  /**
   * Enable status-change callbacks for the **next day** and return the
   * subscription key.
   *
   * This is not a standing subscription: SEF only arms it for one day, so call
   * it on a daily schedule. The callback URLs themselves are configured in the
   * portal under Podešavanja → API menadžment, not through the API.
   *
   * The returned key is echoed as `subscriptionKey` in every notification —
   * keep it and check it with `verifyNotification()`.
   */
  async subscribe(options?: RequestOptions): Promise<string> {
    return this.http.call('postSubscribe', {}, options)
  }
}

/** A status-change notification, as pushed to your callback URL or polled. */
export type StatusChangeNotification =
  | SalesInvoiceStatusChangeDto
  | PurchaseInvoiceStatusChangeDto

/**
 * Decode a status-change callback body.
 *
 * SEF POSTs the same payload the matching `changes` endpoint returns — an
 * array, with PascalCase keys — so this normalizes keys and always hands back
 * an array, whether SEF sent one object or many.
 */
export function parseNotification(body: string | unknown): StatusChangeNotification[] {
  const raw: unknown = typeof body === 'string' ? JSON.parse(body) : body
  const normalized = normalizeKeys(raw)
  if (Array.isArray(normalized)) return normalized as StatusChangeNotification[]
  if (normalized && typeof normalized === 'object') return [normalized as StatusChangeNotification]
  return []
}

/**
 * Check that a notification carries the subscription key returned by
 * `subscribe()`. SEF sends no signature header, so this in-body key is the only
 * authenticity signal available — compare it in constant time and reject
 * anything that does not match.
 */
export function verifyNotification(
  notification: StatusChangeNotification,
  subscriptionKey: string,
): boolean {
  const received = notification.subscriptionKey
  if (typeof received !== 'string' || received.length !== subscriptionKey.length) return false
  let diff = 0
  for (let i = 0; i < received.length; i++) {
    diff |= received.charCodeAt(i) ^ subscriptionKey.charCodeAt(i)
  }
  return diff === 0
}
