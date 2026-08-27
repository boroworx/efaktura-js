# Dnevnik izmena

Format prati [Keep a Changelog](https://keepachangelog.com/), a verzionisanje
[semver](https://semver.org/).

## 0.2.0

### Novo

- **`inspectInvoice()`** – provera UBL dokumenta bez slanja na SEF. Vraća
  pročitanu fakturu, spisak nalaza i iznose koji se ne slažu:

  ```ts
  import { inspectInvoice } from 'efaktura-js/ubl'

  const nalaz = inspectInvoice(xml)
  if (!nalaz.ok) throw new Error('Dokument ne bi prošao proveru na SEF-u')
  ```

  Proverava se ono što se može utvrditi iz samog dokumenta: iznosi se ponovo
  računaju iz stavki i porede sa navedenima, primenjuju se pravila srpskog
  profila (osnov izuzeća kod kategorija bez poreza, jedan poreski međuzbir po
  kategoriji, obavezne reference kod korisnika javnih sredstava, upućivanje na
  dokument kod smanjenja i povećanja) i proverava se struktura, uključujući
  `CustomizationID`, obavezne datume i oblik PIB-a i matičnog broja.

  Funkcija nikada ne baca izuzetak – i neispravan XML vraća se kao nalaz, pa se
  može pozvati nad bilo kakvim ulazom. Prihvata i dokument umotan u
  `DocumentEnvelope`.

  Najkorisniji nalaz je neslaganje iznosa, jer hvata najčešći uzrok odbijanja:
  porez obračunat po stavci pa sabran razlikuje se od poreza obračunatog nad
  zbirnom osnovicom po poreskoj kategoriji, a SEF računa na ovaj drugi način.

- Uz funkciju su izvezeni i tipovi `Inspection`, `Finding`, `Severity` i
  `AmountDifference`.

### Dokumentacija

- Nova stranica [Pregled UBL fakture](https://boroworx.github.io/efaktura-js/alatke/pregled-ubl),
  alatka koja istu proveru izvršava u pregledaču. Dokument se ne šalje ni na
  jedan server, pa je bezbedno učitati i stvarnu fakturu.

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
