---
layout: home

hero:
  name: efaktura-js
  text: Klijent za Sistem elektronskih faktura
  tagline: Svih 85 operacija javnog API-ja SEF-a, uz kreiranje i čitanje UBL 2.1 dokumenata. Bez zavisnosti u izvršavanju.
  actions:
    - theme: brand
      text: Brzi početak
      link: /uvod/brzi-pocetak
    - theme: alt
      text: Vodiči
      link: /vodici/izlazne-fakture
    - theme: alt
      text: GitHub
      link: https://github.com/efaktura-js/efaktura-js

features:
  - title: Potpuna pokrivenost API-ja
    details: Svih 85 operacija – izlazne i ulazne fakture, evidencija PDV-a, CRF, fiskalni računi, carinske deklaracije i šifarnici.
    link: /api/operacije
    linkText: Tabela operacija
  - title: UBL 2.1 za srpski profil
    details: Prosledite običan JavaScript objekat i dobijate ispravan UBL po standardu SRPS EN 16931. Čitanje radi u oba smera.
    link: /ubl/pregled
    linkText: O UBL sloju
  - title: Tačna aritmetika iznosa
    details: Iznosi se računaju preko celobrojnog tipa BigInt, nikada preko brojeva u pokretnom zarezu. Porez se računa nad zbirnom osnovicom, kao u SEF-u.
    link: /ubl/iznosi
    linkText: Iznosi i zaokruživanje
  - title: Generisano iz zvanične specifikacije
    details: Tipovi i tabela operacija nastaju iz OpenAPI dokumenata SEF-a, pa ne mogu da se raziđu sa stvarnim API-jem.
    link: /ostalo/generisanje
    linkText: Kako se generiše
  - title: Rešene specifičnosti SEF-a
    details: PascalCase u odgovorima, ograničenje od 3 zahteva u sekundi, prazno telo kod greške 401 i idempotentno ponavljanje slanja.
    link: /vodici/greske
    linkText: Greške i ponavljanje
  - title: Radi svuda
    details: Univerzalni ESM bez ijedne zavisnosti – Node 20+, Bun, Deno, Cloudflare Workers i veb pregledači.
    link: /uvod/instalacija
    linkText: Instalacija
---

## Primer

```ts
import { EFaktura } from 'efaktura-js'

const sef = new EFaktura({ apiKey: process.env.SEF_API_KEY!, environment: 'demo' })

const { salesInvoiceId } = await sef.salesInvoices.send({
  invoiceNumber: '2026-001',
  issueDate: '2026-08-27',
  deliveryDate: '2026-08-27',
  supplier: { name: 'Dobavljač d.o.o.', vatId: '111560838', registrationId: '21502243' },
  customer: { name: 'Kupac d.o.o.', vatId: '108213413', registrationId: '17862146' },
  lines: [{ name: 'Usluga razvoja', quantity: 10, unitPrice: '1000.00', vatRate: 20 }],
})
```

::: warning Nezvanična biblioteka
`efaktura-js` nije povezan s Ministarstvom finansija Republike Srbije. Merodavan
izvor je [Interno tehničko uputstvo](https://efaktura.gov.rs/tekst/360/interno-tehnicko-uputstvo.php).
:::
