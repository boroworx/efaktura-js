# Okruženja

SEF ima dva odvojena okruženja, sa odvojenim registracijama, odvojenim ključevima
i odvojenim podacima.

| Okruženje | Osnovna adresa | Namena |
| --- | --- | --- |
| `demo` | `https://demoefaktura.mfin.gov.rs` | razvoj i testiranje |
| `production` | `https://efaktura.mfin.gov.rs` | stvarna dokumenta |

```ts
const sef = new EFaktura({ apiKey, environment: 'demo' })
```

Podrazumevana vrednost je `production`, pa okruženje navedite izričito dok
razvijate.

::: warning Ključevi nisu zamenjivi
Demo ključ na produkciji vraća grešku 401, i obrnuto. Registracija na demo
okruženju je odvojena od registracije na produkciji.
:::

## Skup putanja je isti

Oba okruženja izlažu identičan skup operacija, pa kod koji radi na demo
okruženju radi i na produkciji bez izmena.

## Sopstvena adresa

Kada saobraćaj ide preko posrednika ili kada u testovima koristite lažni server,
zadajte adresu neposredno. Tada se `environment` ne uzima u obzir.

```ts
const sef = new EFaktura({ apiKey, baseUrl: 'http://localhost:8080' })
```

## Zamena implementacije funkcije fetch

Za testove, beleženje saobraćaja ili sopstveni posrednički sloj prosledite svoju
implementaciju:

```ts
const sef = new EFaktura({
  apiKey,
  fetch: async (url, init) => {
    console.log(init?.method, String(url))
    return globalThis.fetch(url, init)
  },
})
```

## Podešavanja klijenta

| Opcija | Podrazumevano | Značenje |
| --- | --- | --- |
| `apiKey` | – | obavezan API ključ |
| `environment` | `'production'` | izbor okruženja |
| `baseUrl` | – | sopstvena adresa, ima prednost nad okruženjem |
| `timeout` | `60000` | ograničenje trajanja zahteva, u milisekundama; `0` isključuje |
| `maxRetries` | `3` | broj ponovljenih pokušaja posle prvog |
| `retryDelay` | `500` | osnovno čekanje za eksponencijalno odlaganje |
| `requestsPerSecond` | `3` | usporavanje na strani klijenta; `0` isključuje |
| `fetch` | ugrađeni | zamena implementacije |
| `headers` | `{}` | dodatna zaglavlja uz svaki zahtev |
