import test from "node:test"
import assert from "node:assert/strict"

import {
  formatBigIntToViewNumber,
  formatBigIntToViewTokenAmount,
  formatNumberToViewNumber,
  formatPercentToViewPercent,
} from "../src/index.ts"

test("formatNumberToViewNumber formats standard and compact output", () => {
  const result = formatNumberToViewNumber(1234.567, "$", {
    locale: "en-US",
    standardDecimals: 2,
    compactDecimals: 2,
  })

  assert.ok(result)
  assert.equal(result.viewValue, "1,234.57")
  assert.equal(result.compact, "1.23K")
  assert.equal(result.symbol, "$")
  assert.equal(result.belowMin, false)
  assert.equal(result.aboveMax, false)
  assert.equal(result.sign, "")
})

test("formatNumberToViewNumber applies min and max display flags", () => {
  const tiny = formatNumberToViewNumber(0.0049, "$", {
    locale: "en-US",
    standardDecimals: 2,
    minDisplay: 0.01,
  })
  assert.ok(tiny)
  assert.equal(tiny.belowMin, true)
  assert.equal(tiny.viewValue, "0.01")

  const capped = formatNumberToViewNumber(12345.678, "$", {
    locale: "en-US",
    standardDecimals: 2,
    maxDisplay: 10000,
  })
  assert.ok(capped)
  assert.equal(capped.aboveMax, true)
  assert.equal(capped.viewValue, "10,000.00")
})

test("formatBigIntToViewNumber converts base-units bigint to number display", () => {
  const result = formatBigIntToViewNumber(123_456_789n, 8, "$", {
    locale: "en-US",
    standardDecimals: 2,
    compactDecimals: 2,
  })

  assert.ok(result)
  assert.equal(result.viewValue, "1.23")
  assert.equal(result.compact, "1.23")
  assert.equal(result.decimals, 8)
  assert.equal(result.symbol, "$")
})

test("formatBigIntToViewNumber throws for non-bigint-like string input", () => {
  assert.throws(() => {
    formatBigIntToViewNumber("abc", 8, "$")
  }, /bigint-like string/)
})

test("formatBigIntToViewTokenAmount formats token values and tiny floor", () => {
  const standard = formatBigIntToViewTokenAmount(
    { bigIntValue: 1_234_567n, decimals: 6, symbol: "USDC" },
    { locale: "en-US", compactDecimals: 2 },
  )

  assert.ok(standard)
  assert.equal(standard.viewValue, "1.234567")
  assert.equal(standard.compact, "1.23")
  assert.equal(standard.symbol, "USDC")
  assert.equal(standard.belowMin, false)
  assert.equal(standard.aboveMax, false)

  const tiny = formatBigIntToViewTokenAmount(
    { bigIntValue: 5n, decimals: 9, symbol: "ABC" },
    { locale: "en-US", minDisplay: 0.000001, singleDigitDecimals: 6 },
  )

  assert.ok(tiny)
  assert.equal(tiny.viewValue, "0.000001")
  assert.equal(tiny.belowMin, true)
})

test("formatPercentToViewPercent converts ratio to percent display", () => {
  const percent = formatPercentToViewPercent(0.0954, {
    locale: "en-US",
    standardDecimals: 2,
    compactDecimals: 2,
  })

  assert.equal(percent.viewValue, "9.54")
  assert.equal(percent.compact, "9.54")
  assert.equal(percent.symbol, "%")
  assert.equal(percent.belowMin, false)
  assert.equal(percent.aboveMax, false)

  const zero = formatPercentToViewPercent(0, { locale: "en-US" })
  assert.equal(zero.viewValue, "0.00")
  assert.equal(zero.sign, "")
})
