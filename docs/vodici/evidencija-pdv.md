# Evidencija PDV-a

SEF vodi dve vrste evidencije obračuna PDV-a: **zbirnu** i **pojedinačnu**.
Biblioteka pokriva aktuelni API (verzija 2) i stariji, koji je bio u primeni pre
septembra 2024.

```ts
sef.vat.individual // pojedinačna evidencija, verzija 2
sef.vat.group      // zbirna evidencija, verzija 2
sef.vat.v1         // stariji API, obe vrste
```

## Nabrojive vrednosti su brojevi

U verziji 2 sve nabrojive vrednosti prenose se kao celi brojevi i **nemaju
imenovanu šemu u OpenAPI dokumentu** – tamo stoji samo `integer`. Zato su
brojčane vrednosti preuzete iz zvanične specifikacije i izvezene kao konstante:

```ts
import {
  VAT_PERIOD_V2,
  VAT_RECORDING_STATUS_V2,
  DOCUMENT_DIRECTION_V2,
  DOCUMENT_TYPE_V2,
  INTERNAL_INVOICE_OPTION_V2,
  RELATED_INVOICE_OPTION_V2,
  RELATED_INTERNAL_INVOICE_OPTION_V2,
} from 'efaktura-js'
```

| Konstanta | Vrednosti |
| --- | --- |
| `VAT_PERIOD_V2` | `January` = 1 … `December` = 12, `FirstQuarter` = 13 … `FourthQuarter` = 16 |
| `VAT_RECORDING_STATUS_V2` | `Draft` = 0, `Recorded` = 10, `Replaced` = 20, `Cancelled` = 30 |
| `DOCUMENT_DIRECTION_V2` | `Inbound` = 0, `Outbound` = 1 |
| `DOCUMENT_TYPE_V2` | `Invoice` = 380, `CreditNote` = 381, `DebitNote` = 383, `PrepaymentInvoice` = 386, `InternalAccountForTurnoverOfForeigner` = 400, `OtherInternalStatement` = 401 |
| `INTERNAL_INVOICE_OPTION_V2` | `None` = 0, `Turnover` = 1, `Prepayment` = 2, `Increase` = 3, `Reduction` = 4 |
| `RELATED_INVOICE_OPTION_V2` | `None` = 0, `Invoice` = 1, `Period` = 2, `PrepaymentInvoice` = 3 |

::: warning Numeracija se razlikuje od verzije 1
U verziji 1 statusi su tekstualne vrednosti, a njihov redosled ne odgovara
brojevima iz verzije 2. Vrednosti za vrstu dokumenta preuzete su iz šifarnika
UNTDID 1001, uz dve vrednosti specifične za SEF (400 i 401).
:::

## Pojedinačna evidencija

```ts
const zapis = await sef.vat.individual.record({
  year: 2026,
  vatPeriod: VAT_PERIOD_V2.August,
  documentDirection: DOCUMENT_DIRECTION_V2.Outbound,
  documentType: DOCUMENT_TYPE_V2.Invoice,
  documentNumber: '2026-001',
  relatedPartyIdentifier: '108213413',
  calculationNumber: 'OBR-2026-08',
  noRealEstateBaseAmount20: 10000,
  noRealEstateCalculatedVat20: 2000,
})

console.log(zapis.individualVatId, zapis.vatRecordingStatus)
```

### Ispravka i poništavanje

```ts
await sef.vat.individual.correct(individualVatId, { /* nova verzija zapisa */ })
await sef.vat.individual.cancel(individualVatId) // poništava sve verzije
```

Ispravlja se samo zapis u statusu `Recorded`.

### Pregled

```ts
const zapisi = await sef.vat.individual.list({ dateFrom, dateTo })
const jedan = await sef.vat.individual.get(individualVatId)
const pdf = await sef.vat.individual.pdf(individualVatId)
```

## Zbirna evidencija

```ts
await sef.vat.group.record({
  year: 2026,
  vatPeriod: VAT_PERIOD_V2.August,
  calculationNumber: 'ZBIR-2026-08',
  baseAmount20: 100000,
  calculatedVat20: 20000,
  baseAmount10: 50000,
  calculatedVat10: 5000,
})

await sef.vat.group.correct(groupVatId, { /* … */ })
await sef.vat.group.cancel(groupVatId)
await sef.vat.group.list({ dateFrom, dateTo })
await sef.vat.group.pdf(groupVatId)
```

## Stariji API

Zapisi napravljeni po ranijim pravilima i dalje se čitaju i poništavaju:

```ts
await sef.vat.v1.individual.list({ dateFrom, dateTo })
await sef.vat.v1.individual.get(id)
await sef.vat.v1.individual.cancel(id)

// Prosleđen identifikator pretvara poziv u ispravku.
await sef.vat.v1.individual.record(zapis, { individualVatId: id })
```

## Ograničenja

- Godina ne može biti pre 2022.
- Iznosi imaju najviše dve decimale.
- Poreski period koji je u budućnosti nije dozvoljen.
- Broj obračuna mora biti jedinstven.

Sve ove provere sprovodi SEF i vraća ih kao vrednost `code` u izuzetku
`SefValidationError` – na primer `CalculationNumberNotUnique` ili
`YearCannotBeLessThan2022`.

## Nije obuhvaćeno

Elektronsko evidentiranje prethodnog poreza (EPP) je zaseban sistem na adresi
`ppppdv.mfin.gov.rs` i nije deo ove biblioteke. Detalji su u odeljku
[Šta nije obuhvaćeno](/ostalo/obim).
