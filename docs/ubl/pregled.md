# UBL 2.1 – pregled

SEF prima i vraća fakture kao XML dokumenta po standardu **UBL 2.1**, u srpskoj
prilagodbi evropskog standarda EN 16931.

UBL sloj ove biblioteke ne zavisi od HTTP sloja i može se koristiti zasebno:

```ts
import { buildInvoiceXml, parseInvoiceXml, computeTotals } from 'efaktura-js/ubl'
```

## Srpski profil

| Stavka | Vrednost |
| --- | --- |
| Standard | SRPS EN 16931-1:2019/A2:2020 |
| Sintaksa | UBL 2.1 |
| `CustomizationID` | `urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2021` |
| `ProfileID` | ne postoji na SEF fakturama |
| Ekstenzija | `http://mfin.gov.rs/srbdt/srbdtext` |

::: warning ProfileID se ne upisuje
Za razliku od profila Peppol BIS 3.0, gde je `cbc:ProfileID` obavezan, fakture na
SEF-u ga nemaju. Builder ga zato i ne upisuje.
:::

Vrednosti su dostupne kao konstante:

```ts
import { CUSTOMIZATION_ID, NS } from 'efaktura-js/ubl'
```

## Šta radi builder

```ts
const xml = buildInvoiceXml(faktura)
```

Redosled elemenata u UBL-u je propisan šemom, pa builder ne obilazi ključeve
objekta nego ispisuje elemente utvrđenim redom.

Builder takođe:

- računa neto iznos stavke, poreske međuzbirove i ukupne iznose;
- dodaje prefiks `RS` na PIB u elementu `PartyTaxScheme`;
- upisuje JBKJS u `PartyIdentification` kada je kupac korisnik javnih sredstava;
- izostavlja stopu kod kategorija bez poreza i upisuje osnov izuzeća;
- odbija dokument koji SEF sigurno ne bi prihvatio.

## Šta radi parser

```ts
const faktura = parseInvoiceXml(xml)
```

Vraća isti oblik objekta koji builder prima, uz dva dodatna polja:

```ts
faktura.declaredTotals      // iznosi kako ih je naveo pošiljalac
faktura.declaredTaxSubtotals // poreski međuzbirovi iz dokumenta
```

Ti iznosi se **ne preračunavaju** – to je ono što u dokumentu stvarno piše, pa se
može uporediti sa sopstvenim obračunom.

Parser prihvata i dokument umotan u `<DocumentEnvelope>`, u kojem SEF vraća
fakturu zajedno s metapodacima.

## Povratni prolaz

Čitanje ne gubi ništa što builder koristi:

```ts
buildInvoiceXml(parseInvoiceXml(xml)) === xml // tačno
```

Ova jednakost proverava se testom, pa je i dalje tačna posle izmena.

## Bez spoljnih zavisnosti

Serijalizacija i čitanje XML-a rade bez ijedne biblioteke. Podržani su elementi,
atributi, tekst, `CDATA`, komentari i deklaracija. Namerno nisu podržani DTD i
sopstveni entiteti, jer se u UBL dokumentima ne pojavljuju, a njihova obrada
otvara poznate bezbednosne probleme.

Prefiksi imena zadržavaju se onakvi kakvi jesu, pa se elementi traže po lokalnom
imenu:

```ts
import { parseXml, textAt, child, childrenNamed } from 'efaktura-js/ubl'

const dokument = parseXml(xml)
textAt(dokument, 'ID')                                  // broj fakture
textAt(dokument, 'AccountingSupplierParty', 'Party', 'PartyName', 'Name')
childrenNamed(dokument, 'InvoiceLine').length
```

## Dalje

- [Kreiranje fakture](/ubl/kreiranje)
- [Čitanje fakture](/ubl/citanje)
- [Iznosi i zaokruživanje](/ubl/iznosi)
- [Šifarnici](/ubl/sifarnici)
