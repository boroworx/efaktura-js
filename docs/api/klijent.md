# Klijent

```ts
import { EFaktura } from 'efaktura-js'

const sef = new EFaktura({ apiKey, environment: 'demo' })
```

## Opcije

```ts
interface SefClientOptions {
  apiKey: string
  environment?: 'production' | 'demo'
  baseUrl?: string
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  requestsPerSecond?: number
  fetch?: typeof globalThis.fetch
  headers?: Record<string, string>
}
```

Značenje pojedinačnih opcija opisano je u odeljku [Okruženja](/uvod/okruzenja).

## Prostori imena

| Svojstvo | Sadržaj |
| --- | --- |
| `sef.salesInvoices` | [izlazne fakture](/api/izlazne-fakture) |
| `sef.purchaseInvoices` | [ulazne fakture](/api/ulazne-fakture) |
| `sef.vat` | [evidencija PDV-a](/api/pdv) |
| `sef.publicPurchaseInvoices` | dokumenta nosilaca javnih nabavki |
| `sef.cirTickets` | prigovori u CRF-u |
| `sef.fiscal` | fiskalni računi |
| `sef.notices` | obaveštenja o prethodnom porezu |
| `sef.customs` | uvozne carinske deklaracije |
| `sef.company` | podaci o preduzeću |
| `sef.reference` | šifarnici i registar |
| `sef.http` | neposredan pristup operacijama |

Ostali prostori imena opisani su u odeljku [Ostali resursi](/api/ostalo).

## Pretplata na obaveštenja

```ts
const subscriptionKey: string = await sef.subscribe()
```

Uključuje obaveštenja o promeni statusa **za naredni dan** i vraća ključ
pretplate. Pogledajte [Notifikacije](/vodici/notifikacije).

## Obrada dolaznih obaveštenja

```ts
import { parseNotification, verifyNotification } from 'efaktura-js'

const dogadjaji = parseNotification(telo)
verifyNotification(dogadjaji[0], subscriptionKey) // boolean
```

## Zajedničke opcije poziva

Svaka metoda prima i neobavezan poslednji parametar:

```ts
interface RequestOptions {
  signal?: AbortSignal
  timeout?: number
  headers?: Record<string, string>
}
```

```ts
await sef.salesInvoices.get(id, { timeout: 5000 })
```

## Neposredan pristup

Kada vam treba operacija koju prostori imena ne izlažu pod zgodnim imenom,
pozovite je preko njenog ključa:

```ts
await sef.http.call('getPurchaseInvoiceOverview', {
  query: { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
})
```

```ts
call<T>(
  key: OperationKey,
  args?: { path?: Record<string, string | number>; query?: Record<string, unknown>; body?: unknown },
  options?: RequestOptions,
): Promise<T>
```

Spisak ključeva je u odeljku [Sve operacije](/api/operacije).

## Rad sa datumima

Polja `dateFrom`, `dateTo` i `date` prihvataju `Date` ili tekst. Objekat tipa
`Date` pretvara se u odgovarajući oblik sam:

```ts
await sef.salesInvoices.ids({ dateFrom: new Date('2026-08-01'), dateTo: new Date() })
await sef.salesInvoices.changes('2026-08-26')
```
