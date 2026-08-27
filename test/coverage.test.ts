import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { operations } from '../src/generated/operations.ts'
import { EFaktura } from '../src/index.ts'

const root = new URL('..', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

test('every operation in the spec is generated', () => {
  const specPaths = (file: string) => {
    const spec = JSON.parse(read(file)) as { paths: Record<string, Record<string, unknown>> }
    return Object.entries(spec.paths).flatMap(([path, item]) =>
      Object.keys(item)
        .filter((m) => ['get', 'post', 'put', 'delete', 'patch'].includes(m))
        .map((m) => `${m.toUpperCase()} ${path}`),
    )
  }
  const expected = new Set([...specPaths('spec/public_v1.json'), ...specPaths('spec/public_v2.json')])
  const generated = new Set(Object.values(operations).map((o) => `${o.method} ${o.path}`))
  assert.deepEqual(
    [...expected].filter((e) => !generated.has(e)),
    [],
    'operations present in the spec but missing from the generated table',
  )
  assert.equal(generated.size, expected.size)
})

test('every generated operation is reachable through a resource method', () => {
  // Without this, an endpoint could exist in the table and still be unusable.
  const sources = readdirSync(new URL('src/resources/', root))
    .map((f) => read(`src/resources/${f}`))
    .join('\n') + read('src/client.ts')

  const unreferenced = Object.keys(operations).filter((key) => !sources.includes(`'${key}'`))
  assert.deepEqual(unreferenced, [], 'operations with no resource method')
})

test('the generator is deterministic and its output is committed', () => {
  const before = ['enums', 'types', 'operations'].map((f) => read(`src/generated/${f}.ts`))
  execFileSync('node', ['scripts/generate.mjs'], { cwd: new URL('.', root) })
  const after = ['enums', 'types', 'operations'].map((f) => read(`src/generated/${f}.ts`))
  assert.deepEqual(after, before, 'regenerating changed the committed output — commit the diff')
})

test('operation definitions are internally consistent', () => {
  for (const [key, op] of Object.entries(operations)) {
    for (const name of op.pathParams) {
      assert.ok(op.path.includes(`{${name}}`), `${key}: pathParam '${name}' not in the path template`)
    }
    for (const m of op.path.matchAll(/\{(.+?)\}/g)) {
      assert.ok(op.pathParams.includes(m[1]!), `${key}: path placeholder '${m[1]}' not declared`)
    }
    if (op.body === 'multipart') assert.ok(op.bodyPart, `${key}: multipart body needs a field name`)
    assert.ok(op.path.startsWith('/api/'), `${key}: unexpected path ${op.path}`)
  }
})

test('the client exposes every namespace', () => {
  const sef = new EFaktura({ apiKey: 'k', environment: 'demo' })
  for (const ns of [
    'salesInvoices', 'purchaseInvoices', 'vat', 'publicPurchaseInvoices', 'cirTickets',
    'fiscal', 'notices', 'customs', 'company', 'reference',
  ]) {
    assert.ok((sef as unknown as Record<string, unknown>)[ns], `missing namespace: ${ns}`)
  }
  assert.equal(typeof sef.subscribe, 'function')
})
