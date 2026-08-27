# Notifikacije o promeni statusa

SEF može da javlja promene statusa dokumenata, umesto da ih vi povremeno
proveravate.

## Kako to radi

1. Adrese za prijem podešavaju se **na portalu**, pod
   **Podešavanja → API menadžment → API endpoints**. Postoje tri odvojene adrese:
   za izlazna dokumenta, za ulazna i za dokumenta nosilaca javnih nabavki.
   **Te adrese se ne mogu postaviti preko API-ja.**
2. Pretplata se uključuje pozivom `subscribe()` i **važi samo za naredni dan**.
3. SEF šalje `POST` zahtev na podešenu adresu, s telom koje je istovetno
   odgovoru odgovarajuće `changes` operacije.

```ts
const subscriptionKey = await sef.subscribe()
```

::: warning Pretplata se obnavlja svakodnevno
Poziv `subscribe()` uključuje obaveštenja za sutradan, ne trajno. Postavite ga
kao dnevni zadatak, inače obaveštenja prestaju.
:::

## Obrada dolaznog zahteva

```ts
import { parseNotification, verifyNotification } from 'efaktura-js'

export async function handler(request: Request) {
  const dogadjaji = parseNotification(await request.text())

  for (const dogadjaj of dogadjaji) {
    if (!verifyNotification(dogadjaj, subscriptionKey)) {
      return new Response('Neispravan ključ pretplate', { status: 401 })
    }
    console.log(dogadjaj.salesInvoiceId, dogadjaj.newInvoiceStatus)
  }

  return new Response('OK')
}
```

Metoda `parseNotification()` prihvata tekst ili već raščlanjen objekat, prevodi
imena polja iz PascalCase oblika i uvek vraća niz, bez obzira na to da li je SEF
poslao jedan događaj ili više njih.

## Provera verodostojnosti

SEF **ne šalje zaglavlje s potpisom**. Jedini dokaz da poziv dolazi od SEF-a je
ključ pretplate u telu poruke, isti onaj koji je vratila metoda `subscribe()`.

```ts
if (!verifyNotification(dogadjaj, subscriptionKey)) continue
```

Poređenje se izvodi u konstantnom vremenu, pa ne odaje informacije merenjem
trajanja.

::: danger Adresa za prijem je javna
Pošto potpisa nema, svako ko zna adresu može poslati zahtev. Uvek proveravajte
ključ pretplate i posmatrajte obaveštenje kao nagoveštaj, a ne kao izvor istine.
Stanje potvrdite pozivom `get()` za dati dokument.
:::

## Sadržaj obaveštenja

| Polje | Značenje |
| --- | --- |
| `eventId` | redni broj događaja |
| `date` | trenutak promene |
| `newInvoiceStatus` | novi status dokumenta |
| `salesInvoiceId` ili `purchaseInvoiceId` | identifikator dokumenta |
| `comment` | komentar uz promenu |
| `cirInvoiceId` | identifikator u CRF-u |
| `subscriptionKey` | ključ pretplate, za proveru |
| `stornoNumber` | broj storno dokumenta |
| `cirAssignmentChange` | `Assignment` ili `CancelAssignment` |
| `isSigned` | da li je dokument potpisan |

## Povremeno proveravanje

Ako pretplata nije zgodna, isti podaci dostupni su i bez nje:

```ts
const izlazne = await sef.salesInvoices.changes('2026-08-26')
const ulazne = await sef.purchaseInvoices.changes('2026-08-26')
const javneNabavke = await sef.publicPurchaseInvoices.changes('2026-08-26')
```

Prihvataju se samo protekli datumi, a SEF čuva približno mesec dana istorije.

::: tip Kombinujte oba pristupa
Pretplata daje brzu reakciju, a dnevna provera hvata ono što je propušteno dok
je vaš servis bio nedostupan.
:::

## Evidencija PDV-a nije obuhvaćena

Za promene u evidenciji PDV-a ne postoji adresa za obaveštenja. Njih pratite
pozivima `sef.vat.individual.list()` i `sef.vat.group.list()`.
