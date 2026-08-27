# Doprinos projektu

## Pokretanje

```sh
git clone https://github.com/efaktura-js/efaktura-js
cd efaktura-js
npm install
npm test
```

Potreban je Node 20 ili noviji. Node izvršava TypeScript neposredno, pa za
testove nije potreban prevodilac.

## Provere

```sh
npm test           # testovi, bez pristupa mreži
npx tsc --noEmit   # provera tipova
npm run lint:docs  # jezičke provere dokumentacije
npm run docs:dev   # dokumentacija, uživo
```

## Provera na demo okruženju

```sh
SEF_API_KEY=<demo ključ> node --test test/live.test.ts
```

Podrazumevano samo čita. Za slanje stvarne fakture na demo okruženje:

```sh
SEF_API_KEY=<ključ> SEF_LIVE_SEND=1 \
  SEF_SUPPLIER_VAT_ID=<PIB> SEF_CUSTOMER_VAT_ID=<PIB> \
  node --test test/live.test.ts
```

## Pravila

- **Ne menjajte `src/generated/`.** Izmenite `scripts/generate.mjs`, pa pokrenite
  `npm run generate`.
- Nove operacije ne dodaju se ručno. Ako ih SEF objavi, pokrenite
  `npm run fetch-spec` i `npm run generate`, pa dodajte metodu u odgovarajući
  prostor imena.
- Bez zavisnosti u izvršavanju. Ovo je tvrdo pravilo.
- Uz svaku netrivijalnu izmenu ide test.
- Dokumentacija se piše latinicom i ekavicom, po pravilima koja proverava
  `npm run lint:docs`.

## Ustrojstvo

```
spec/            OpenAPI dokumenti SEF-a
scripts/         generisanje i jezičke provere
src/generated/   tipovi, nabrajanja, tabela operacija
src/http.ts      prenos podataka: ključ, ponavljanje, usporavanje
src/errors.ts    izuzeci
src/resources/   prostori imena
src/ubl/         kreiranje i čitanje dokumenata
test/            testovi
docs/            dokumentacija
```

## Prijava problema

Uz prijavu priložite:

- verziju biblioteke i verziju izvršnog okruženja,
- okruženje (`demo` ili `production`),
- vrednost `err.code` i `err.fieldName`, ako je greška došla sa SEF-a,
- najmanji primer koji pokazuje problem.

::: danger Ne prilažite osetljive podatke
API ključ, PIB stvarnih preduzeća i sadržaj stvarnih faktura ne stavljajte u
prijavu. Zamenite ih izmišljenim vrednostima.
:::
