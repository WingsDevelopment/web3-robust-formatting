import test from "node:test"
import assert from "node:assert/strict"

import {
  buildRobustDiagnosticsMessage,
  mapRobustFormattingToDisplayValue,
  mergeRobustDiagnostics,
  robustCalculateTokenValue,
  robustFormatBigIntToViewNumber,
  robustFormatBigIntToViewTokenAmount,
  robustFormatNumberToViewNumber,
  robustFormatPercentToViewPercent,
} from "../src/index.ts"

function runWithSilencedConsoleError(fn) {
  const originalError = console.error
  const calls = []
  console.error = (...args) => {
    calls.push(args)
  }

  try {
    return { result: fn(), calls }
  } finally {
    console.error = originalError
  }
}

test("robustFormatBigIntToViewTokenAmount handles valid and coerced inputs", () => {
  const validRun = runWithSilencedConsoleError(() =>
    robustFormatBigIntToViewTokenAmount({
      context: "tests.robust.tokenAmount.valid",
      input: { bigIntValue: 1234567n, decimals: 6, symbol: "USDC" },
      requiredFields: ["bigIntValue", "decimals"],
    }),
  )

  assert.equal(validRun.result.errors.length, 0)
  assert.equal(validRun.result.warnings.length, 0)
  assert.equal(validRun.calls.length, 0)
  assert.equal(validRun.result.value?.viewValue, "1.234567")

  const validRun2 = runWithSilencedConsoleError(() =>
    robustFormatBigIntToViewTokenAmount({
      context: "tests.robust.tokenAmount.valid",
      input: { bigIntValue: 11234567n, decimals: 6, symbol: "USDC" },
      requiredFields: ["bigIntValue", "decimals"],
    }),
  )

  assert.equal(validRun2.result.errors.length, 0)
  assert.equal(validRun2.result.warnings.length, 0)
  assert.equal(validRun2.calls.length, 0)
  assert.equal(validRun2.result.value?.viewValue, "11.23")

  const coercedRun = runWithSilencedConsoleError(() =>
    robustFormatBigIntToViewTokenAmount({
      context: "tests.robust.tokenAmount.coerced",
      input: { bigIntValue: "1234567", decimals: "6", symbol: "USDC" },
      requiredFields: ["bigIntValue", "decimals"],
    }),
  )

  assert.ok(coercedRun.result.value)
  assert.equal(coercedRun.result.errors.length, 0)
  assert.ok(
    coercedRun.result.warnings.includes(
      "bigIntValue came as string and was automatically converted to bigint.",
    ),
  )
  assert.ok(
    coercedRun.result.warnings.includes(
      "decimals came as string and was automatically converted to number.",
    ),
  )
  assert.equal(coercedRun.calls.length, coercedRun.result.warnings.length)
})

test("robustFormatBigIntToViewTokenAmount reports required-field and type errors", () => {
  const missingRequiredRun = runWithSilencedConsoleError(() =>
    robustFormatBigIntToViewTokenAmount({
      context: "tests.robust.tokenAmount.missingRequired",
      input: { bigIntValue: undefined, decimals: 6, symbol: "USDC" },
      requiredFields: ["bigIntValue"],
      missingRequiredFieldSeverity: "warning",
    }),
  )

  assert.equal(missingRequiredRun.result.value, undefined)
  assert.equal(missingRequiredRun.result.errors.length, 0)
  assert.ok(
    missingRequiredRun.result.warnings.includes("bigIntValue is required but received undefined."),
  )

  const invalidTypeRun = runWithSilencedConsoleError(() =>
    robustFormatBigIntToViewTokenAmount({
      context: "tests.robust.tokenAmount.invalidType",
      input: { bigIntValue: { nope: true }, decimals: 6, symbol: "USDC" },
      requiredFields: ["bigIntValue", "decimals"],
    }),
  )

  assert.equal(invalidTypeRun.result.value, undefined)
  assert.ok(
    invalidTypeRun.result.errors.includes('bigIntValue has unsupported runtime type "object".'),
  )
})

test("robustFormatBigIntToViewNumber reports invalid decimals", () => {
  const run = runWithSilencedConsoleError(() =>
    robustFormatBigIntToViewNumber({
      context: "tests.robust.bigIntToViewNumber.invalidDecimals",
      input: { bigIntValue: "1234500", decimals: "bad", symbol: "$" },
      requiredFields: ["bigIntValue", "decimals"],
    }),
  )

  assert.equal(run.result.value, undefined)
  assert.ok(
    run.result.errors.includes(
      'decimals string "bad" is invalid; expected non-negative integer string.',
    ),
  )
})

test("robust bigint formatters require decimals when bigint value is present", () => {
  const asWarningRun = runWithSilencedConsoleError(() =>
    robustFormatBigIntToViewNumber({
      context: "tests.robust.bigIntToViewNumber.missingDecimals.warning",
      input: { bigIntValue: "1234500", symbol: "$" },
    }),
  )

  assert.equal(asWarningRun.result.value, undefined)
  assert.ok(asWarningRun.result.warnings.includes("decimals is required but received undefined."))

  const asErrorRun = runWithSilencedConsoleError(() =>
    robustFormatBigIntToViewTokenAmount({
      context: "tests.robust.bigIntToViewTokenAmount.missingDecimals.error",
      input: { bigIntValue: "1234500", symbol: "USDC" },
      missingRequiredFieldSeverity: "error",
    }),
  )

  assert.equal(asErrorRun.result.value, undefined)
  assert.ok(asErrorRun.result.errors.includes("decimals is required but received undefined."))
})

test("robust bigint formatters allow overriding default decimals requirement", () => {
  const run = runWithSilencedConsoleError(() =>
    robustFormatBigIntToViewNumber({
      context: "tests.robust.bigIntToViewNumber.overrideDefaultRequiredFields",
      input: { bigIntValue: "1234500", symbol: "$" },
      requiredFields: [],
    }),
  )

  assert.equal(run.result.value, undefined)
  assert.equal(run.result.warnings.length, 1)
  assert.ok(
    run.result.warnings.includes(
      "bigIntValue came as string and was automatically converted to bigint.",
    ),
  )
  assert.equal(run.result.errors.length, 0)
})

test("robustFormatNumberToViewNumber handles coercion and invalid type", () => {
  const coercionRun = runWithSilencedConsoleError(() =>
    robustFormatNumberToViewNumber({
      context: "tests.robust.numberToViewNumber.string",
      input: { value: "42.42", symbol: "$" },
      requiredFields: ["value"],
    }),
  )

  assert.equal(coercionRun.result.value?.viewValue, "42.42")
  assert.equal(coercionRun.result.errors.length, 0)
  assert.ok(
    coercionRun.result.warnings.includes(
      "value came as string and was automatically converted to number.",
    ),
  )

  const invalidTypeRun = runWithSilencedConsoleError(() =>
    robustFormatNumberToViewNumber({
      context: "tests.robust.numberToViewNumber.invalidType",
      input: { value: { bad: true }, symbol: "$" },
      requiredFields: ["value"],
    }),
  )

  assert.equal(invalidTypeRun.result.value, undefined)
  assert.ok(
    invalidTypeRun.result.errors.includes(
      'value has unsupported runtime type "object"; expected number-like input.',
    ),
  )
})

test("robustFormatPercentToViewPercent keeps zero valid and supports required-field error severity", () => {
  const zeroRun = runWithSilencedConsoleError(() =>
    robustFormatPercentToViewPercent({
      context: "tests.robust.percent.zero",
      input: { value: 0 },
      requiredFields: ["value"],
    }),
  )

  assert.equal(zeroRun.result.errors.length, 0)
  assert.equal(zeroRun.result.warnings.length, 0)
  assert.equal(zeroRun.result.value?.viewValue, "0.00")

  const missingAsErrorRun = runWithSilencedConsoleError(() =>
    robustFormatPercentToViewPercent({
      context: "tests.robust.percent.missingError",
      input: { value: undefined },
      requiredFields: ["value"],
      missingRequiredFieldSeverity: "error",
    }),
  )

  assert.equal(missingAsErrorRun.result.value, undefined)
  assert.ok(missingAsErrorRun.result.errors.includes("value is required but received undefined."))
})

test("robustFormatPercentToViewPercent supports multiplier/divider scaling", () => {
  const scaledRun = runWithSilencedConsoleError(() =>
    robustFormatPercentToViewPercent({
      context: "tests.robust.percent.scaled",
      input: { value: 25 },
      multiplier: 1,
      divider: 100,
    }),
  )

  assert.equal(scaledRun.result.errors.length, 0)
  assert.equal(scaledRun.result.value?.viewValue, "25.00")

  const dividerZeroRun = runWithSilencedConsoleError(() =>
    robustFormatPercentToViewPercent({
      context: "tests.robust.percent.dividerZero",
      input: { value: 25 },
      divider: 0,
    }),
  )

  assert.equal(dividerZeroRun.result.value, undefined)
  assert.ok(dividerZeroRun.result.errors.includes("divider cannot be zero."))
})

test("robustCalculateTokenValue handles valid, coerced, missing, and invalid input", () => {
  const validRun = runWithSilencedConsoleError(() =>
    robustCalculateTokenValue({
      context: "tests.robust.calculate.valid",
      input: {
        tokenAmount: 2_500_000_000_000_000_000n,
        tokenPrice: 1.02,
        tokenDecimals: 18,
        tokenPriceDecimals: 8,
      },
    }),
  )

  assert.equal(validRun.result.errors.length, 0)
  assert.equal(validRun.result.warnings.length, 0)
  assert.equal(validRun.result.value?.tokenValueRaw, 255_000_000n)
  assert.equal(validRun.result.value?.tokenValueDecimals, 8)

  const coercedRun = runWithSilencedConsoleError(() =>
    robustCalculateTokenValue({
      context: "tests.robust.calculate.coerced",
      input: {
        tokenAmount: "2500000000000000000",
        tokenPrice: "1.02",
        tokenDecimals: "18",
        tokenPriceDecimals: "8",
      },
    }),
  )

  assert.equal(coercedRun.result.errors.length, 0)
  assert.equal(coercedRun.result.value?.tokenValueRaw, 255_000_000n)
  assert.ok(
    coercedRun.result.warnings.includes(
      "tokenPrice came as string and was parsed into scaled bigint price value.",
    ),
  )

  const missingRequiredRun = runWithSilencedConsoleError(() =>
    robustCalculateTokenValue({
      context: "tests.robust.calculate.missing",
      input: {
        tokenAmount: 2_500_000_000_000_000_000n,
        tokenPrice: undefined,
        tokenDecimals: 18,
        tokenPriceDecimals: 8,
      },
      missingRequiredFieldSeverity: "warning",
    }),
  )

  assert.equal(missingRequiredRun.result.value, undefined)
  assert.ok(
    missingRequiredRun.result.warnings.includes("tokenPrice is required but received undefined."),
  )

  const invalidPriceRun = runWithSilencedConsoleError(() =>
    robustCalculateTokenValue({
      context: "tests.robust.calculate.invalidPrice",
      input: {
        tokenAmount: 2_500_000_000_000_000_000n,
        tokenPrice: "abc",
        tokenDecimals: 18,
        tokenPriceDecimals: 8,
      },
    }),
  )

  assert.equal(invalidPriceRun.result.value, undefined)
  assert.ok(
    invalidPriceRun.result.errors.some((line) =>
      line.startsWith('tokenPrice string "abc" is invalid:'),
    ),
  )
})

test("diagnostics helpers merge and format messages", () => {
  const merged = mergeRobustDiagnostics(
    { warnings: ["w1", "w1"], errors: ["e1"] },
    { warnings: ["w2"], errors: ["e1", "e2"] },
  )

  assert.deepEqual(merged.warnings, ["w1", "w2"])
  assert.deepEqual(merged.errors, ["e1", "e2"])

  const message = buildRobustDiagnosticsMessage({
    warnings: ["w1", "w1", "  "],
    errors: ["e1"],
  })

  assert.equal(message, "Errors:\n- e1\nWarnings:\n- w1")
})

test("mapRobustFormattingToDisplayValue keeps result payload shape", () => {
  const mapped = mapRobustFormattingToDisplayValue({
    value: { viewValue: "1.23" },
    warnings: ["w1"],
    errors: ["e1"],
  })

  assert.deepEqual(mapped, {
    value: { viewValue: "1.23" },
    warnings: ["w1"],
    errors: ["e1"],
  })
})
