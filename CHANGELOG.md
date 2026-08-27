# Dnevnik izmena

Format prati [Keep a Changelog](https://keepachangelog.com/), a verzionisanje
[semver](https://semver.org/).

## 0.1.1

### Ispravke

- **`iterate()` je mogao da obori proces.** Kada potrošač prekine petlju
  (`break`) ili kada neka ranija stavka baci grešku, zahtevi koji su u tom
  trenutku bili u letu ostajali su bez obrađivača greške. Node takvu
  neobrađenu grešku podrazumevano tretira kao pad procesa. Pogađalo je
  `sef.salesInvoices.iterate()` i `sef.purchaseInvoices.iterate()`, i to u
  sasvim uobičajenom obrascu:

  ```ts
  for await (const f of sef.salesInvoices.iterate({ dateFrom, dateTo })) {
    if (f.status === 'Approved') break // dovoljno je da jedan uporedni zahtev padne
  }
  ```

- **Prekinuti zahtevi više ne zauzimaju mesto u redu čekanja.** Zahtev prekinut
  preko `AbortSignal` i dalje je čekao svoj red kod ograničavača brzine i
  trošio žeton, pa je bez potrebe usporavao zahteve iza sebe. Sada odmah
  odustaje od mesta. U slučaju sa šest zahteva i ograničenjem od dva u sekundi,
  gde su četiri prekinuta, trajanje je palo sa 2001 ms na 27 ms.

### Ostalo

- Dodat `CHANGELOG.md`.
- Testovi za oba slučaja, uključujući proveru da se neobrađena greška ne
  pojavljuje.

## 0.1.0

Prvo izdanje.
