# Šta je efaktura-js

`efaktura-js` je JavaScript i TypeScript klijent za **Sistem elektronskih faktura
(SEF)**, državnu platformu za elektronsko fakturisanje u Republici Srbiji.

Biblioteka pokriva dve odvojene celine:

1. **Javni API SEF-a** – svih 85 operacija, od slanja izlazne fakture i obrade
   ulazne, preko evidencije PDV-a i Centralnog registra faktura, do fiskalnih
   računa i uvoznih carinskih deklaracija.
2. **UBL 2.1 dokumenta** – kreiranje i čitanje faktura po srpskom profilu
   standarda SRPS EN 16931, pa nije potrebno ručno sastavljati XML.

## Zahtevi

| Stavka | Vrednost |
| --- | --- |
| Node.js | 20 ili noviji |
| Moduli | ESM (`"type": "module"`) |
| Zavisnosti u izvršavanju | nema ih |

Biblioteka koristi samo ugrađene mogućnosti izvršnog okruženja – `fetch`,
`FormData`, `Blob` i `AbortSignal` – pa radi i u okruženjima Bun, Deno,
Cloudflare Workers i u veb pregledaču.

::: tip Rad u pregledaču
Tehnički radi, ali API ključ ne sme da se nađe u kodu koji se izvršava kod
korisnika. U pregledaču koristite biblioteku samo preko sopstvenog posrednika.
:::

## Instalacija

```sh
npm install efaktura-js
```

```sh [pnpm]
pnpm add efaktura-js
```

```sh [yarn]
yarn add efaktura-js
```

## Prvi poziv

Za proveru da je sve na svom mestu dovoljna je operacija koja vraća verziju
SEF-a:

```ts
import { EFaktura } from 'efaktura-js'

const sef = new EFaktura({
  apiKey: process.env.SEF_API_KEY!,
  environment: 'demo',
})

console.log(await sef.reference.version()) // { version: '3.7' }
```

Ako ovaj poziv vrati grešku 401, ključ nije aktiviran ili pripada drugom
okruženju. Pogledajte [API ključ](/uvod/api-kljuc).

## Uvoz iz biblioteke

Glavni ulaz izvozi klijent, tipove, nabrajanja i UBL sloj:

```ts
import { EFaktura, SefError, TAX_CATEGORY, buildInvoiceXml } from 'efaktura-js'
import type { Invoice, SalesInvoiceStatus } from 'efaktura-js'
```

Kada vam treba samo rad s dokumentima, bez mreže, uvezite zaseban ulaz:

```ts
import { buildInvoiceXml, parseInvoiceXml } from 'efaktura-js/ubl'
```

## Sledeći koraci

- [Dobijanje API ključa](/uvod/api-kljuc)
- [Demo i produkciono okruženje](/uvod/okruzenja)
- [Brzi početak](/uvod/brzi-pocetak)
