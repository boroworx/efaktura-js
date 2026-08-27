import test from 'node:test'
import assert from 'node:assert/strict'
import { Decimal, dec, sum } from '../src/ubl/decimal.ts'

test('decimal addition is exact where floats are not', () => {
  assert.equal(dec('0.1').add('0.2').toString(2), '0.30')
  assert.notEqual(0.1 + 0.2, 0.3) // the reason this class exists
  assert.equal(sum([dec('0.1'), dec('0.2'), dec('0.3')]).toString(2), '0.60')
})

test('rounds half away from zero, symmetrically', () => {
  assert.equal(dec('1234.565').round(2).toString(2), '1234.57')
  assert.equal(dec('-1234.565').round(2).toString(2), '-1234.57')
  assert.equal(dec('2.675').round(2).toString(2), '2.68')
  assert.equal(dec('0.005').round(2).toString(2), '0.01')
  assert.equal(dec('-0.005').round(2).toString(2), '-0.01')
})

test('rounds down below the halfway point', () => {
  assert.equal(dec('1.234').round(2).toString(2), '1.23')
  assert.equal(dec('1.2349999').round(2).toString(2), '1.23')
  assert.equal(dec('-1.234').round(2).toString(2), '-1.23')
})

test('multiplication keeps full precision until rounded', () => {
  assert.equal(dec('8333.33').mul('0.20').toString(), '1666.6660')
  assert.equal(dec('8333.33').mul('0.20').round(2).toString(2), '1666.67')
  assert.equal(dec(3).mul('1000.00').toString(2), '3000.00')
})

test('handles large amounts without precision loss', () => {
  // Beyond 2^53, where a float64 silently loses cents.
  const big = dec('99999999999999.99')
  assert.equal(big.add('0.01').toString(2), '100000000000000.00')
})

test('parses numbers, strings and bigints', () => {
  assert.equal(dec(1.5).toString(2), '1.50')
  assert.equal(dec('.5').toString(2), '0.50')
  assert.equal(dec('-.5').toString(2), '-0.50')
  assert.equal(dec(10n).toString(2), '10.00')
  assert.equal(Decimal.zero().toString(2), '0.00')
})

test('rejects values that are not decimals', () => {
  assert.throws(() => dec('abc'), TypeError)
  assert.throws(() => dec(''), TypeError)
  assert.throws(() => dec(Number.NaN), TypeError)
  assert.throws(() => dec(Number.POSITIVE_INFINITY), TypeError)
})

test('equality compares across scales', () => {
  assert.ok(dec('1.5').eq('1.50'))
  assert.ok(dec('0').eq(0))
  assert.ok(!dec('1.5').eq('1.51'))
  assert.ok(dec('0.00').isZero())
})
