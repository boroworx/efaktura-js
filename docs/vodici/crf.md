# CRF i budžetski korisnici

Centralni registar faktura (CRF) vodi Uprava za trezor i kroz njega prolaze sve
fakture upućene korisnicima javnih sredstava.

## Slanje u CRF

Slanje u registar nije zasebna operacija, nego parametar pri slanju fakture:

```ts
await sef.salesInvoices.send(faktura, { sendToCir: true })
```

Vrednost može biti logička (`true` i `false` postaju `Yes` i `No`) ili tekstualna
(`'Yes'`, `'No'`, `'Default'`, `'Auto'`).

::: warning Neusaglašenost izvora
OpenAPI dokument navodi samo `Yes` i `No`, dok zvanična dokumentacija pominje i
`Default` i `Auto`. Biblioteka prihvata sve četiri vrednosti, ali su `Yes` i `No`
jedine oko kojih se izvori slažu.
:::

Faktura u stranoj valuti ne može se poslati u CRF.

## Obavezne reference

Kada je kupac korisnik javnih sredstava, dokument mora sadržati bar jednu
referencu: broj ugovora, broj narudžbenice ili broj partije.

```ts
await sef.salesInvoices.send({
  ...faktura,
  customer: {
    name: 'Ministarstvo',
    vatId: '108213413',
    registrationId: '17862146',
    budgetId: '10520', // JBKJS
  },
  references: { contractNumber: 'UG-2026-1' },
})
```

Popunjeno polje `budgetId` označava korisnika javnih sredstava. Builder odbija
dokument bez reference pre nego što zahtev ode na mrežu.

## Identifikator iz CRF-a

Fakture u registru imaju sopstveni identifikator, različit od identifikatora u
SEF-u. Operacije koje rade nad registrom primaju taj identifikator.

```ts
const faktura = await sef.salesInvoices.get(salesInvoiceId)
const cirId = faktura.cirInvoiceId
const cirStatus = faktura.cirStatus // 'ActiveCir', 'Settled', 'Assigned' …
```

## Plaćanja i istorija

```ts
await sef.salesInvoices.cir.paymentsAndHistory(cirInvoiceId)
await sef.salesInvoices.cir.assignationHistory(cirInvoiceId)

await sef.purchaseInvoices.cir.paymentsAndHistory(cirInvoiceId)
await sef.purchaseInvoices.cir.assignationHistory(cirInvoiceId)
```

## Asignacija

Prenos obaveze na drugog korisnika javnih sredstava:

```ts
await sef.purchaseInvoices.assign(cirInvoiceId, {
  assignerPartyJBKJS: '10520',
  assignationContractNumber: 'UG-2026-1',
})

await sef.purchaseInvoices.cancelAssign(cirInvoiceId)
```

Poništavanje asignacije SEF izlaže kao `GET`, iako menja stanje. Biblioteka to
prenosi kakvo jeste.

## Prigovori

Na fakturu u registru može se uložiti prigovor.

```ts
const prigovori = await sef.cirTickets.byInvoice(cirInvoiceId, true)

const id = await sef.cirTickets.create({
  cirInvoiceId,
  cirTicketCategory: 'Validity', // Information, Validity, Settlement, Cancellation
  userComment: 'Faktura je već plaćena po drugom osnovu',
})

const istorija = await sef.cirTickets.history(id)
const rezultat = await sef.cirTickets.find({ /* parametri pretrage */ })
```

Statusi prigovora: `Active`, `Canceled`, `Solved`, `Unsolved`.

## Statusi u registru

`None`, `ActiveCir`, `InvalidCir`, `CancelledCir`, `PartiallySettled`,
`Settled`, `Assigned`, `Proinvoice`, `CIRStatusSyncError`

## Nosioci javnih nabavki

Kada je preduzeće potpisnik ugovora o javnoj nabavci, dokumenta se čitaju kroz
zaseban prostor imena:

```ts
await sef.publicPurchaseInvoices.ids({ dateFrom, dateTo })
await sef.publicPurchaseInvoices.get(invoiceId)
await sef.publicPurchaseInvoices.xml(invoiceId)
await sef.publicPurchaseInvoices.signature(invoiceId)
await sef.publicPurchaseInvoices.changes('2026-08-26')
```
