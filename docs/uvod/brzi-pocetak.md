# Brzi početak

Ceo put od praznog projekta do poslate fakture.

## 1. Instalacija

```sh
npm install efaktura-js
```

## 2. Kreiranje klijenta

```ts
import { EFaktura } from 'efaktura-js'

const sef = new EFaktura({
  apiKey: process.env.SEF_API_KEY!,
  environment: 'demo',
})
```

## 3. Provera da je kupac na SEF-u

Slanje fakture preduzeću koje nije registrovano neće uspeti, pa se provera
isplati unapred. Ova operacija ne traži API ključ.

```ts
const registrovan = await sef.company.isRegistered({
  registrationNumber: '17862146', // matični broj
  vatNumber: '108213413',         // PIB
})

if (!registrovan) throw new Error('Kupac nije registrovan na SEF-u')
```

## 4. Slanje izlazne fakture

```ts
const { salesInvoiceId } = await sef.salesInvoices.send({
  invoiceNumber: '2026-001',
  issueDate: '2026-08-27',
  dueDate: '2026-09-26',
  deliveryDate: '2026-08-27', // datum prometa
  supplier: {
    name: 'Dobavljač d.o.o.',
    vatId: '111560838',
    registrationId: '21502243',
    address: { street: 'Knez Mihailova 1', city: 'Beograd', postalCode: '11000' },
  },
  customer: {
    name: 'Kupac d.o.o.',
    vatId: '108213413',
    registrationId: '17862146',
  },
  payment: {
    account: '160-0000000000000-00',
    reference: { model: '97', number: '1234567' },
  },
  lines: [
    { name: 'Usluga razvoja', quantity: 10, unitPrice: '1000.00', vatRate: 20 },
  ],
}, {
  executeValidation: true, // neka SEF proveri dokument pre prihvatanja
})
```

Metoda `send()` kreira UBL 2.1 dokument i šalje ga. Ako već imate gotov XML,
pozovite `importUbl()`.

## 5. Provera statusa

```ts
const faktura = await sef.salesInvoices.get(salesInvoiceId)
console.log(faktura.status) // 'Sent'
```

## 6. Obrada ulaznih faktura

```ts
const ulazne = await sef.purchaseInvoices.overview({
  dateFrom: new Date('2026-08-01'),
  dateTo: new Date('2026-08-31'),
  status: 'New',
})

for (const faktura of ulazne) {
  console.log(faktura.documentNumber, faktura.supplierName, faktura.amount)
  await sef.purchaseInvoices.accept(faktura.invoiceId!)
}
```

## 7. Praćenje promena statusa

```ts
const promene = await sef.salesInvoices.changes('2026-08-26')
for (const promena of promene) {
  console.log(promena.salesInvoiceId, promena.newInvoiceStatus)
}
```

Umesto povremenog proveravanja možete se pretplatiti na obaveštenja; pogledajte
[Notifikacije o promeni statusa](/vodici/notifikacije).

## Zaokruživanje

- [Izlazne fakture](/vodici/izlazne-fakture) – avansi, dokumenti o smanjenju i povećanju, storniranje
- [Ulazne fakture](/vodici/ulazne-fakture) – prihvatanje, odbijanje, obrnuto obračunavanje PDV-a
- [Kreiranje UBL fakture](/ubl/kreiranje) – sva polja dokumenta
- [Greške i ponavljanje zahteva](/vodici/greske) – idempotentnost i obrada grešaka
