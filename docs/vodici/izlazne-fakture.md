# Izlazne fakture

Izlazna faktura je dokument koji preduzeće šalje kupcu preko SEF-a.

## Slanje

Najkraći put je metoda `send()`: prima objekat fakture, kreira UBL 2.1 dokument
i šalje ga.

```ts
const { salesInvoiceId } = await sef.salesInvoices.send({
  invoiceNumber: '2026-001',
  issueDate: '2026-08-27',
  deliveryDate: '2026-08-27',
  supplier: { name: 'Dobavljač d.o.o.', vatId: '111560838', registrationId: '21502243' },
  customer: { name: 'Kupac d.o.o.', vatId: '108213413', registrationId: '17862146' },
  lines: [{ name: 'Usluga', quantity: 1, unitPrice: '1000.00', vatRate: 20 }],
})
```

Sva polja dokumenta opisana su u odeljku [Kreiranje UBL fakture](/ubl/kreiranje).

### Gotov XML

Ako dokument već postoji, pošaljite ga takvog kakav jeste:

```ts
await sef.salesInvoices.importUbl(xml, { executeValidation: true })
await sef.salesInvoices.uploadUbl(bajtovi) // isto, ali kao multipart otpremanje
```

### Parametri slanja

| Parametar | Značenje |
| --- | --- |
| `requestId` | ključ idempotentnosti; generiše se sam ako ga ne navedete |
| `sendToCir` | slanje u Centralni registar faktura; obavezno za korisnike javnih sredstava |
| `executeValidation` | SEF proverava dokument pre prihvatanja |

::: tip Uvek koristite executeValidation tokom razvoja
Bez te opcije dokument može biti prihvaćen, pa tek kasnije završiti u statusu
`Mistake`. Uz nju grešku vidite odmah, kao odgovor na poziv.
:::

## Preuzimanje

```ts
const faktura = await sef.salesInvoices.get(salesInvoiceId)
const xml = await sef.salesInvoices.xml(salesInvoiceId)        // UBL, bajtovi
const pdf = await sef.salesInvoices.pdf(salesInvoiceId)        // PDF prikaz
const potpis = await sef.salesInvoices.signature(salesInvoiceId) // XAdES potpis
const istorija = await sef.salesInvoices.statusHistoryPdf(salesInvoiceId)
```

Metode koje vraćaju dokument daju `Uint8Array`, pa rade i van Node okruženja:

```ts
import { writeFile } from 'node:fs/promises'
await writeFile('faktura.pdf', await sef.salesInvoices.pdf(salesInvoiceId))
```

## Pretraga

SEF ne podržava straničenje. Svaka lista prima vremenski raspon.

```ts
const idjevi = await sef.salesInvoices.ids({
  status: 'Sent',
  dateFrom: new Date('2026-08-01'),
  dateTo: new Date('2026-08-31'),
})
```

Pošto ta operacija vraća samo identifikatore, biblioteka nudi i prolazak kroz
same dokumente:

```ts
for await (const faktura of sef.salesInvoices.iterate({
  dateFrom: new Date('2026-08-01'),
  dateTo: new Date('2026-08-31'),
})) {
  console.log(faktura.invoiceId, faktura.status)
}
```

Dokumenta se preuzimaju uporedo, ali u granicama dozvoljenog broja zahteva.
Broj uporednih poziva menja se opcijom `concurrency`.

## Otkazivanje i storniranje

Ovo su **dve različite operacije** i ne smeju se mešati.

| Operacija | Dozvoljeni statusi | Značenje |
| --- | --- | --- |
| `cancel()` | `Draft`, `New`, `Mistake` | otkazivanje dokumenta koji još nije prihvaćen |
| `storno()` | `Approved`, `Rejected`, `Sent` | storniranje već poslatog dokumenta |

```ts
await sef.salesInvoices.cancel(id, 'Greška u podacima kupca')
await sef.salesInvoices.storno(id, 'Storniranje po zahtevu kupca')
```

Komentar je obavezan u oba slučaja. Kod storniranja može se dodati i broj
storno dokumenta:

```ts
await sef.salesInvoices.storno(id, 'Razlog', { stornoNumber: 'STORNO-2026-001' })
```

## Brisanje nacrta

Brišu se samo dokumenti u statusu `Draft` ili `New`; ostali se prećutno
preskaču.

```ts
await sef.salesInvoices.delete([101, 102, 103])
await sef.salesInvoices.deleteOne(101)
```

## Avansi, smanjenja i povećanja

Ne postoje odvojene operacije za ove dokumente. Šalju se istom metodom, uz
odgovarajuću vrstu dokumenta i upućivanje na dokument koji koriguju.

```ts
// Avansna faktura
await sef.salesInvoices.send({ ...zaglavlje, documentType: 'Prepayment', lines })

// Dokument o smanjenju (knjižno odobrenje)
await sef.salesInvoices.send({
  ...zaglavlje,
  documentType: 'CreditNote',
  documentReferences: [
    { id: '2026-001', issueDate: '2026-08-27', type: 'CreditNoteReferenceToInvoice' },
  ],
  lines,
})
```

Builder odbija dokument o smanjenju ili povećanju bez upućivanja, pa se takva
greška vidi pre slanja.

## Prilozi

Prilozi nemaju zasebnu operaciju. Putuju unutar UBL dokumenta:

```ts
await sef.salesInvoices.send({
  ...faktura,
  attachments: [
    { filename: 'specifikacija.pdf', mimeType: 'application/pdf', content: bajtovi },
  ],
})
```

## Šifarnik osnova izuzeća od PDV

```ts
const osnovi = await sef.salesInvoices.exemptionReasons()
```

Vrednost polja `key` upisuje se u stavku fakture kao `exemptionReasonCode`.
Šifarnik se menja tokom vremena, pa ga preuzimajte tokom izvršavanja umesto da
ga prepisujete u kod.

## Statusi izlazne fakture

`New`, `Draft`, `Sent`, `Paid`, `Mistake`, `OverDue`, `Archived`, `Sending`,
`Deleted`, `Approved`, `Rejected`, `Cancelled`, `Storno`, `Unknown`

Status `Mistake` znači grešku pri slanju, a ne grešku kupca.
