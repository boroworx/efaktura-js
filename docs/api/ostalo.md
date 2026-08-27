# Ostali resursi

## Prigovori u CRF-u

`sef.cirTickets`

```ts
byInvoice(cirInvoiceId: string, onlyActiveTickets?: boolean): Promise<CirTicketListResponse>
find(search: CirTicketSearchParameter): Promise<CirTicketListResponse>
create(ticket: AddCirTicketRequest): Promise<number>
history(cirTicketId: number): Promise<CirTicketHistoryDto>
```

Kategorije: `Information`, `Validity`, `Settlement`, `Cancellation`.
Statusi: `Active`, `Canceled`, `Solved`, `Unsolved`.

## Fiskalni računi

`sef.fiscal`

```ts
sef.fiscal.sales.byNumber(fiscalBillNumber: string): Promise<FiscalBillOutputApiDto>
sef.fiscal.sales.byDate(date: DateInput): Promise<FiscalBillViewDto>
sef.fiscal.purchase.byNumber(fiscalBillNumber: string): Promise<FiscalBillOutputApiDto>
sef.fiscal.purchase.byDate(date: DateInput): Promise<FiscalBillViewDto>
```

::: warning Ista putanja za dva slučaja
SEF za pretragu po broju i po datumu koristi isti oblik putanje i razlikuje ih
po obliku vrednosti. Prosledite ispravno oblikovan broj računa, odnosno datum.
:::

## Obaveštenja o prethodnom porezu

`sef.notices`

```ts
sef.notices.sent.send(notice: SenderRecipientsNoticeRequest): Promise<FullSenderRecipientsNoticeAPIDto>
sef.notices.sent.get(noticeId: number): Promise<FullSenderRecipientsNoticeAPIDto>
sef.notices.sent.list(window): Promise<FullSenderRecipientsNoticeAPIDto[]>
sef.notices.sent.mistakes(): Promise<FullSenderRecipientsNoticeAPIDto[]>
sef.notices.sent.pdf(noticeId: number): Promise<Uint8Array>

sef.notices.received.get(noticeId: number): Promise<FullReceiverRecipientsNoticeAPIDto>
sef.notices.received.list(window): Promise<FullReceiverRecipientsNoticeAPIDto[]>
sef.notices.received.pdf(noticeId: number): Promise<Uint8Array>
```

Osnov obaveštenja: `CreditNoteIssued` ili `Storno`. Poreklo dokumenta:
`DocumentIssuedViaSef` ili `DocumentIssuedOutsideSef`.

## Uvozne carinske deklaracije

`sef.customs`

```ts
ids(filter: { dateFrom: DateInput; dateTo: DateInput; duties?: boolean }):
  Promise<CustomsDeclarationIdsResponse>
changes(date: DateInput): Promise<CustomsDeclarationStatusChangeResponse>
get(customsDeclarationId: string): Promise<CustomsDeclarationDto>
getVersion(customsDeclarationId: string, version: number): Promise<CustomsDeclarationDto>
item(customsDeclarationId: string, version: number, itemOrdinalNumber: number):
  Promise<CustomsDeclarationItemDto>
```

Statusi: `Active`, `Modified`, `BackVersion`, `Cancelled`.

## Nosioci javnih nabavki

`sef.publicPurchaseInvoices`

```ts
get(invoiceId: number): Promise<SimplePurchaseInvoiceDto>
xml(invoiceId: number): Promise<Uint8Array>
signature(invoiceId: number): Promise<Uint8Array>
ids(filter): Promise<number[]>
changes(date: DateInput): Promise<PurchaseInvoiceStatusChangeDto[]>
```

## Preduzeće

`sef.company`

```ts
isRegistered(identification: {
  registrationNumber?: string
  vatNumber?: string
  jbkjs?: string
}): Promise<boolean>

update(): Promise<void>
```

Provera registracije **ne zahteva API ključ**. Za korisnike javnih sredstava
obavezan je i JBKJS. Metoda `update()` traži od SEF-a da osveži podatke o
preduzeću iz izvornih registara.

## Šifarnici i registar

`sef.reference`

```ts
unitMeasures(): Promise<unknown[]>
companies(opts?: { includeAllStatuses?: boolean }): Promise<unknown[]>
downloadCompanies(opts?: { includeAllStatuses?: boolean }): Promise<Uint8Array>
version(): Promise<{ version?: string }>
```

::: warning Registar preduzeća je veliki
Metoda `companies()` vraća ceo registar u jednom odgovoru, veličine više
megabajta. Preuzimajte ga povremeno i čuvajte, umesto pri svakom pozivu. Ni ova
operacija ne zahteva API ključ.
:::

Šifarnik osnova izuzeća od PDV nalazi se pod izlaznim fakturama:
`sef.salesInvoices.exemptionReasons()`.
