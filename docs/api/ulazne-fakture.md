# Ulazne fakture

`sef.purchaseInvoices`

## Preuzimanje

```ts
get(invoiceId: number): Promise<SimplePurchaseInvoiceDto>
xml(invoiceId: number): Promise<Uint8Array>
xmlByCirId(cirInvoiceId: string): Promise<Uint8Array>
pdf(invoiceId: number): Promise<Uint8Array>
signature(invoiceId: number): Promise<Uint8Array>
statusHistoryPdf(invoiceId: number): Promise<Uint8Array>
```

## Pretraga

```ts
overview(filter: { status?: string; dateFrom: DateInput; dateTo: DateInput }):
  Promise<PurchaseInvoiceOverviewDto[]>
ids(filter): Promise<number[]>
iterate(filter): AsyncGenerator<SimplePurchaseInvoiceDto>
changes(date: DateInput): Promise<PurchaseInvoiceStatusChangeDto[]>
```

Metoda `overview()` je najbogatija i vraća `documentNumber`, `documentType`,
`supplierName`, `supplierVatRegistrationNumber`, `amount`, `sumWithoutVat`,
`vatAmount`, `currency`, `deliveryDate`, `dueDate` i `sentDate`. Za redovnu
sinhronizaciju koristite nju.

## Prihvatanje i odbijanje

```ts
accept(invoiceId: number, comment?: string): Promise<AcceptRejectResponse>
reject(invoiceId: number, comment: string): Promise<AcceptRejectResponse>
acceptByCirId(cirInvoiceId: string, comment?: string): Promise<AcceptRejectPurchaseInvoiceResponse>
rejectByCirId(cirInvoiceId: string, comment: string): Promise<AcceptRejectPurchaseInvoiceResponse>
```

Komentar je obavezan pri odbijanju; biblioteka to proverava pre slanja zahteva.

## PDV

```ts
vatReverseCharge(purchaseInvoiceId: number, vatAmount: number): Promise<void>
```

Za dokumenta sa poreskom kategorijom `AE`, gde porez obračunava primalac.

## CRF

```ts
assign(cirInvoiceId: string, assignation: {
  assignerPartyJBKJS: string
  assignationContractNumber: string
}): Promise<PurchaseInvoiceDto>

cancelAssign(cirInvoiceId: string): Promise<PurchaseInvoiceDto>
cir.assignationHistory(cirInvoiceId: string): Promise<InvoiceHistoryDto>
cir.paymentsAndHistory(cirInvoiceId: string): Promise<CirHistoryDto>
```

## Statusi

`New`, `Seen`, `ReNotified`, `Deleted`, `Approved`, `Rejected`, `Cancelled`,
`Storno`, `SendingInProgress`, `Unknown`

Za filtriranje SEF prihvata: `New`, `Seen`, `ReNotified`, `Approved`,
`Rejected`, `Storno`.
