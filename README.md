# efaktura-js

[![npm](https://img.shields.io/npm/v/efaktura-js)](https://www.npmjs.com/package/efaktura-js)
[![provere](https://img.shields.io/github/actions/workflow/status/boroworx/efaktura-js/docs.yml?branch=main&label=provere)](https://github.com/boroworx/efaktura-js/actions/workflows/docs.yml)
[![node](https://img.shields.io/node/v/efaktura-js)](https://nodejs.org/)
[![licenca](https://img.shields.io/npm/l/efaktura-js?label=licenca)](https://github.com/boroworx/efaktura-js/blob/main/LICENSE)

JavaScript i TypeScript klijent za **eFakturu (SEF)** – Sistem elektronskih faktura
Republike Srbije ([efaktura.gov.rs](https://www.efaktura.gov.rs/)).

Pokriva svih **85 operacija** javnog API-ja i sadrži UBL 2.1 builder i parser za
srpski profil, pa umesto ručnog sastavljanja XML-a šaljete običan JavaScript
objekat.

- **Bez zavisnosti u izvršavanju.** Koristi samo `fetch`, `FormData` i `Blob`.
- **Univerzalni ESM.** Node 20+, Bun, Deno, Cloudflare Workers i veb pregledači.
- **Tipovi iz zvaničnog izvora.** Tipovi i tabela operacija generišu se iz
  zvaničnih OpenAPI dokumenata SEF-a, koji se čuvaju u direktorijumu `spec/`.
- **Rešava specifičnosti SEF-a** – PascalCase u odgovorima, nedokumentovano
  ograničenje od 3 zahteva u sekundi, prazno telo odgovora kod greške 401 i
  tačnu decimalnu aritmetiku za PDV.

> Nezvanična biblioteka. Nije povezana s Ministarstvom finansija Republike Srbije.

## Instalacija

```sh
npm install efaktura-js
```

## Brzi početak

```ts
import { EFaktura } from 'efaktura-js'

const sef = new EFaktura({
  apiKey: process.env.SEF_API_KEY!,
  environment: 'demo', // podrazumevano je 'production'
})

// Objekat ulazi, UBL 2.1 izlazi i šalje se na SEF.
const { salesInvoiceId } = await sef.salesInvoices.send({
  invoiceNumber: '2026-001',
  issueDate: '2026-08-27',
  dueDate: '2026-09-26',
  deliveryDate: '2026-08-27', // datum prometa (BT-72) – SEF ga zahteva
  supplier: {
    name: 'Dobavljač d.o.o.',
    vatId: '111560838',         // PIB
    registrationId: '21502243', // matični broj
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
    {
      name: 'Usluga razvoja',
      quantity: 10,
      unitPrice: '1000.00',
      vatRate: 20,
      unitCode: 'HUR',
    },
  ],
})

// Preuzimanje poslate fakture
const faktura = await sef.salesInvoices.get(salesInvoiceId)
console.log(faktura.status) // 'Sent'
```

## Dobijanje API ključa

1. Prijavite se na portal pomoću **eID-ja** ([eid.gov.rs](https://eid.gov.rs/))
   kao administrator preduzeća.
2. Otvorite **Podešavanja → API menadžment**.
3. Izaberite **Generiši ključ**, pa postavite **API status** na **Aktivno**.
   Neaktiviran ključ vraća grešku 401.
4. Demo i produkcioni ključevi su odvojeni i nisu zamenjivi.

| Okruženje | Osnovna adresa |
| --- | --- |
| `production` | `https://efaktura.mfin.gov.rs` |
| `demo` | `https://demoefaktura.mfin.gov.rs` |

Jedan API ključ odgovara tačno jednom preduzeću. SEF nema zaglavlje za
identifikaciju preduzeća, pa se više preduzeća opslužuje pomoću više instanci
klase `EFaktura`.

## Pregled API-ja

### Izlazne fakture

```ts
sef.salesInvoices.send(faktura, { sendToCir: true }) // kreira UBL i šalje ga
sef.salesInvoices.importUbl(xml, { requestId })      // sirov application/xml
sef.salesInvoices.uploadUbl(datoteka)                // multipart otpremanje
sef.salesInvoices.get(id)
sef.salesInvoices.xml(id)                 // UBL, kao bajtovi
sef.salesInvoices.pdf(id)                 // PDF prikaz
sef.salesInvoices.signature(id)           // XAdES potpis SEF-a
sef.salesInvoices.statusHistoryPdf(id)
sef.salesInvoices.ids({ status, dateFrom, dateTo })
sef.salesInvoices.iterate({ dateFrom, dateTo }) // asinhroni iterator kroz dokumenta
sef.salesInvoices.changes('2026-08-26')   // promene statusa za jedan protekli dan
sef.salesInvoices.cancel(id, 'razlog')    // otkazivanje: Draft, New, Mistake
sef.salesInvoices.storno(id, 'razlog')    // storniranje: Approved, Rejected, Sent
sef.salesInvoices.delete([id1, id2])      // samo nacrti
sef.salesInvoices.exemptionReasons()      // šifarnik osnova izuzeća od PDV
sef.salesInvoices.cir.paymentsAndHistory(cirInvoiceId)
```

**Otkazivanje i storniranje nisu isto.** To su dve odvojene operacije SEF-a, s
različitim dozvoljenim statusima i različitim API metodama.

### Ulazne fakture

```ts
sef.purchaseInvoices.overview({ dateFrom, dateTo }) // najbogatija lista – za sinhronizaciju
sef.purchaseInvoices.get(id)
sef.purchaseInvoices.accept(id, 'komentar po želji')
sef.purchaseInvoices.reject(id, 'obavezan komentar')
sef.purchaseInvoices.vatReverseCharge(id, 1234.56)  // kategorija AE
sef.purchaseInvoices.assign(cirInvoiceId, { assignerPartyJBKJS, assignationContractNumber })
sef.purchaseInvoices.xml(id) / .pdf(id) / .signature(id)
sef.purchaseInvoices.ids(...) / .changes(...) / .iterate(...)
```

Na strani ulaznih faktura nema otkazivanja ni storniranja: te operacije pokreće
pošiljalac, a primalac vidi samo status koji iz njih proistekne.

### Evidencija PDV-a

`sef.vat.individual` i `sef.vat.group` odgovaraju aktuelnom API-ju (v2), dok
metode za evidenciju pre 2024. godine ostaju dostupne kao `sef.vat.v1`.

```ts
await sef.vat.individual.record({ year: 2026, vatPeriod: VAT_PERIOD_V2.August })
await sef.vat.individual.correct(id, { /* … */ })
await sef.vat.individual.cancel(id)
await sef.vat.individual.pdf(id)
await sef.vat.group.list({ dateFrom, dateTo })
```

U verziji 2 sve nabrojive vrednosti prenose se kao celi brojevi i nemaju
imenovanu šemu u OpenAPI dokumentu, pa su brojčane vrednosti preuzete iz
zvanične specifikacije i izvezene kao `VAT_PERIOD_V2`, `DOCUMENT_TYPE_V2`,
`VAT_RECORDING_STATUS_V2`, `DOCUMENT_DIRECTION_V2`, `INTERNAL_INVOICE_OPTION_V2`,
`RELATED_INVOICE_OPTION_V2` i `RELATED_INTERNAL_INVOICE_OPTION_V2`. Numeracija se
razlikuje od redosleda tekstualnih vrednosti u verziji 1.

### Ostali resursi

```ts
sef.cirTickets.create(...) / .find(...) / .byInvoice(cirInvoiceId) / .history(id)
sef.fiscal.sales.byNumber(broj) / sef.fiscal.purchase.byDate(datum)
sef.notices.sent.send(obavestenje) / .list(period) / .mistakes() / .pdf(id)
sef.notices.received.get(id) / .list(period) / .pdf(id)
sef.customs.ids({ dateFrom, dateTo }) / .get(id) / .getVersion(id, verzija)
sef.publicPurchaseInvoices.get(id) / .ids(...) / .changes(...) / .xml(id)
sef.company.isRegistered({ registrationNumber, vatNumber, jbkjs })
sef.reference.unitMeasures() / .companies() / .version()
```

Svaka operacija dostupna je i neposredno, preko svog ključa u tabeli operacija:

```ts
await sef.http.call('getPurchaseInvoiceOverview', { query: { dateFrom, dateTo } })
```

## Rad s UBL dokumentima

UBL sloj ne zavisi od HTTP sloja i može se koristiti zasebno:

```ts
import { buildInvoiceXml, parseInvoiceXml, computeTotals } from 'efaktura-js/ubl'

const xml = buildInvoiceXml(faktura)
const iznosi = computeTotals(faktura) // provera pre slanja
const procitano = parseInvoiceXml(xml)
```

Metoda `parseInvoiceXml()` prihvata i fakturu umotanu u element
`<DocumentEnvelope>`, u kojem SEF vraća dokumenta zajedno s metapodacima.

### Provera dokumenta pre slanja

Metoda `inspectInvoice()` proverava dokument onako kako bi ga proverio SEF, ali
bez slanja. Iznosi se ponovo računaju iz stavki i porede sa navedenima, pa se
primenjuju pravila srpskog profila.

```ts
import { inspectInvoice } from 'efaktura-js/ubl'

const nalaz = inspectInvoice(xml)

if (!nalaz.ok) {
  for (const stavka of nalaz.findings.filter((f) => f.severity === 'error')) {
    console.error(stavka.code, stavka.message)
  }
  for (const razlika of nalaz.differences) {
    console.error(`${razlika.field}: navedeno ${razlika.declared}, izračunato ${razlika.computed}`)
  }
  throw new Error('Dokument ne bi prošao proveru na SEF-u')
}
```

Funkcija nikada ne baca izuzetak: i neispravan XML vraća se kao nalaz.

Ista provera dostupna je i kao alatka u pregledaču, na stranici
[Pregled UBL fakture](https://boroworx.github.io/efaktura-js/alatke/pregled-ubl).
Dokument se pri tome ne šalje ni na jedan server.

### Iznosi nikada nisu decimalni brojevi u pokretnom zarezu

Aritmetika nad iznosima izvodi se preko tipa `Decimal` zasnovanog na tipu
`BigInt`. Iznosi se primaju kao tekst, broj ili `Decimal`, a **za vrednosti iz
baze podataka koristite tekst** (`'1000.00'`).

Iznosi se u kodu i u JSON-u pišu s tačkom kao decimalnim znakom, jer je to
format koji SEF zahteva. Tačka se ne zamenjuje zarezom:

```ts
unitPrice: '1000.00' // ispravno
unitPrice: '1000,00' // greška – SEF odbija dokument
```

Iznos `"1000.00"` u prikazu za korisnika glasi 1.000,00 RSD.

Porez se ne računa po stavci, nego nad zbirnom osnovicom po poreskoj kategoriji,
jer SEF prilikom provere računa na isti način.

### Pravila koja builder proverava pre slanja

- Kategorije bez poreza (`AE`, `E`, `Z`, `O`, `K`, `N`) moraju imati osnov
  izuzeća od PDV i ne smeju imati stopu.
- Po jednoj poreskoj kategoriji dozvoljen je tačno jedan poreski međuzbir.
- Kupac koji je korisnik javnih sredstava (popunjeno polje `budgetId`) zahteva
  referencu ugovora, narudžbenice ili partije.
- Dokument o smanjenju i dokument o povećanju moraju upućivati na dokument koji
  koriguju.

Važeće šifre osnova izuzeća preuzmite tokom izvršavanja pozivom
`sef.salesInvoices.exemptionReasons()`. Šifarnik se menja, pa nije ugrađen u
biblioteku.

## Rukovanje greškama

```ts
import {
  SefError, SefAuthError, SefValidationError, SefRateLimitError,
} from 'efaktura-js'

try {
  await sef.salesInvoices.send(faktura)
} catch (err) {
  if (err instanceof SefValidationError) {
    console.error(err.code)      // na primer 'EInvoiceNumberDublicate'
    console.error(err.fieldName)
  } else if (err instanceof SefAuthError) {
    // Greška 401 stiže s praznim telom, pa poruka objašnjava moguće uzroke.
  } else if (err instanceof SefRateLimitError) {
    console.error(err.retryAfter)
  }
}
```

Svojstvo `err.code` sadrži jednu od približno 700 vrednosti iz generisanog
nabrajanja `ErrorCodes`.

## Ograničenje broja zahteva i ponavljanje

SEF dozvoljava **3 zahteva u sekundi** i preko te granice vraća status 429.
Ograničenje nije navedeno u OpenAPI dokumentu i ne šalju se zaglavlja
`X-RateLimit-*`, pa klijent sam usporava zahteve. Zahtevi sa statusom 429, sa
statusom 5xx i mrežne greške ponavljaju se s eksponencijalnim čekanjem uz
nasumično odstupanje, poštujući zaglavlje `Retry-After`.

```ts
new EFaktura({
  apiKey,
  requestsPerSecond: 3, // podrazumevano; 0 isključuje usporavanje
  maxRetries: 3,        // podrazumevano
  timeout: 60_000,      // po zahtevu, u milisekundama
})
```

### Idempotentnost

Metode `send()`, `importUbl()` i `uploadUbl()` uz zahtev šalju parametar
`requestId` i same ga generišu ako ga ne prosledite. Ako slanje ne uspe, a ishod
nije poznat, **ponovite zahtev s istim parametrom `requestId`** i SEF vraća
prvobitni odgovor umesto da napravi duplu fakturu.

## Notifikacije o promeni statusa

SEF šalje promene statusa na adrese koje podešavate na portalu
(**Podešavanja → API menadžment → API endpoints**); one se ne mogu postaviti
preko API-ja. Pretplata važi **jedan dan**, pa metodu `subscribe()` pozivajte
svakodnevno.

```ts
const subscriptionKey = await sef.subscribe() // uključuje notifikacije za sutradan

// U obradi dolaznog zahteva:
import { parseNotification, verifyNotification } from 'efaktura-js'

const dogadjaji = parseNotification(await request.text())
for (const dogadjaj of dogadjaji) {
  if (!verifyNotification(dogadjaj, subscriptionKey)) continue // odbaci lažni poziv
  console.log(dogadjaj.salesInvoiceId, dogadjaj.newInvoiceStatus)
}
```

SEF ne šalje zaglavlje s potpisom, pa je ključ pretplate u telu poruke jedini
dokaz verodostojnosti. Metoda `verifyNotification()` poredi ga u konstantnom
vremenu.

Isto se može postići i povremenim proveravanjem, bez pretplate:
`sef.salesInvoices.changes(datum)` i `sef.purchaseInvoices.changes(datum)`.

### Statusi

API vraća statuse na engleskom. U korisničkom delu portala prikazuju se ovako:

| Vrednost u API-ju | Prikaz na portalu |
| --- | --- |
| `Draft` | Nacrt |
| `Sent` | Poslato |
| `Seen` | Pregledano |
| `Approved` | Odobreno |
| `Rejected` | Odbijeno |
| `Cancelled` | Otkazano |
| `Storno` | Stornirano |
| `Paid` | Plaćeno |

## Straničenje

Straničenja nema. Svaka lista prima vremenski raspon `dateFrom` i `dateTo`, a
SEF ograničava njegovu širinu. Metoda `iterate()` prolazi kroz zadati raspon.

## Regenerisanje iz specifikacije

OpenAPI dokumenti čuvaju se u direktorijumu `spec/`, a generisani izvorni kod
uključen je u repozitorijum, pa korisnicima biblioteke build korak nije potreban.

```sh
npm run fetch-spec   # ponovo preuzima dokumente s demo okruženja
npm run generate     # regeneriše src/generated/
npm test             # test ne prolazi ako se generisani kod razlikuje
```

Stvarne adrese specifikacija su `/swagger/public_v1/swagger.json` i
`/swagger/public_v2/swagger.json`. Uobičajena adresa `/swagger/v1/swagger.json`
vraća grešku 500 i ne treba je koristiti.

## Šta nije obuhvaćeno

**Elektronsko evidentiranje prethodnog poreza (EPP).** To je zaseban sistem na
sopstvenoj adresi (`ppppdv.mfin.gov.rs`, osnovna putanja `/api/v1/public-api`,
uz zaglavlje `apiKey` malim slovima). Nema mašinski čitljivu specifikaciju, pa
namerno nije obuhvaćen umesto da bude rekonstruisan iz PDF dokumenta.
Obaveštenje primaoca o prethodnom porezu, koje se nalazi na glavnoj adresi
SEF-a, **jeste** obuhvaćeno kao `sef.notices`.

Biblioteka ne kreira elektronski potpis. Dokumenta potpisuje SEF, a klijent
potpis samo preuzima.

## Testiranje

```sh
npm test                          # testovi, bez pristupa mreži
npx tsc --noEmit                  # provera tipova
SEF_API_KEY=<demo ključ> node --test test/live.test.ts   # provera na demo okruženju
```

Test nad demo okruženjem podrazumevano samo čita. Postavite `SEF_LIVE_SEND=1`
(uz `SEF_SUPPLIER_VAT_ID` i `SEF_CUSTOMER_VAT_ID`) da bi poslao i stvarnu
fakturu.

## Dokumentacija

Potpuna dokumentacija: **[efaktura-js dokumentacija](https://boroworx.github.io/efaktura-js/)**

## Licenca

MIT
