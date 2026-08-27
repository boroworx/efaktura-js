# Kreiranje fakture

```ts
import { buildInvoiceXml } from 'efaktura-js/ubl'

const xml = buildInvoiceXml(faktura)
```

Isti objekat prima i metoda `sef.salesInvoices.send()`, koja dokument odmah šalje.

## Zaglavlje

```ts
const faktura: Invoice = {
  invoiceNumber: '2026-001',   // broj fakture
  issueDate: '2026-08-27',     // datum izdavanja
  dueDate: '2026-09-26',       // datum dospeća plaćanja
  deliveryDate: '2026-08-27',  // datum prometa
  documentType: 'Invoice',     // Invoice, CreditNote, DebitNote, Prepayment
  currency: 'RSD',
  note: 'Napomena na fakturi',
  buyerReference: 'REF-123',
  supplier: { /* … */ },
  customer: { /* … */ },
  lines: [ /* … */ ],
}
```

| Polje | Obavezno | Napomena |
| --- | --- | --- |
| `invoiceNumber` | da | jedinstven za izdavaoca |
| `issueDate` | da | `Date` ili `'YYYY-MM-DD'` |
| `deliveryDate` | praktično da | datum prometa; bez njega SEF vraća `InvoiceDeliveryDateMissing` |
| `dueDate` | ne | |
| `documentType` | ne | podrazumevano `Invoice` |
| `currency` | ne | podrazumevano `RSD` |
| `uuid` | ne | generiše se ako se izostavi |

## Stranke

```ts
supplier: {
  name: 'Dobavljač d.o.o.',
  vatId: '111560838',          // PIB, bez prefiksa
  registrationId: '21502243',  // matični broj
  address: {
    street: 'Knez Mihailova 1',
    city: 'Beograd',
    postalCode: '11000',
    countryCode: 'RS',         // podrazumevano RS
  },
  contact: { name: 'Petar Petrović', email: 'petar@primer.rs', phone: '+381111234567' },
}
```

Prefiks `RS` na PIB-u u elementu `PartyTaxScheme` dodaje builder. Ako ga sami
napišete, neće se udvostručiti.

Za korisnika javnih sredstava dodajte JBKJS:

```ts
customer: {
  name: 'Ministarstvo',
  vatId: '108213413',
  registrationId: '17862146',
  budgetId: '10520',
}
```

Popunjeno polje `budgetId` čini obaveznom bar jednu referencu iz odeljka
[Reference](#reference).

## Stavke

```ts
lines: [
  {
    name: 'Usluga razvoja',        // naziv artikla
    description: 'Avgust 2026.',   // opis artikla
    quantity: 10,                  // fakturisana količina
    unitCode: 'HUR',               // šifra jedinice mere, podrazumevano H87
    unitPrice: '1000.00',          // neto cena artikla
    vatRate: 20,                   // stopa PDV, u procentima
    vatCategory: 'S',              // šifra kategorije PDV, podrazumevano S
    discount: '100.00',            // popust na stavci
    sellersItemId: 'ART-1',
    period: { start: '2026-08-01', end: '2026-08-31' },
  },
]
```

Neto iznos stavke je `quantity × unitPrice − discount`, zaokružen na dve decimale.

::: danger Iznosi se pišu s tačkom
`'1000.00'` je ispravno, `'1000,00'` nije. Zarez kao decimalni znak koristi se
samo u prikazu za korisnika, nikada u podacima koji idu na SEF.
:::

## Oslobođenje od PDV-a

Kategorije bez poreza zahtevaju osnov izuzeća i ne smeju imati stopu:

```ts
lines: [
  {
    name: 'Usluga inostranom licu',
    quantity: 1,
    unitPrice: '1000.00',
    vatCategory: 'AE', // obrnuto obračunavanje
    exemptionReasonCode: 'PDV-RS-10-2-1',
    exemptionReasonText: 'Obveznik PDV nije obračunao PDV',
  },
]
```

Važeće šifre preuzmite pozivom `sef.salesInvoices.exemptionReasons()`. Spisak
kategorija je u odeljku [Šifarnici](/ubl/sifarnici).

## Plaćanje

```ts
payment: {
  account: '160-0000000000000-00',      // broj računa za plaćanje
  meansCode: '30',                      // šifra načina plaćanja
  reference: { model: '97', number: '1234567' }, // poziv na broj
  payeeName: 'Dobavljač d.o.o.',
  bankName: 'Banka a.d.',
}
```

## Reference

```ts
references: {
  orderNumber: 'NAR-2026-15',        // broj narudžbenice
  contractNumber: 'UG-2026-1',       // broj ugovora
  lotNumber: 'PART-2',               // broj partije
  frameworkAgreementNumber: 'OS-7',  // okvirni sporazum
}
```

## Upućivanje na druga dokumenta

Obavezno za dokument o smanjenju i dokument o povećanju:

```ts
documentType: 'CreditNote',
documentReferences: [
  { id: '2026-001', issueDate: '2026-08-27', type: 'CreditNoteReferenceToInvoice' },
],
```

Dozvoljene vrste veze: `CreditNoteReferenceToInvoice`,
`CreditNoteReferenceToPrepaymentInvoice`, `CreditNoteReferenceToPeriod`,
`StornoInvoice`, `StornoPrepayment`, `StornoDebitNote`.

## Avansi

```ts
prepayments: [
  { id: 'AV-2026-1', issueDate: '2026-08-01', amount: '2000.00' },
],
```

Zbir avansa umanjuje iznos za plaćanje i upisuje se u `PrepaidAmount`.

## Prilozi

```ts
attachments: [
  {
    filename: 'specifikacija.pdf',
    mimeType: 'application/pdf',
    content: bajtovi, // Uint8Array ili već kodiran base64 tekst
    description: 'Specifikacija radova',
  },
],
```

## Fakturisani period

```ts
invoicePeriod: { start: '2026-08-01', end: '2026-08-31', descriptionCode: '3' },
```

## Provera pre slanja

```ts
import { computeTotals } from 'efaktura-js/ubl'

const iznosi = computeTotals(faktura)
console.log(iznosi.lineExtensionAmount.toString(2)) // '10000.00'
console.log(iznosi.taxTotal.toString(2))            // '2000.00'
console.log(iznosi.payableAmount.toString(2))       // '12000.00'
```

Funkcija podiže `TypeError` kada dokument krši pravilo koje SEF proverava, pa se
greška vidi bez ijednog poziva.
