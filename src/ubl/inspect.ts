import { parseInvoiceXml, type ParsedInvoice } from './parse.ts'
import { buildInvoice, computeTotals, CUSTOMIZATION_ID } from './build.ts'
import { dec, type Decimal } from './decimal.ts'
import { parse as parseXml, textAt, child, type XmlElement } from './xml.ts'

export type Severity = 'error' | 'warning' | 'info'

export interface Finding {
  severity: Severity
  /** Stable machine-readable code; the message is for people. */
  code: string
  message: string
  detail?: string
}

export interface AmountDifference {
  field: string
  declared: string
  computed: string
  difference: string
}

export interface Inspection {
  /** False when anything would stop SEF from accepting the document. */
  ok: boolean
  /** Absent when the document could not be parsed at all. */
  invoice?: ParsedInvoice
  findings: Finding[]
  /** Amounts stated in the document versus amounts recomputed from its lines. */
  differences: AmountDifference[]
}

const fmt = (d: Decimal) => d.toString(2)

/**
 * Check a UBL document the way SEF would, without sending it.
 *
 * Never throws: every problem, including a malformed document, comes back as a
 * finding. Two classes of problem are reported —
 *
 *   * rules this library already enforces when building (missing exemption
 *     reason, two rates in one tax category, budget customer with no contract
 *     reference, corrective document with nothing referenced), and
 *   * amounts that do not reconcile, which is the most common cause of a
 *     rejection: tax computed per line and summed drifts from tax computed on
 *     the grouped taxable base, which is what SEF recomputes.
 */
export function inspectInvoice(xml: string | Uint8Array): Inspection {
  const findings: Finding[] = []
  const differences: AmountDifference[] = []
  const add = (severity: Severity, code: string, message: string, detail?: string) =>
    findings.push(detail === undefined ? { severity, code, message } : { severity, code, message, detail })

  let invoice: ParsedInvoice
  try {
    invoice = parseInvoiceXml(xml)
  } catch (err) {
    add(
      'error',
      'NeispravanXml',
      'Dokument nije ispravan UBL.',
      err instanceof Error ? err.message : String(err),
    )
    return { ok: false, findings, differences }
  }

  // --- struktura dokumenta ---------------------------------------------------
  const source = typeof xml === 'string' ? xml : new TextDecoder().decode(xml)
  let root: XmlElement | undefined
  try {
    root = parseXml(source)
    const body = child(root, 'DocumentBody')
    if (body) {
      const inner = (body.children ?? []).find(
        (c): c is XmlElement => typeof c === 'object' && c !== null,
      )
      if (inner) root = inner
      add('info', 'Omot', 'Dokument je u omotu DocumentEnvelope; pročitana je faktura iz njega.')
    }
  } catch {
    root = undefined
  }

  const customization = textAt(root, 'CustomizationID')
  if (!customization) {
    add('error', 'NemaCustomizationID', 'Nedostaje CustomizationID.', `Očekuje se: ${CUSTOMIZATION_ID}`)
  } else if (customization !== CUSTOMIZATION_ID) {
    add(
      'error',
      'PogresanCustomizationID',
      'CustomizationID ne odgovara srpskom profilu.',
      `Pronađeno: ${customization}\nOčekuje se: ${CUSTOMIZATION_ID}`,
    )
  }
  if (textAt(root, 'ProfileID')) {
    add(
      'warning',
      'ImaProfileID',
      'Dokument sadrži ProfileID, koga fakture na SEF-u nemaju.',
      'Za razliku od profila Peppol BIS 3.0, SEF ne koristi ProfileID.',
    )
  }

  // --- obavezna polja --------------------------------------------------------
  if (!invoice.invoiceNumber) add('error', 'NemaBrojFakture', 'Nedostaje broj fakture.')
  if (!invoice.issueDate) add('error', 'NemaDatumIzdavanja', 'Nedostaje datum izdavanja.')
  if (!invoice.deliveryDate) {
    add(
      'error',
      'NemaDatumPrometa',
      'Nedostaje datum prometa.',
      'SEF ovo odbija šifrom InvoiceDeliveryDateMissing.',
    )
  }
  if (!invoice.lines.length) add('error', 'NemaStavki', 'Faktura nema nijednu stavku.')

  for (const [uloga, strana] of [
    ['Prodavac', invoice.supplier],
    ['Kupac', invoice.customer],
  ] as const) {
    if (!strana.name) add('error', 'NemaNaziv', `${uloga}: nedostaje poslovno ime.`)
    if (!strana.vatId) {
      add('warning', 'NemaPib', `${uloga}: nedostaje PIB.`)
    } else if (!/^\d{9}$/.test(strana.vatId)) {
      add('warning', 'PibNijeDevetCifara', `${uloga}: PIB nema devet cifara.`, `Pronađeno: ${strana.vatId}`)
    }
    if (strana.registrationId && !/^\d{8}$/.test(strana.registrationId)) {
      add(
        'warning',
        'MaticniBrojNijeOsamCifara',
        `${uloga}: matični broj nema osam cifara.`,
        `Pronađeno: ${strana.registrationId}`,
      )
    }
  }

  // --- pravila koja biblioteka proverava pri kreiranju ------------------------
  let computed: ReturnType<typeof computeTotals> | undefined
  try {
    computed = computeTotals(invoice)
  } catch (err) {
    add(
      'error',
      'PrekrsenoPravilo',
      'Dokument krši pravilo koje SEF proverava.',
      err instanceof Error ? err.message : String(err),
    )
  }

  try {
    buildInvoice(invoice)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // computeTotals već prijavljuje svoja pravila; ne ponavljaj ih.
    if (!findings.some((f) => f.detail === message)) {
      add('error', 'PrekrsenoPravilo', 'Dokument krši pravilo koje SEF proverava.', message)
    }
  }

  // --- iznosi ----------------------------------------------------------------
  if (computed) {
    const parovi: Array<[string, string | undefined, Decimal]> = [
      ['Zbir neto iznosa stavki', invoice.declaredTotals.lineExtensionAmount, computed.lineExtensionAmount],
      ['Ukupno bez PDV', invoice.declaredTotals.taxExclusiveAmount, computed.taxExclusiveAmount],
      ['Ukupan PDV', invoice.declaredTotals.taxTotal, computed.taxTotal],
      ['Ukupno sa PDV-om', invoice.declaredTotals.taxInclusiveAmount, computed.taxInclusiveAmount],
      ['Iznos za plaćanje', invoice.declaredTotals.payableAmount, computed.payableAmount],
    ]
    for (const [field, declared, value] of parovi) {
      if (declared === undefined) {
        add('warning', 'NemaIznos', `Dokument ne navodi: ${field}.`)
        continue
      }
      if (!value.eq(declared)) {
        differences.push({
          field,
          declared,
          computed: fmt(value),
          difference: fmt(value.sub(dec(declared))),
        })
      }
    }
    if (differences.length) {
      add(
        'error',
        'IznosiSeNeSlazu',
        'Navedeni iznosi se ne slažu sa izračunatim.',
        'Najčešći uzrok je obračun poreza po stavci pa sabiranje. SEF porez računa ' +
          'nad zbirnom osnovicom po poreskoj kategoriji.',
      )
    }

    // Poreski međuzbirovi po kategoriji.
    for (const podzbir of computed.subtotals) {
      const naveden = invoice.declaredTaxSubtotals.find((s) => s.category === podzbir.category)
      if (!naveden) {
        add('error', 'NemaMedjuzbir', `Nedostaje poreski međuzbir za kategoriju ${podzbir.category}.`)
        continue
      }
      if (naveden.taxAmount !== undefined && !podzbir.taxAmount.eq(naveden.taxAmount)) {
        differences.push({
          field: `PDV za kategoriju ${podzbir.category}`,
          declared: naveden.taxAmount,
          computed: fmt(podzbir.taxAmount),
          difference: fmt(podzbir.taxAmount.sub(dec(naveden.taxAmount))),
        })
      }
      if (naveden.taxableAmount !== undefined && !podzbir.taxableAmount.eq(naveden.taxableAmount)) {
        differences.push({
          field: `Osnovica za kategoriju ${podzbir.category}`,
          declared: naveden.taxableAmount,
          computed: fmt(podzbir.taxableAmount),
          difference: fmt(podzbir.taxableAmount.sub(dec(naveden.taxableAmount))),
        })
      }
    }
  }

  if (!findings.some((f) => f.severity === 'error')) {
    add('info', 'Uredu', 'Nije pronađen nijedan problem koji bi SEF odbio.')
  }

  return {
    ok: !findings.some((f) => f.severity === 'error'),
    invoice,
    findings,
    differences,
  }
}
