# Ograničenje broja zahteva

SEF dozvoljava **3 zahteva u sekundi**. Preko te granice odgovara statusom 429.

Ograničenje važi od 1. januara 2023, ali **nije navedeno u OpenAPI dokumentu** i
SEF ne šalje zaglavlja `X-RateLimit-*`, pa se granica ne može otkriti iz samog
odgovora.

## Usporavanje na strani klijenta

Biblioteka sama raspoređuje zahteve, po principu korpe sa žetonima: dozvoljen je
kratak nalet do tri zahteva, a zatim se tempo svodi na tri u sekundi.

```ts
new EFaktura({
  apiKey,
  requestsPerSecond: 3, // podrazumevano
})
```

Vrednost `0` isključuje usporavanje. To ima smisla jedino kada sami upravljate
tempom, na primer u testovima s lažnim serverom.

::: tip Zašto usporavanje unapred
Bez njega bi prolazak kroz veći period odmah izazvao niz odgovora sa statusom
429. Ponavljanje bi to popravilo, ali sporije i uz nepotreban saobraćaj.
:::

## Više preduzeća

Usporavanje je vezano za instancu klijenta. Ako opslužujete više preduzeća preko
više instanci, svaka broji zasebno.

Ograničenje SEF-a primenjuje se po API ključu, pa je to obično ispravno. Kada
više instanci deli isti ključ, podelite dozvoljeni tempo:

```ts
const klijenti = kljucevi.map(
  (apiKey) => new EFaktura({ apiKey, requestsPerSecond: 3 / kljucevi.length }),
)
```

## Uporedni pozivi

Metode `iterate()` preuzimaju dokumente uporedo, ali kroz isto usporavanje:

```ts
for await (const faktura of sef.salesInvoices.iterate({
  dateFrom, dateTo,
  concurrency: 3,
})) {
  // …
}
```

## Odgovor sa statusom 429

Ako se ograničenje ipak prekorači, zahtev se ponavlja uz poštovanje zaglavlja
`Retry-After`. Kada se pokušaji iscrpe, podiže se `SefRateLimitError`:

```ts
catch (err) {
  if (err instanceof SefRateLimitError) {
    console.log(err.retryAfter) // sekunde, ako ih je SEF poslao
  }
}
```

## Nema straničenja

Liste se ne straniče, nego se zadaje vremenski raspon:

```ts
await sef.salesInvoices.ids({ dateFrom, dateTo, status: 'Sent' })
```

SEF ograničava širinu raspona i vraća greške poput
`ExportToCsvPeriodLongerThanExpected` ili `DateFromBiggerThanDateTo`. Najveća
dozvoljena širina nije objavljena, pa velike periode delite na mesece:

```ts
async function* poMesecima(od: Date, do_: Date) {
  let pocetak = new Date(od)
  while (pocetak < do_) {
    const kraj = new Date(pocetak)
    kraj.setMonth(kraj.getMonth() + 1)
    yield { dateFrom: pocetak, dateTo: kraj > do_ ? do_ : kraj }
    pocetak = kraj
  }
}

for await (const period of poMesecima(new Date('2026-01-01'), new Date('2026-12-31'))) {
  const idjevi = await sef.salesInvoices.ids({ ...period, status: 'Sent' })
  console.log(period.dateFrom.toISOString().slice(0, 10), idjevi.length)
}
```
