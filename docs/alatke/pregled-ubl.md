---
title: Pregled UBL fakture
---

# Pregled UBL fakture

Alatka proverava UBL dokument onako kako bi ga proverio SEF, ali bez slanja.
Učitajte fakturu i dobićete pročitan sadržaj, ponovo izračunate iznose i spisak
onoga što bi SEF odbio.

::: tip Dokument ostaje kod vas
Provera se u celini izvršava u pregledaču. Faktura se ne šalje ni na jedan
server, pa je bezbedno učitati i stvaran dokument sa PIB-om i iznosima.
:::

<UblInspektor />

## Šta se proverava

**Iznosi.** Iznosi se ponovo računaju iz stavki i porede sa onima koji u
dokumentu pišu. Ovo hvata najčešći uzrok odbijanja: porez obračunat po stavci pa
sabran razlikuje se od poreza obračunatog nad zbirnom osnovicom po poreskoj
kategoriji, a SEF računa na ovaj drugi način. Dugme **Primer sa greškom**
pokazuje tačno taj slučaj.

**Pravila profila.** Kategorije bez poreza moraju imati osnov izuzeća i ne smeju
imati stopu; po jednoj poreskoj kategoriji dozvoljen je jedan poreski međuzbir;
kupac koji je korisnik javnih sredstava zahteva referencu ugovora, narudžbenice
ili partije; dokument o smanjenju i o povećanju moraju upućivati na dokument koji
koriguju.

**Struktura.** Prisustvo i tačnost elementa `CustomizationID`, postojanje
elementa `ProfileID` koga fakture na SEF-u nemaju, obavezni datumi, oblik PIB-a i
matičnog broja.

Prihvata se i dokument umotan u `DocumentEnvelope`, u kojem SEF vraća fakture
zajedno sa metapodacima.

## Ista provera u kodu

Alatka ne radi ništa što nije dostupno i iz biblioteke. Ista funkcija koristi se
u kodu, pre slanja:

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

await sef.salesInvoices.importUbl(xml)
```

Povratna vrednost:

| Polje | Sadržaj |
| --- | --- |
| `ok` | `false` ako postoji bilo koji nalaz ozbiljnosti `error` |
| `invoice` | pročitana faktura; izostaje ako dokument nije mogao da se raščlani |
| `findings` | nalazi, svaki sa `severity`, `code`, `message` i po potrebi `detail` |
| `differences` | iznosi koji se ne slažu, sa navedenom i izračunatom vrednošću |

Funkcija nikada ne baca izuzetak. I neispravan XML vraća se kao nalaz, pa se
može pozvati nad bilo kakvim ulazom.

## Ograničenja

Provera pokriva pravila koja se mogu utvrditi iz samog dokumenta. Ne zamenjuje
proveru na SEF-u, jer SEF dodatno proverava i ono što alatka ne može da zna:
da li su preduzeća registrovana, da li je broj fakture već iskorišćen, da li je
navedeni osnov izuzeća još uvek na snazi i da li je ugovor iz reference stvaran.

Za proveru na strani SEF-a pošaljite dokument sa parametrom
`executeValidation`:

```ts
await sef.salesInvoices.importUbl(xml, { executeValidation: true })
```
