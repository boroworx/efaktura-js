# Ulazne fakture

Ulazna faktura je dokument koji dobavljač šalje preduzeću preko SEF-a. Primalac
je pregleda, pa je prihvata ili odbija.

## Sinhronizacija

Za redovno preuzimanje koristite `overview()`. Jedan poziv vraća dobavljača,
iznose i datume za ceo period, pa nije potrebno preuzimati svaki dokument
posebno.

```ts
const ulazne = await sef.purchaseInvoices.overview({
  dateFrom: new Date('2026-08-01'),
  dateTo: new Date('2026-08-31'),
})

for (const faktura of ulazne) {
  console.log(
    faktura.documentNumber,
    faktura.supplierName,
    faktura.supplierVatRegistrationNumber,
    faktura.amount,
    faktura.status,
  )
}
```

Parametar `status` je neobavezan; `dateFrom` i `dateTo` su obavezni.

Kada su potrebni samo identifikatori, tu je `ids()`, a za prolazak kroz cele
dokumente `iterate()`.

```ts
for await (const faktura of sef.purchaseInvoices.iterate({ dateFrom, dateTo })) {
  console.log(faktura.invoiceId, faktura.status)
}
```

## Prihvatanje i odbijanje

```ts
await sef.purchaseInvoices.accept(invoiceId)
await sef.purchaseInvoices.accept(invoiceId, 'Prihvaćeno posle provere')
await sef.purchaseInvoices.reject(invoiceId, 'Pogrešna količina u stavci 3')
```

Komentar je neobavezan pri prihvatanju, a **obavezan pri odbijanju**. Biblioteka
proverava to pre slanja zahteva i podiže `TypeError` ako komentar nedostaje.

Odgovor sadrži ishod i novi status:

```ts
const odgovor = await sef.purchaseInvoices.accept(invoiceId)
console.log(odgovor.success)              // true
console.log(odgovor.invoice?.status)      // 'Approved'
console.log(odgovor.invoice?.invoiceNumber)
```

Kada radite preko Centralnog registra faktura, postoje i istovetne metode koje
primaju identifikator iz CRF-a:

```ts
await sef.purchaseInvoices.acceptByCirId(cirInvoiceId)
await sef.purchaseInvoices.rejectByCirId(cirInvoiceId, 'Razlog')
```

::: warning Nema otkazivanja ni storniranja na ulaznoj strani
Te operacije pokreće pošiljalac. Primalac vidi samo status `Cancelled` ili
`Storno` koji iz njih proistekne.
:::

## Preuzimanje dokumenta

```ts
const xml = await sef.purchaseInvoices.xml(invoiceId)
const pdf = await sef.purchaseInvoices.pdf(invoiceId)
const potpis = await sef.purchaseInvoices.signature(invoiceId)
const istorija = await sef.purchaseInvoices.statusHistoryPdf(invoiceId)
const izCrf = await sef.purchaseInvoices.xmlByCirId(cirInvoiceId)
```

Preuzeti UBL može se odmah pretvoriti u objekat:

```ts
import { parseInvoiceXml } from 'efaktura-js/ubl'

const dokument = parseInvoiceXml(await sef.purchaseInvoices.xml(invoiceId))
console.log(dokument.supplier.name, dokument.declaredTotals.payableAmount)
```

## Obrnuto obračunavanje PDV-a

Kada je na dokumentu poreska kategorija `AE`, porez obračunava primalac i
prijavljuje ga zasebnom operacijom:

```ts
await sef.purchaseInvoices.vatReverseCharge(invoiceId, 1234.56)
```

## Promene statusa

```ts
const promene = await sef.purchaseInvoices.changes('2026-08-26')
```

Vraćaju se promene za jedan protekli dan. SEF čuva približno mesec dana
istorije. Isti sadržaj stiže i kao notifikacija, ako se pretplatite.

## Statusi ulazne fakture

`New`, `Seen`, `ReNotified`, `Deleted`, `Approved`, `Rejected`, `Cancelled`,
`Storno`, `SendingInProgress`, `Unknown`

Pri filtriranju SEF prihvata podskup: `New`, `Seen`, `ReNotified`, `Approved`,
`Rejected`, `Storno`.
