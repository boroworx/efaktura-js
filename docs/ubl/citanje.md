# Čitanje fakture

```ts
import { parseInvoiceXml } from 'efaktura-js/ubl'

const faktura = parseInvoiceXml(xml)
```

Prima tekst ili `Uint8Array`, pa se ono što vrate `sef.salesInvoices.xml()` i
`sef.purchaseInvoices.xml()` prosleđuje neposredno:

```ts
const bajtovi = await sef.purchaseInvoices.xml(invoiceId)
const dokument = parseInvoiceXml(bajtovi)

console.log(dokument.invoiceNumber)
console.log(dokument.supplier.name, dokument.supplier.vatId)
console.log(dokument.lines.length)
```

## Rezultat

Vraća se isti oblik objekta koji builder prima, uz dva dodatna polja.

```ts
dokument.invoiceNumber
dokument.issueDate
dokument.deliveryDate
dokument.documentType   // 'Invoice' | 'CreditNote' | 'DebitNote' | 'Prepayment'
dokument.currency
dokument.supplier
dokument.customer
dokument.lines
dokument.payment
dokument.references
dokument.documentReferences
dokument.prepayments
dokument.invoicePeriod
```

### Navedeni iznosi

```ts
dokument.declaredTotals
// {
//   lineExtensionAmount: '10000.00',
//   taxExclusiveAmount:  '10000.00',
//   taxInclusiveAmount:  '12000.00',
//   taxTotal:            '2000.00',
//   prepaidAmount:       undefined,
//   payableAmount:       '12000.00',
// }

dokument.declaredTaxSubtotals
// [{ category: 'S', percent: '20.00', taxableAmount: '10000.00', taxAmount: '2000.00' }]
```

Ovo su vrednosti **kako ih je naveo pošiljalac**, kao tekst i bez
preračunavanja. Tako se mogu uporediti sa sopstvenim obračunom:

```ts
import { computeTotals, dec } from 'efaktura-js/ubl'

const nas = computeTotals(dokument)
if (!nas.payableAmount.eq(dokument.declaredTotals.payableAmount!)) {
  console.warn('Iznos za plaćanje se razlikuje od obračunatog')
}
```

## Umotan dokument

Kada SEF vraća fakturu zajedno s metapodacima, dokument je umotan:

```xml
<env:DocumentEnvelope>
  <env:DocumentHeader>
    <env:DocumentId>6946581a-99b0-470c-ad60-d60d8fdaf9c5</env:DocumentId>
  </env:DocumentHeader>
  <env:DocumentBody>
    <Invoice>…</Invoice>
  </env:DocumentBody>
</env:DocumentEnvelope>
```

Metoda `parseInvoiceXml()` prepoznaje takav omot i sama vadi dokument iz njega,
pa razlika ne dopire do koda koji je poziva.

## Greške pri čitanju

Podiže se `SyntaxError` kada dokument nije ispravan:

```ts
try {
  parseInvoiceXml(sadrzaj)
} catch (err) {
  if (err instanceof SyntaxError) console.error('Neispravan dokument:', err.message)
}
```

Prepoznaju se neuparene oznake, više korenskih elemenata, nezatvoreni elementi i
koren koji nije `<Invoice>` ni `<CreditNote>`.

## Rad sa XML stablom neposredno

Kada vam treba element koji objekat fakture ne prenosi, koristite pomoćne
funkcije:

```ts
import { parseXml, child, childrenNamed, text, textAt, attr } from 'efaktura-js/ubl'

const stablo = parseXml(xml)

textAt(stablo, 'CustomizationID')
attr(child(stablo, 'AccountingSupplierParty', 'Party', 'EndpointID'), 'schemeID')

for (const stavka of childrenNamed(stablo, 'InvoiceLine')) {
  console.log(textAt(stavka, 'ID'), textAt(stavka, 'Item', 'Name'))
}
```

Sve funkcije traže elemente po **lokalnom imenu**, pa prefiks (`cbc:`, `cac:`)
ne morate navoditi.

## Šta se ne prenosi

- Pojedinačni iznosi po avansu; dokument nosi samo ukupan iznos avansa.
- Elementi iz ekstenzije `srbdtext` (umanjeni ukupni iznosi i podaci o avansu).
- Elektronski potpis; njega preuzmite metodom `signature()`.

Za te slučajeve pristupite stablu neposredno, kao u prethodnom odeljku.
