# Regenerisanje iz specifikacije

Tipovi, nabrajanja i tabela operacija ne pišu se ručno. Nastaju iz zvaničnih
OpenAPI dokumenata SEF-a.

## Slojevi

| Sloj | Sadržaj | Ko ga piše |
| --- | --- | --- |
| `spec/` | OpenAPI dokumenti SEF-a | preuzimaju se |
| `src/generated/` | tipovi, nabrajanja, tabela operacija | skripta |
| `src/http.ts`, `src/errors.ts` | prenos podataka | ručno |
| `src/resources/` | prostori imena i imena metoda | ručno |
| `src/ubl/` | kreiranje i čitanje dokumenata | ručno |

Generisani kod **uključen je u repozitorijum**, pa korisnicima biblioteke build
korak nije potreban, a izmene u API-ju vide se kao razlika u kodu.

## Postupak

```sh
npm run fetch-spec   # preuzima dokumente sa demo okruženja
npm run generate     # regeneriše src/generated/ i docs/api/operacije.md
npm test             # test ne prolazi ako se generisani kod razlikuje
npx tsc --noEmit
```

## Adrese specifikacija

```
https://demoefaktura.mfin.gov.rs/swagger/public_v1/swagger.json
https://demoefaktura.mfin.gov.rs/swagger/public_v2/swagger.json
```

::: warning Uobičajena adresa ne radi
`/swagger/v1/swagger.json` vraća grešku 500 na oba okruženja. Stvarne adrese
navedene su u datoteci `/swagger/index.js`, koju učitava Swagger korisnički
prikaz. Skup putanja na produkciji istovetan je onom na demo okruženju.
:::

## Zašto imena operacija izgledaju tako

OpenAPI dokumenti SEF-a **ne sadrže polje `operationId`**, pa se ključ izvodi iz
metode i putanje:

```
GET /api/publicApi/sales-invoice/status-history/{invoiceId}/pdf
  → getSalesInvoiceStatusHistoryByInvoiceIdPdf
```

Takva imena su jednoznačna, ali nezgodna za svakodnevnu upotrebu. Zato su
prostori imena u `src/resources/` **pisani ručno** i daju upotrebljiva imena:

```ts
sef.salesInvoices.statusHistoryPdf(invoiceId)
```

## Šta proveravaju testovi

- Svaka operacija iz specifikacije postoji u generisanoj tabeli.
- Svaka generisana operacija dostupna je kroz bar jedan prostor imena, pa nema
  operacije koja postoji, a ne može da se pozove.
- Ponovno pokretanje skripte daje isti rezultat, pa generisani kod u
  repozitorijumu ne može da zastari.
- Parametri putanje u tabeli slažu se sa obrascem putanje.

## Provera jezika u dokumentaciji

```sh
npm run lint:docs
```

Skripta `scripts/lint-docs.mjs` proverava pravila iz stilskog priručnika:
ijekavske i hrvatske oblike, em crtu, pogrešan genitiv skraćenice `API`,
prisvojne zamenice, kalkove iz engleskog i veliko slovo u naslovima. Kod i
isečci koda se preskaču.
