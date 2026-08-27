# Izlazne fakture

`sef.salesInvoices`

## Slanje

```ts
send(faktura: Invoice, options?: ImportOptions): Promise<MiniInvoiceDto>
importUbl(xml: string, options?: ImportOptions): Promise<MiniInvoiceDto>
uploadUbl(datoteka: string | Uint8Array | Blob, options?: ImportOptions): Promise<MiniInvoiceDto>
```

```ts
interface ImportOptions extends RequestOptions {
  requestId?: string
  sendToCir?: 'Yes' | 'No' | 'Default' | 'Auto' | boolean
  executeValidation?: boolean
}
```

Odgovor sadrži `invoiceId`, `salesInvoiceId` i `purchaseInvoiceId`.

## Preuzimanje

```ts
get(invoiceId: number): Promise<SimpleSalesInvoiceDto>
xml(invoiceId: number): Promise<Uint8Array>
pdf(invoiceId: number): Promise<Uint8Array>
signature(invoiceId: number): Promise<Uint8Array>
statusHistoryPdf(invoiceId: number): Promise<Uint8Array>
```

Objekat `SimpleSalesInvoiceDto` sadrži `status`, `invoiceId`, `globUniqId`,
`comment`, `cirStatus`, `cirInvoiceId`, `version`, `lastModifiedUtc`,
`cirSettledAmount`, `cancelComment` i `stornoComment`.

## Pretraga

```ts
ids(filter: { status?: string; dateFrom: DateInput; dateTo: DateInput }): Promise<number[]>
iterate(filter: { status?: string; dateFrom: DateInput; dateTo: DateInput; concurrency?: number }):
  AsyncGenerator<SimpleSalesInvoiceDto>
changes(date: DateInput): Promise<SalesInvoiceStatusChangeDto[]>
```

## Promena stanja

```ts
cancel(invoiceId: number, comment: string): Promise<InvoiceDto>
storno(invoiceId: number, comment: string, opts?: { stornoNumber?: string }): Promise<InvoiceDto>
delete(invoiceIds: readonly number[]): Promise<number[]>
deleteOne(invoiceId: number): Promise<number>
```

| Metoda | Dozvoljeni statusi |
| --- | --- |
| `cancel` | `Draft`, `New`, `Mistake` |
| `storno` | `Approved`, `Rejected`, `Sent` |
| `delete`, `deleteOne` | `Draft`, `New` |

Komentar je obavezan pri otkazivanju i pri storniranju.

## Šifarnik

```ts
exemptionReasons(): Promise<ValueAddedTaxExemptionReasonDto[]>
```

## CRF

```ts
cir.assignationHistory(cirInvoiceId: string): Promise<InvoiceHistoryDto>
cir.paymentsAndHistory(cirInvoiceId: string): Promise<CirHistoryDto>
```

## Statusi

`New`, `Draft`, `Sent`, `Paid`, `Mistake`, `OverDue`, `Archived`, `Sending`,
`Deleted`, `Approved`, `Rejected`, `Cancelled`, `Storno`, `Unknown`
