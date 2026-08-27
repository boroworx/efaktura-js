<script setup lang="ts">
import { ref, computed, shallowRef } from 'vue'
import { inspectInvoice, buildInvoiceXml } from '../../../../src/ubl/index.ts'
import type { Inspection } from '../../../../src/ubl/index.ts'

const xml = ref('')
const rezultat = shallowRef<Inspection | null>(null)
const imeDatoteke = ref('')
const prevlacenje = ref(false)

const novac = new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const prikaziIznos = (v: string | undefined) => (v === undefined ? '–' : novac.format(Number(v)))

function analiziraj() {
  rezultat.value = xml.value.trim() ? inspectInvoice(xml.value) : null
}

function ocisti() {
  xml.value = ''
  imeDatoteke.value = ''
  rezultat.value = null
}

async function ucitajDatoteku(file: File) {
  imeDatoteke.value = file.name
  xml.value = await file.text()
  analiziraj()
}

function naDrop(e: DragEvent) {
  prevlacenje.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) void ucitajDatoteku(file)
}

function naIzbor(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) void ucitajDatoteku(file)
}

/** Ispravan primer, napravljen istom bibliotekom. */
function ucitajPrimer() {
  imeDatoteke.value = 'primer.xml'
  xml.value = buildInvoiceXml({
    invoiceNumber: '2026-001',
    issueDate: '2026-08-27',
    dueDate: '2026-09-26',
    deliveryDate: '2026-08-27',
    supplier: {
      name: 'Dobavljač d.o.o.',
      vatId: '111560838',
      registrationId: '21502243',
      address: { street: 'Knez Mihailova 1', city: 'Beograd', postalCode: '11000' },
    },
    customer: { name: 'Kupac d.o.o.', vatId: '108213413', registrationId: '17862146' },
    payment: { account: '160-0000000000000-00', reference: { model: '97', number: '1234567' } },
    lines: [
      { name: 'Usluga razvoja', quantity: 10, unitPrice: '1000.00', vatRate: 20, unitCode: 'HUR' },
      { name: 'Licenca', quantity: 1, unitPrice: '500.00', vatRate: 20 },
    ],
  })
  analiziraj()
}

/** Isti primer, ali sa porezom obračunatim po stavci – kako SEF odbija. */
function ucitajPokvaren() {
  imeDatoteke.value = 'neispravan.xml'
  const dobar = buildInvoiceXml({
    invoiceNumber: '2026-002',
    issueDate: '2026-08-27',
    deliveryDate: '2026-08-27',
    supplier: { name: 'Dobavljač d.o.o.', vatId: '111560838', registrationId: '21502243' },
    customer: { name: 'Kupac d.o.o.', vatId: '108213413', registrationId: '17862146' },
    lines: ['Stavka A', 'Stavka B', 'Stavka C'].map((name) => ({
      name, quantity: 1, unitPrice: '0.33', vatRate: 20,
    })),
  })
  // Porez po stavci: 0,07 + 0,07 + 0,07 = 0,20 zaokruženo naniže -> 0,06.
  xml.value = dobar.replace(
    /<cbc:TaxAmount currencyID="RSD">0\.20<\/cbc:TaxAmount>/,
    '<cbc:TaxAmount currencyID="RSD">0.06</cbc:TaxAmount>',
  )
  analiziraj()
}

const greske = computed(() => rezultat.value?.findings.filter((f) => f.severity === 'error') ?? [])
const upozorenja = computed(() => rezultat.value?.findings.filter((f) => f.severity === 'warning') ?? [])
// Nalaz „Uredu" ponavlja ono što već piše u traci sa statusom.
const obavestenja = computed(
  () => rezultat.value?.findings.filter((f) => f.severity === 'info' && f.code !== 'Uredu') ?? [],
)
const faktura = computed(() => rezultat.value?.invoice)
</script>

<template>
  <div class="insp">
    <div
      class="insp-drop"
      :class="{ 'insp-drop--aktivna': prevlacenje }"
      @dragover.prevent="prevlacenje = true"
      @dragleave.prevent="prevlacenje = false"
      @drop.prevent="naDrop"
    >
      <p class="insp-drop-naslov">Prevucite UBL datoteku ovde</p>
      <p class="insp-drop-opis">
        ili je <label class="insp-veza">izaberite<input type="file" accept=".xml,text/xml,application/xml" @change="naIzbor" /></label>,
        odnosno nalepite sadržaj u polje ispod
      </p>
      <p class="insp-privatnost">
        Dokument ne napušta pregledač. Provera se izvršava kod vas, bez slanja na server.
      </p>
    </div>

    <textarea
      v-model="xml"
      class="insp-unos"
      rows="8"
      spellcheck="false"
      placeholder="<Invoice xmlns=&quot;urn:oasis:names:specification:ubl:schema:xsd:Invoice-2&quot;> …"
    />

    <div class="insp-dugmad">
      <button class="insp-dugme insp-dugme--glavno" :disabled="!xml.trim()" @click="analiziraj">
        Proveri
      </button>
      <button class="insp-dugme" @click="ucitajPrimer">Ispravan primer</button>
      <button class="insp-dugme" @click="ucitajPokvaren">Primer sa greškom</button>
      <button v-if="xml" class="insp-dugme" @click="ocisti">Očisti</button>
      <span v-if="imeDatoteke" class="insp-ime">{{ imeDatoteke }}</span>
    </div>

    <div v-if="rezultat" class="insp-rezultat">
      <div class="insp-status" :class="rezultat.ok ? 'insp-status--ok' : 'insp-status--lose'">
        {{ rezultat.ok ? 'Nije pronađen problem koji bi SEF odbio' : `Pronađeno problema: ${greske.length}` }}
      </div>

      <template v-if="greske.length">
        <h3>Greške</h3>
        <div v-for="(f, i) in greske" :key="'g' + i" class="insp-nalaz insp-nalaz--greska">
          <div class="insp-nalaz-poruka">{{ f.message }}</div>
          <pre v-if="f.detail" class="insp-nalaz-detalj">{{ f.detail }}</pre>
          <code class="insp-sifra">{{ f.code }}</code>
        </div>
      </template>

      <template v-if="rezultat.differences.length">
        <h3>Iznosi koji se ne slažu</h3>
        <div class="insp-tabela-omot">
          <table class="insp-tabela">
            <thead>
              <tr><th>Stavka</th><th>Navedeno</th><th>Izračunato</th><th>Razlika</th></tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in rezultat.differences" :key="'d' + i">
                <td>{{ d.field }}</td>
                <td class="insp-broj">{{ prikaziIznos(d.declared) }}</td>
                <td class="insp-broj insp-broj--tacno">{{ prikaziIznos(d.computed) }}</td>
                <td class="insp-broj insp-broj--razlika">{{ prikaziIznos(d.difference) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-if="upozorenja.length">
        <h3>Upozorenja</h3>
        <div v-for="(f, i) in upozorenja" :key="'u' + i" class="insp-nalaz insp-nalaz--upozorenje">
          <div class="insp-nalaz-poruka">{{ f.message }}</div>
          <pre v-if="f.detail" class="insp-nalaz-detalj">{{ f.detail }}</pre>
          <code class="insp-sifra">{{ f.code }}</code>
        </div>
      </template>

      <template v-if="obavestenja.length">
        <div v-for="(f, i) in obavestenja" :key="'o' + i" class="insp-nalaz insp-nalaz--info">
          {{ f.message }}
        </div>
      </template>

      <template v-if="faktura">
        <h3>Pročitana faktura</h3>
        <div class="insp-mreza">
          <div><span class="insp-oznaka">Broj</span>{{ faktura.invoiceNumber || '–' }}</div>
          <div><span class="insp-oznaka">Datum izdavanja</span>{{ faktura.issueDate || '–' }}</div>
          <div><span class="insp-oznaka">Datum prometa</span>{{ faktura.deliveryDate || '–' }}</div>
          <div><span class="insp-oznaka">Dospeće</span>{{ faktura.dueDate || '–' }}</div>
          <div><span class="insp-oznaka">Vrsta</span>{{ faktura.documentType }}</div>
          <div><span class="insp-oznaka">Valuta</span>{{ faktura.currency }}</div>
          <div><span class="insp-oznaka">Prodavac</span>{{ faktura.supplier.name }} ({{ faktura.supplier.vatId || 'bez PIB-a' }})</div>
          <div><span class="insp-oznaka">Kupac</span>{{ faktura.customer.name }} ({{ faktura.customer.vatId || 'bez PIB-a' }})</div>
        </div>

        <div class="insp-tabela-omot">
          <table class="insp-tabela">
            <thead>
              <tr><th>Stavka</th><th>Količina</th><th>Cena</th><th>PDV</th><th>Kategorija</th></tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in faktura.lines" :key="'s' + i">
                <td>{{ s.name }}</td>
                <td class="insp-broj">{{ s.quantity }} {{ s.unitCode }}</td>
                <td class="insp-broj">{{ prikaziIznos(String(s.unitPrice)) }}</td>
                <td class="insp-broj">{{ s.vatRate ? Number(s.vatRate) + ' %' : '–' }}</td>
                <td>{{ s.vatCategory }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="insp-tabela-omot">
          <table class="insp-tabela">
            <tbody>
              <tr><td>Zbir neto iznosa stavki</td><td class="insp-broj">{{ prikaziIznos(faktura.declaredTotals.lineExtensionAmount) }}</td></tr>
              <tr><td>Ukupan PDV</td><td class="insp-broj">{{ prikaziIznos(faktura.declaredTotals.taxTotal) }}</td></tr>
              <tr><td>Ukupno sa PDV-om</td><td class="insp-broj">{{ prikaziIznos(faktura.declaredTotals.taxInclusiveAmount) }}</td></tr>
              <tr><td><strong>Iznos za plaćanje</strong></td><td class="insp-broj"><strong>{{ prikaziIznos(faktura.declaredTotals.payableAmount) }}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.insp { margin: 1.5rem 0; }

.insp-drop {
  border: 2px dashed var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.75rem 1rem;
  text-align: center;
  transition: border-color .2s, background-color .2s;
  background: var(--vp-c-bg-soft);
}
.insp-drop--aktivna { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.insp-drop-naslov { margin: 0; font-weight: 600; }
.insp-drop-opis { margin: .4rem 0 0; color: var(--vp-c-text-2); font-size: .9rem; }
.insp-privatnost { margin: .75rem 0 0; font-size: .8rem; color: var(--vp-c-text-3); }
.insp-veza { color: var(--vp-c-brand-1); cursor: pointer; text-decoration: underline; }
.insp-veza input { display: none; }

.insp-unos {
  width: 100%; margin-top: 1rem; padding: .75rem;
  font-family: var(--vp-font-family-mono); font-size: .8rem; line-height: 1.5;
  border: 1px solid var(--vp-c-divider); border-radius: 8px;
  background: var(--vp-c-bg-alt); color: var(--vp-c-text-1); resize: vertical;
}
.insp-unos:focus { outline: none; border-color: var(--vp-c-brand-1); }

.insp-dugmad { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-top: .75rem; }
.insp-dugme {
  padding: .45rem .9rem; font-size: .85rem; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1);
}
.insp-dugme:hover:not(:disabled) { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.insp-dugme:disabled { opacity: .5; cursor: not-allowed; }
.insp-dugme--glavno { background: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); color: var(--vp-c-white); }
.insp-dugme--glavno:hover:not(:disabled) { background: var(--vp-c-brand-2); color: var(--vp-c-white); }
.insp-ime { font-size: .8rem; color: var(--vp-c-text-3); font-family: var(--vp-font-family-mono); }

.insp-rezultat { margin-top: 1.5rem; }
.insp-status { padding: .8rem 1rem; border-radius: 8px; font-weight: 600; margin-bottom: 1rem; }
.insp-status--ok { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.insp-status--lose { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }

.insp-nalaz { padding: .7rem .9rem; border-radius: 8px; margin-bottom: .6rem; border-left: 3px solid; }
.insp-nalaz--greska { background: var(--vp-c-danger-soft); border-color: var(--vp-c-danger-1); }
.insp-nalaz--upozorenje { background: var(--vp-c-warning-soft); border-color: var(--vp-c-warning-1); }
.insp-nalaz--info { background: var(--vp-c-bg-soft); border-color: var(--vp-c-divider); font-size: .85rem; color: var(--vp-c-text-2); }
.insp-nalaz-poruka { font-weight: 500; }
.insp-nalaz-detalj {
  margin: .5rem 0 0; padding: .5rem .6rem; font-size: .78rem; white-space: pre-wrap;
  background: var(--vp-c-bg); border-radius: 6px; color: var(--vp-c-text-2);
}
.insp-sifra { font-size: .72rem; color: var(--vp-c-text-3); }

.insp-tabela-omot { overflow-x: auto; margin: .75rem 0 1.25rem; }
.insp-tabela { width: 100%; border-collapse: collapse; font-size: .88rem; }
.insp-tabela th, .insp-tabela td { padding: .5rem .7rem; border-bottom: 1px solid var(--vp-c-divider); text-align: left; }
.insp-tabela th { font-weight: 600; color: var(--vp-c-text-2); }
.insp-broj { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--vp-font-family-mono); }
.insp-broj--tacno { color: var(--vp-c-tip-1); }
.insp-broj--razlika { color: var(--vp-c-danger-1); font-weight: 600; }

.insp-mreza { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: .5rem 1.5rem; margin: .75rem 0 1.25rem; font-size: .9rem; }
.insp-oznaka { display: block; font-size: .74rem; text-transform: uppercase; letter-spacing: .04em; color: var(--vp-c-text-3); }
</style>
