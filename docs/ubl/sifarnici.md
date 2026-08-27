# Šifarnici

Vrednosti koje se upisuju u UBL dokument dolaze iz nekoliko šifarnika. Deo je
utvrđen standardom i izvezen kao konstanta, a deo se preuzima sa SEF-a jer se
menja tokom vremena.

## Kategorije PDV

Šifarnik UNTDID 5305, u obimu koji SEF koristi.

```ts
import { TAX_CATEGORY } from 'efaktura-js/ubl'
```

| Šifra | Konstanta | Značenje |
| --- | --- | --- |
| `S` | `StandardRate` | opšta stopa |
| `AA` | `ReducedRate` | posebna stopa |
| `AE` | `ReverseCharge` | obrnuto obračunavanje, porez obračunava primalac |
| `E` | `Exempt` | oslobođenje bez prava na odbitak |
| `Z` | `ZeroRated` | oslobođenje sa pravom na odbitak |
| `O` | `OutsideScope` | nije predmet oporezivanja |
| `K` | `Export` | izvoz |
| `N` | `NotSubject` | anuliranje |
| `SS` | `SpecialScheme` | posebni postupci oporezivanja |

### Kategorije bez poreza

```ts
import { ZERO_TAX_CATEGORIES, requiresExemptionReason } from 'efaktura-js/ubl'

ZERO_TAX_CATEGORIES            // ['AE', 'E', 'Z', 'O', 'K', 'N']
requiresExemptionReason('AE')  // true
```

Za ove kategorije stopa se ne upisuje, iznos poreza mora biti nula, a osnov
izuzeća je obavezan.

## Osnovi izuzeća od PDV

Šifarnik je srpski i menja se, pa **nije ugrađen u biblioteku**. Preuzima se
tokom izvršavanja:

```ts
const osnovi = await sef.salesInvoices.exemptionReasons()

for (const osnov of osnovi) {
  console.log(osnov.key, osnov.category, osnov.text)
}
```

| Polje | Značenje |
| --- | --- |
| `key` | šifra koja se upisuje kao `exemptionReasonCode` |
| `category` | kategorija PDV uz koju važi |
| `law`, `article`, `paragraph`, `point` | odredba propisa |
| `text` | opis |
| `activeFrom`, `activeTo` | period važenja |

::: tip Keširajte šifarnik
Šifarnik se retko menja, ali nije nepromenljiv. Preuzmite ga jednom dnevno i
sačuvajte, umesto pri svakoj fakturi.
:::

## Vrste dokumenta

Šifarnik UNTDID 1001.

```ts
import { INVOICE_TYPE_CODE } from 'efaktura-js/ubl'
```

| Šifra | Konstanta | Dokument |
| --- | --- | --- |
| `380` | `Invoice` | faktura |
| `381` | `CreditNote` | dokument o smanjenju (knjižno odobrenje) |
| `383` | `DebitNote` | dokument o povećanju (knjižno zaduženje) |
| `386` | `Prepayment` | avansna faktura |

::: tip Nazivi u API-ju i u računovodstvu
U API delu dokumentacije SEF-a koriste se nazivi *dokument o smanjenju* i
*dokument o povećanju*, dok su u računovodstvu uobičajeni *knjižno odobrenje* i
*knjižno zaduženje*. Reč je o istim dokumentima.
:::

## Vrste veze sa drugim dokumentom

```ts
import { DOCUMENT_REFERENCE_TYPE } from 'efaktura-js/ubl'
```

`CreditNoteReferenceToInvoice`, `CreditNoteReferenceToPrepaymentInvoice`,
`CreditNoteReferenceToPeriod`, `StornoInvoice`, `StornoPrepayment`,
`StornoDebitNote`

## Načini plaćanja

Šifarnik UNTDID 4461.

```ts
import { PAYMENT_MEANS } from 'efaktura-js/ubl'
```

| Šifra | Konstanta |
| --- | --- |
| `30` | `CreditTransfer` – prenos sa računa, najčešći slučaj |
| `10` | `Cash` |
| `20` | `Cheque` |
| `48` | `CardPayment` |
| `49` | `DirectDebit` |
| `57` | `StandingAgreement` |
| `97` | `Compensation` |

## Jedinice mere

Šifarnik UN/ECE Rec 20. U biblioteci su izvezene najčešće vrednosti:

```ts
import { UNIT } from 'efaktura-js/ubl'
```

| Šifra | Konstanta | Jedinica |
| --- | --- | --- |
| `H87` | `Piece` | komad, podrazumevano |
| `KGM` | `Kilogram` | kilogram |
| `LTR` | `Litre` | litar |
| `MTR` | `Metre` | metar |
| `MTK` | `SquareMetre` | kvadratni metar |
| `MTQ` | `CubicMetre` | kubni metar |
| `HUR` | `Hour` | čas |
| `DAY` | `Day` | dan |
| `MON` | `Month` | mesec |
| `ANN` | `Year` | godina |
| `KWH` | `KilowattHour` | kilovat-čas |
| `E48` | `Service` | usluga |

Ceo šifarnik dostupan je sa SEF-a:

```ts
const jedinice = await sef.reference.unitMeasures()
```

## Identifikacija stranaka

```ts
import { SERBIA_ENDPOINT_SCHEME } from 'efaktura-js/ubl' // '9948'
```

| Element | Sadržaj |
| --- | --- |
| `cbc:EndpointID` uz `schemeID="9948"` | PIB |
| `cac:PartyTaxScheme/cbc:CompanyID` | PIB sa prefiksom `RS` |
| `cac:PartyLegalEntity/cbc:CompanyID` | matični broj |
| `cac:PartyIdentification/cbc:ID` | JBKJS, samo za korisnike javnih sredstava |
