# Iznosi i zaokruživanje

Iznosi na fakturi ne smeju da prolaze kroz brojeve u pokretnom zarezu. Zbir
`0.1 + 0.2` u JavaScriptu nije `0.3`, a SEF odbija dokument čiji se iznosi ne
slažu do pare.

Zato sva aritmetika ide kroz tip `Decimal`, zasnovan na celobrojnom tipu
`BigInt`.

## Kako zadavati iznose

```ts
lines: [{ name: 'Usluga', quantity: 1, unitPrice: '1000.00', vatRate: 20 }]
```

Prihvataju se tekst, broj i `Decimal`. **Za vrednosti iz baze podataka koristite
tekst** – time se izbegava svaki gubitak tačnosti pre nego što vrednost uđe u
biblioteku.

::: danger Decimalni znak je tačka
U podacima koji idu na SEF decimalni znak je **tačka**: `'1000.00'`. Zarez se
koristi samo pri prikazu za korisnika, gde isti iznos glasi 1.000,00 RSD.
Prosleđivanje vrednosti `'1000,00'` je greška koju SEF odbija.
:::

## Tip Decimal

```ts
import { Decimal, dec, sum } from 'efaktura-js/ubl'

dec('0.1').add('0.2').toString(2)          // '0.30'
dec('8333.33').mul('0.20').round(2).toString(2) // '1666.67'
sum([dec('0.1'), dec('0.2'), dec('0.3')]).toString(2) // '0.60'
```

| Metoda | Značenje |
| --- | --- |
| `add`, `sub`, `mul` | osnovne operacije |
| `round(n)` | zaokruživanje na `n` decimala |
| `toString(n)` | tekst sa tačno `n` decimala |
| `eq` | poređenje, bez obzira na broj decimala |
| `isZero` | provera nule |
| `toNumber` | pretvaranje u broj, samo za prikaz |

Množenje zadržava punu tačnost dok se ne zaokruži, pa se zaokružuje jednom, na
kraju.

## Zaokruživanje

Zaokružuje se **na više, dalje od nule**, simetrično za pozitivne i negativne
vrednosti:

```ts
dec('1234.565').round(2).toString(2)  // '1234.57'
dec('-1234.565').round(2).toString(2) // '-1234.57'
```

## Porez se računa nad zbirnom osnovicom

Ovo je najvažnije pravilo i najčešći uzrok odbijanja dokumenta.

Porez se **ne računa po stavci pa sabira**, nego se stavke prvo grupišu po
poreskoj kategoriji, a porez se računa nad zbirom osnovica te grupe. Tako računa
i SEF pri proveri.

```ts
lines: [
  { name: 'a', quantity: 1, unitPrice: '0.33', vatRate: 20 },
  { name: 'b', quantity: 1, unitPrice: '0.33', vatRate: 20 },
  { name: 'c', quantity: 1, unitPrice: '0.33', vatRate: 20 },
]
```

| Način obračuna | Rezultat |
| --- | --- |
| po stavci, pa zbir | 0,02 + 0,02 + 0,02 = **0,06** |
| nad zbirnom osnovicom | 0,99 × 20 % = 0,198 → **0,20** |

Ispravan je drugi. Zbog toga **ne čuvajte iznos poreza po stavci** u svojoj
evidenciji; čuvajte neto iznos stavke, a porez prepustite obračunu nad grupom.

## Ukupni iznosi

```ts
import { computeTotals } from 'efaktura-js/ubl'

const iznosi = computeTotals(faktura)
```

| Polje | Značenje |
| --- | --- |
| `lineExtensionAmount` | zbir neto iznosa stavki |
| `taxExclusiveAmount` | ukupan iznos bez PDV |
| `taxTotal` | ukupan PDV |
| `taxInclusiveAmount` | ukupan iznos sa PDV-om |
| `prepaidAmount` | zbir avansa |
| `payableAmount` | iznos za plaćanje |
| `subtotals` | poreski međuzbirovi po kategoriji |

Iznos za plaćanje je `taxInclusiveAmount − prepaidAmount + roundingAmount`.

## Provera pre slanja

```ts
const iznosi = computeTotals(faktura)

if (!iznosi.payableAmount.eq(izvod.ukupno)) {
  throw new Error(
    `Neslaganje: dokument ${iznosi.payableAmount.toString(2)}, evidencija ${izvod.ukupno}`,
  )
}
```

## Prikaz korisniku

Podaci ostaju u obliku koji SEF zahteva, a formatiranje je odvojen korak:

```ts
const prikaz = new Intl.NumberFormat('sr-RS', {
  style: 'currency',
  currency: 'RSD',
}).format(iznosi.payableAmount.toNumber())
// '1.000,00 RSD'
```

Metodu `toNumber()` koristite samo za prikaz, nikada za dalji obračun.
