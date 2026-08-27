# Šta nije obuhvaćeno

## Evidentiranje prethodnog poreza (EPP)

Elektronsko evidentiranje prethodnog poreza **nije deo ove biblioteke**.

To je zaseban sistem, a ne deo javnog API-ja SEF-a:

| Stavka | SEF | EPP |
| --- | --- | --- |
| Adresa | `efaktura.mfin.gov.rs` | `ppppdv.mfin.gov.rs` |
| Osnovna putanja | `/api/publicApi` | `/api/v1/public-api` |
| Zaglavlje s ključem | `ApiKey` | `apiKey` |
| OpenAPI dokument | postoji | ne postoji javno |

Presudan je poslednji red. Ceo klijent nastaje iz mašinski čitljive
specifikacije, pa se tipovi i operacije ne mogu razići sa stvarnim API-jem. Za
EPP takva specifikacija nije objavljena, pa bi njegova podrška bila prepisana iz
PDF dokumenta i bez ikakve provere. To je namerno izostavljeno.

::: tip Obaveštenje primaoca o prethodnom porezu jeste obuhvaćeno
Ne mešati sa EPP-om. *Obaveštenje primaoca o prethodnom porezu* nalazi se na
glavnoj adresi SEF-a i dostupno je kao `sef.notices`.
:::

## Elektronski potpis

Biblioteka **ne kreira** elektronski potpis. Dokumenta potpisuje SEF, a klijent
potpis samo preuzima:

```ts
await sef.salesInvoices.signature(invoiceId)
await sef.purchaseInvoices.signature(invoiceId)
```

## Ekstenzija srbdtext

Elementi iz ekstenzije `http://mfin.gov.rs/srbdt/srbdtext` (umanjeni ukupni
iznosi i podaci o avansu) ne prenose se u objekat fakture. Do njih se dolazi
neposredno kroz XML stablo, kao u odeljku
[Čitanje fakture](/ubl/citanje#rad-sa-xml-stablom-neposredno).

## Fakture u stranoj valuti

Builder ne kreira drugi element `TaxTotal`, koji SEF zahteva za fakture u
stranoj valuti. Takva dokumenta pripremite sami i pošaljite ih metodom
`importUbl()`.

Faktura u stranoj valuti ne može se poslati u CRF.

## Ostalo

- **e-Otpremnica** je zaseban sistem (`eotpremnica.mfin.gov.rs`).
- **Preliminarna poreska prijava** pominje se u dokumentaciji, ali je nema u
  objavljenim OpenAPI dokumentima.
- **Red čekanja za slanje** nije deo biblioteke; to pripada aplikaciji koja je
  koristi. Za bezbedno ponavljanje pogledajte
  [idempotentnost](/vodici/greske#idempotentnost).
