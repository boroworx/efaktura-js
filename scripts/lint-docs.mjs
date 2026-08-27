#!/usr/bin/env node
// Style checks for the Serbian documentation.
//
// Encodes the rules from the Microsoft Serbian (Latin) style guide, Pravopis
// srpskoga jezika, and the Ministry of Finance's own terminology, so the common
// traps are caught mechanically instead of by eye.
//
//   node scripts/lint-docs.mjs [files...]   (defaults to README.md + docs/**)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.vitepress' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (full.endsWith('.md')) out.push(full)
  }
  return out
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [join(root, 'README.md'), ...walk(join(root, 'docs'))]

/** Each rule sees only prose — code fences and inline code are blanked out. */
const RULES = [
  {
    id: 'em-dash',
    level: 'error',
    re: /—/g,
    msg: 'Em crta ne postoji u srpskom. Koristite crtu sa razmacima ( – ) ili zarez.',
  },
  {
    id: 'acronym-genitive',
    level: 'error',
    re: /\bAPI-a\b|\bAPIja\b|\bAPI-ju\b(?!\s)/g,
    msg: 'Genitiv je „API-ja" (API se završava samoglasnikom -i, pa dobija -j-).',
  },
  {
    id: 'molimo',
    level: 'error',
    re: /\bmolimo\b/gi,
    msg: '„Molimo vas" ne zvuči prirodno u srpskom. Izostavite ga.',
  },
  {
    id: 'od-strane',
    level: 'error',
    re: /\bod strane\b/gi,
    msg: 'Pasivna konstrukcija iz engleskog. Preformulišite u aktiv.',
  },
  {
    id: 'posesiv',
    level: 'warn',
    re: /\bvaš\w*\b/gi,
    msg: 'Prisvojna zamenica se obično izostavlja; ako je nužna, koristite „svoj".',
  },
  {
    id: 'ijekavica',
    level: 'error',
    re: /\b(vrijeme|mjesto|mjesec|zahtjev\w*|prijevod|sljedeć\w+|grješk\w+|dijel\w*)\b/gi,
    msg: 'Ijekavski oblik. Standard u Srbiji je ekavski.',
  },
  {
    id: 'kroatizam',
    level: 'error',
    re: /\b(sučelj\w+|poslužitelj\w*|tvrtk\w+|tipk\w+|uvjet\w*|preinak\w+|kolačić\w*)\b/gi,
    msg: 'Hrvatski oblik. Koristite srpski ekvivalent (interfejs, server, preduzeće, taster, uslov).',
  },
  {
    id: 'kalk',
    level: 'warn',
    re: /\b(u slučaju da|bazirano na|procesir\w+|apdejt\w+|daunlod\w+|sejv\w+)\b/gi,
    msg: 'Kalk iz engleskog: ako, zasnovano na, obraditi, ažurirati, preuzeti, sačuvati.',
  },
  {
    id: 'krajnja-tacka',
    level: 'warn',
    re: /\bkrajnj\w+ tačk\w+/gi,
    msg: 'Zvuči kao prevodilački artefakt. Koristite „endpoint", „API metoda" ili „putanja".',
  },
  {
    id: 'veliko-slovo',
    level: 'warn',
    re: /(?<![.!?:]\s)(?<!^)(?<!["„(])\b(Internet|Web|Veb)\b/gm,
    msg: 'U srpskom se pišu malim slovom: internet, veb.',
  },
  {
    id: 'engleski-navodnici',
    level: 'warn',
    re: /"[^"]{2,}"/g,
    msg: 'Koristite srpske navodnike „ i " umesto pravih dvostrukih navodnika.',
  },
]

/** Blank out fenced blocks and inline code so rules only see prose. */
function stripCode(text) {
  const lines = text.split('\n')
  let inFence = false
  return lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      return ''
    }
    if (inFence) return ''
    // Keep length stable so column numbers stay meaningful.
    return line.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length))
  })
}

let errors = 0
let warnings = 0

for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  const prose = stripCode(raw)
  const name = relative(root, file)

  prose.forEach((line, i) => {
    for (const rule of RULES) {
      rule.re.lastIndex = 0
      let m
      while ((m = rule.re.exec(line))) {
        const where = `${name}:${i + 1}:${m.index + 1}`
        console.log(`${rule.level === 'error' ? 'GREŠKA ' : 'UPOZOR.'} ${where}  [${rule.id}] ${m[0].trim()}\n         ${rule.msg}`)
        rule.level === 'error' ? errors++ : warnings++
        if (!rule.re.global) break
      }
    }

    // Headings: sentence case, and no terminal period.
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      // Drop a leading step number: '3. Kreiranje…' starts its sentence at 'Kreiranje'.
      const title = heading[2].replace(/`[^`]*`/g, '').replace(/^\d+\.\s*/, '').trim()
      if (/[.]$/.test(title)) {
        console.log(`UPOZOR. ${name}:${i + 1}  [naslov-tacka] Naslov ne završava tačkom.`)
        warnings++
      }
      // Flag a second capitalised word that is not a known proper noun.
      const words = title.split(/\s+/).slice(1)
      const PROPER = /^(SEF|API|PDV|UBL|XML|JSON|CRF|PIB|JBKJS|EPP|HTTP|URL|ID|MIT|Node|JavaScript|TypeScript|GitHub|Cloudflare|Workers|Bun|Deno|PascalCase|OpenAPI|Ministarstv\w*|Srbije|Republike|Podešavanja|Beograd\w*|VitePress|Decimal|BigInt|EFaktura|eFaktur\w*|npm|Serbia|I|Šta|Kako)$/
      for (const w of words) {
        // Strip a hyphenated case ending first: 'API-ja' -> 'API'.
        const clean = w.replace(/[^\wČĆŽŠĐčćžšđ-]/g, '').replace(/-[a-zčćžšđ]+$/, '')
        if (clean.length > 1 && /^[A-ZČĆŽŠĐ]/.test(clean) && !PROPER.test(clean)) {
          console.log(`UPOZOR. ${name}:${i + 1}  [naslov-verzal] „${clean}" – u srpskom se u naslovu veliko slovo piše samo na početku.`)
          warnings++
        }
      }
    }
  })
}

console.log(
  `\n${files.length} datoteka provereno – ${errors} grešaka, ${warnings} upozorenja`,
)
process.exit(errors > 0 ? 1 : 0)
