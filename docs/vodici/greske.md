# Greške i ponavljanje zahteva

Svaki odgovor koji nije uspešan biblioteka pretvara u izuzetak izveden iz klase
`SefError`.

## Vrste grešaka

| Klasa | Kada nastaje |
| --- | --- |
| `SefAuthError` | 401 i 403 – ključ nedostaje, nije aktiviran ili pripada drugom okruženju |
| `SefValidationError` | 400 i ostale greške u zahtevu – SEF je odbio sadržaj |
| `SefRateLimitError` | 429 – prekoračen dozvoljen broj zahteva |
| `SefServerError` | 5xx – greška na strani SEF-a |
| `SefConnectionError` | zahtev nije ni dobio odgovor: mreža, istek vremena, prekid |

```ts
import {
  SefError, SefAuthError, SefValidationError,
  SefRateLimitError, SefServerError, SefConnectionError,
} from 'efaktura-js'

try {
  await sef.salesInvoices.send(faktura)
} catch (err) {
  if (err instanceof SefValidationError) {
    console.error(err.code)       // 'EInvoiceNumberDublicate'
    console.error(err.fieldName)  // 'invoiceNumber'
    console.error(err.raw)        // sirov odgovor, za nedokumentovane slučajeve
  } else if (err instanceof SefAuthError) {
    // Odgovor nema telo; poruka nabraja moguće uzroke.
  } else if (err instanceof SefRateLimitError) {
    console.error(err.retryAfter) // sekunde, ako ih je SEF poslao
  } else if (err instanceof SefConnectionError) {
    console.error(err.cause)
  }
}
```

## Svojstva izuzetka

| Svojstvo | Sadržaj |
| --- | --- |
| `status` | HTTP status |
| `code` | šifra greške iz nabrajanja `ErrorCodes` |
| `fieldName` | polje na koje se greška odnosi |
| `message` | objašnjenje |
| `raw` | sirov tekst odgovora |
| `url`, `method` | zahtev koji je izazvao grešku |
| `requestId` | ključ idempotentnosti, ako je poslat |

Nabrajanje `ErrorCodes` ima približno 700 vrednosti, na primer
`InvoiceDeliveryDateMissing`, `UBLSourceInvoiceNotFound`, `TooManyAttachments`,
`StornoCommentNotDefined`, `CalculationNumberNotUnique`.

## Prazno telo kod greške 401

SEF na neispravan ili neaktiviran ključ vraća status 401 **bez ikakvog sadržaja**.
Zato se poruka sastavlja na strani biblioteke i nabraja verovatne uzroke, umesto
da ostane prazna. Pogledajte [API ključ](/uvod/api-kljuc).

## Automatsko ponavljanje

Zahtevi se ponavljaju kada ima smisla:

| Ishod | Ponavlja se |
| --- | --- |
| 429 | da, poštujući zaglavlje `Retry-After` |
| 5xx | da |
| mrežna greška ili istek vremena | da |
| 4xx osim 429 | ne – ponavljanje bi dalo isti rezultat |
| prekid koji je izazvao pozivalac | ne |

Čekanje raste eksponencijalno, uz nasumično odstupanje, pa se veći broj klijenata
ne uskladi u istom trenutku.

```ts
new EFaktura({
  apiKey,
  maxRetries: 3,   // broj pokušaja posle prvog
  retryDelay: 500, // osnovno čekanje u milisekundama
})
```

## Idempotentnost

Ovo je najvažniji deo za slanje faktura.

Metode `send()`, `importUbl()` i `uploadUbl()` uz zahtev šalju parametar
`requestId`. Ako ga ne navedete, biblioteka ga sama generiše.

```ts
const requestId = crypto.randomUUID()

try {
  await sef.salesInvoices.send(faktura, { requestId })
} catch (err) {
  // Ishod nije poznat – ponovite s istim requestId.
  await sef.salesInvoices.send(faktura, { requestId })
}
```

::: danger Sačuvajte requestId uz fakturu
Ako slanje prekine mreža, ne znate da li je dokument stigao. Ponavljanje s istim
parametrom `requestId` vraća prvobitni odgovor. Ponavljanje sa novim pravi
**duplu fakturu**, koja se dalje mora stornirati.
:::

Zato `requestId` čuvajte u bazi zajedno s fakturom, u istoj transakciji u kojoj
je i sam dokument, a ne u promenljivoj u memoriji.

## Prekid i ograničenje trajanja

```ts
const controller = new AbortController()
setTimeout(() => controller.abort(), 5000)

await sef.salesInvoices.get(id, { signal: controller.signal })
await sef.salesInvoices.get(id, { timeout: 10_000 })
```

Prekid koji ste sami izazvali ne pokreće ponavljanje.

## Provera pre slanja

Deo grešaka može se otkloniti bez ijednog poziva. Builder odbija dokument koji
SEF sigurno ne bi prihvatio:

```ts
import { computeTotals } from 'efaktura-js/ubl'

const iznosi = computeTotals(faktura) // podiže TypeError ako dokument nije ispravan
if (iznosi.payableAmount.toString(2) !== ocekivano) {
  throw new Error('Iznos se ne poklapa sa evidencijom')
}
```

Uz to, parametar `executeValidation` tera SEF da proveri dokument pre nego što ga
prihvati.
