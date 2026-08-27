/**
 * Fixed-point decimal arithmetic on BigInt.
 *
 * Invoice totals must not go through binary floating point: `0.1 + 0.2` is the
 * classic example, and SEF rejects documents whose totals do not reconcile to
 * the cent (`UBLTaxSubtotalTaxableAmountNotValid` and friends). Every amount in
 * the UBL builder flows through this type.
 */
export class Decimal {
  /** Value scaled by 10**scale. */
  readonly units: bigint
  readonly scale: number

  private constructor(units: bigint, scale: number) {
    this.units = units
    this.scale = scale
  }

  static from(value: Decimal | string | number | bigint): Decimal {
    if (value instanceof Decimal) return value
    if (typeof value === 'bigint') return new Decimal(value, 0)
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new TypeError(`Not a finite number: ${value}`)
      // Round-trip through the shortest representation JS will print, which is
      // the decimal the caller most likely meant.
      return Decimal.from(String(value))
    }
    const text = value.trim()
    const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(text)
    if (!m || (!m[2] && !m[3])) throw new TypeError(`Not a decimal: ${JSON.stringify(value)}`)
    const sign = m[1] === '-' ? -1n : 1n
    const whole = m[2] || '0'
    const frac = m[3] ?? ''
    return new Decimal(sign * BigInt(whole + frac), frac.length)
  }

  static zero(scale = 2): Decimal {
    return new Decimal(0n, scale)
  }

  /** Re-express at a larger scale without losing value. */
  #at(scale: number): bigint {
    if (scale < this.scale) throw new RangeError('rescale would lose precision')
    return this.units * 10n ** BigInt(scale - this.scale)
  }

  add(other: Decimal | string | number): Decimal {
    const b = Decimal.from(other)
    const scale = Math.max(this.scale, b.scale)
    return new Decimal(this.#at(scale) + b.#at(scale), scale)
  }

  sub(other: Decimal | string | number): Decimal {
    const b = Decimal.from(other)
    const scale = Math.max(this.scale, b.scale)
    return new Decimal(this.#at(scale) - b.#at(scale), scale)
  }

  mul(other: Decimal | string | number): Decimal {
    const b = Decimal.from(other)
    return new Decimal(this.units * b.units, this.scale + b.scale)
  }

  /** Round half-away-from-zero, which is what invoice rounding conventionally means. */
  round(scale: number): Decimal {
    if (scale >= this.scale) return new Decimal(this.#at(scale), scale)
    const factor = 10n ** BigInt(this.scale - scale)
    const q = this.units / factor
    const r = this.units % factor
    const half = factor / 2n
    const abs = r < 0n ? -r : r
    if (abs * 2n >= factor || abs > half) {
      return new Decimal(q + (this.units < 0n ? -1n : 1n), scale)
    }
    return new Decimal(q, scale)
  }

  isZero(): boolean {
    return this.units === 0n
  }

  eq(other: Decimal | string | number): boolean {
    const b = Decimal.from(other)
    const scale = Math.max(this.scale, b.scale)
    return this.#at(scale) === b.#at(scale)
  }

  /** Fixed-point string with exactly `scale` decimals — the UBL wire format. */
  toString(scale: number = this.scale): string {
    const d = this.round(scale)
    const negative = d.units < 0n
    const digits = (negative ? -d.units : d.units).toString().padStart(scale + 1, '0')
    const whole = digits.slice(0, digits.length - scale) || '0'
    const frac = scale > 0 ? '.' + digits.slice(digits.length - scale) : ''
    return `${negative ? '-' : ''}${whole}${frac}`
  }

  toNumber(): number {
    return Number(this.toString())
  }
}

export const dec = (v: Decimal | string | number | bigint): Decimal => Decimal.from(v)

/** Sum, returning `0.00` for an empty list. */
export const sum = (values: readonly Decimal[]): Decimal =>
  values.reduce((a, b) => a.add(b), Decimal.zero(2))
