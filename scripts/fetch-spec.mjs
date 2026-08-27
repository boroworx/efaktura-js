#!/usr/bin/env node
// Refresh the vendored OpenAPI specs from the SEF demo environment.
//
// The spec URLs are not the conventional /swagger/v1/swagger.json (that path
// returns HTTP 500); they are named by the Swagger UI config at
// https://demoefaktura.mfin.gov.rs/swagger/index.js
import { writeFile } from 'node:fs/promises'

const SPECS = {
  public_v1: 'https://demoefaktura.mfin.gov.rs/swagger/public_v1/swagger.json',
  public_v2: 'https://demoefaktura.mfin.gov.rs/swagger/public_v2/swagger.json',
}

for (const [name, url] of Object.entries(SPECS)) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} from ${url}`)
  const spec = await res.json()
  if (!spec.paths) throw new Error(`${name}: response has no "paths" — not an OpenAPI document`)
  const out = new URL(`../spec/${name}.json`, import.meta.url)
  await writeFile(out, JSON.stringify(spec, null, 2) + '\n')
  console.log(`${name}: ${Object.keys(spec.paths).length} paths -> spec/${name}.json`)
}
console.log('\nNow re-run: node scripts/generate.mjs')
