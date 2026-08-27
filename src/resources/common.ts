import type { SefHttp, RequestOptions } from '../http.ts'

export type { RequestOptions }

/** Anything acceptable where SEF wants a date. */
export type DateInput = Date | string

/** `YYYY-MM-DD` — what the `changes` endpoints expect. */
export const asDate = (d: DateInput): string =>
  typeof d === 'string' ? d : d.toISOString().slice(0, 10)

/** Full ISO timestamp — what `dateFrom`/`dateTo` expect. */
export const asDateTime = (d: DateInput): string =>
  typeof d === 'string' ? d : d.toISOString()

/** A `dateFrom`/`dateTo` window. SEF has no pagination; every list is a window. */
export interface DateRange {
  dateFrom: DateInput
  dateTo: DateInput
}

export const range = (r: DateRange) => ({
  dateFrom: asDateTime(r.dateFrom),
  dateTo: asDateTime(r.dateTo),
})

/** Base class holding the transport for every resource namespace. */
export abstract class Resource {
  protected readonly http: SefHttp
  constructor(http: SefHttp) {
    this.http = http
  }
}

/**
 * Run `worker` over `items` with at most `limit` in flight, preserving order.
 * Used by the `iterate()` helpers, which turn an ID list into full documents.
 */
export async function* mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): AsyncGenerator<R> {
  const size = Math.max(1, Math.min(limit, items.length))
  const inFlight = new Map<number, Promise<R>>()
  let next = 0

  const start = (index: number) => {
    const pending = worker(items[index] as T, index)
    pending.catch(() => {})
    inFlight.set(index, pending)
  }

  try {
    for (let emit = 0; emit < items.length; emit++) {
      while (next < items.length && inFlight.size < size) start(next++)
      const pending = inFlight.get(emit)!
      inFlight.delete(emit)
      yield await pending
    }
  } finally {
    inFlight.clear()
  }
}
