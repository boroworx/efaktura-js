# API ključ

Svaki poziv javnog API-ja SEF-a zahteva zaglavlje `ApiKey`. Ključ se dobija na
portalu i vezuje se za tačno jedno preduzeće.

## Postupak

1. Prijavite se na portal pomoću **eID-ja** ([eid.gov.rs](https://eid.gov.rs/))
   kao administrator preduzeća.
2. Otvorite **Podešavanja → API menadžment**.
3. Izaberite **Generiši ključ**. Ključ je vrednost oblika
   `208a75aa-4c9d-4ef4-8fe3-3867c9ac5e21`.
4. Postavite **API status** na **Aktivno**.

::: danger Ključ mora da se aktivira
Generisan, a neaktiviran ključ vraća grešku 401 s praznim telom odgovora, isto
kao i nepostojeći ključ. Ako prvi poziv ne prolazi, prvo proverite status.
:::

## Upotreba

```ts
const sef = new EFaktura({
  apiKey: process.env.SEF_API_KEY!,
  environment: 'production',
})
```

Ključ nemojte upisivati u izvorni kod. Čuvajte ga u promenljivoj okruženja ili u
sistemu za čuvanje tajni.

## Jedan ključ, jedno preduzeće

SEF nema zaglavlje za izbor preduzeća i nema grupni API. Model je strogo
**jedan API ključ – jedno preduzeće**. Za rad s više preduzeća napravite više
instanci:

```ts
const klijenti = new Map(
  preduzeca.map((p) => [p.pib, new EFaktura({ apiKey: p.apiKey })]),
)
```

## Uzroci greške 401

| Uzrok | Provera |
| --- | --- |
| Ključ nije aktiviran | **Podešavanja → API menadžment**, status mora biti **Aktivno** |
| Demo ključ na produkciji, ili obrnuto | Uporedite `environment` sa okruženjem u kojem je ključ napravljen |
| Preduzeće iz ključa nije isto kao u dokumentu | PIB pošiljaoca u UBL-u mora odgovarati vlasniku ključa |
| Postavljen je informacioni posrednik | Kada je posrednik aktivan, preduzeće ne sme samo da poziva API |

Biblioteka za grešku 401 podiže izuzetak `SefAuthError` čija poruka nabraja ove
uzroke, jer sam odgovor SEF-a nema telo.

## Adrese za notifikacije

Na istom ekranu podešavaju se i adrese na koje SEF šalje obaveštenja o promeni
statusa, odvojeno za izlazna i za ulazna dokumenta. Te adrese se ne mogu
postaviti preko API-ja. Detalji su u vodiču
[Notifikacije o promeni statusa](/vodici/notifikacije).
