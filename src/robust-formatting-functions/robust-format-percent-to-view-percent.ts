import { formatPercentToViewPercent } from "../formatting-functions/numberToViewPercentage.js"
import {
  type RobustFormattingBaseOptions,
  type RobustFormattingResult,
  type RobustPercentFormattingInput,
  type RequiredFieldNames,
  finalizeRobustFormattingResult,
  normalizeNumberValue,
  reportMissingRequiredFields,
  resolveRuntimeType,
  toErrorMessage,
} from "./robust-formatting.js"

type FormatPercentToViewPercentOptions =
  Parameters<typeof formatPercentToViewPercent>[1]
type FormatPercentToViewPercentValue = ReturnType<typeof formatPercentToViewPercent>

/**
 * Runtime-safe wrapper options for {@link robustFormatPercentToViewPercent}.
 *
 * `requiredFields` is key-typed against `input`.
 * `multiplier` / `divider` are applied before percent formatting.
 */
export interface RobustFormatPercentToViewPercentOptions
  extends RobustFormattingBaseOptions {
  input?: RobustPercentFormattingInput
  options?: FormatPercentToViewPercentOptions
  requiredFields?: RequiredFieldNames<RobustPercentFormattingInput>
  multiplier?: unknown
  divider?: unknown
}

function normalizeScaleFactor(
  fieldName: "multiplier" | "divider",
  value: unknown,
  warnings: string[],
  errors: string[],
): number | undefined {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      errors.push(`${fieldName} number "${value}" is not finite.`)
      return undefined
    }
    return value
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      errors.push(`${fieldName} string is empty and cannot be converted to number.`)
      return undefined
    }

    const parsedValue = Number(trimmedValue)
    if (!Number.isFinite(parsedValue)) {
      errors.push(
        `${fieldName} string "${value}" is not a finite numeric representation.`,
      )
      return undefined
    }

    warnings.push(`${fieldName} came as string and was automatically converted to number.`)
    return parsedValue
  }

  if (typeof value === "bigint") {
    if (
      value < BigInt(Number.MIN_SAFE_INTEGER) ||
      value > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      errors.push(
        `${fieldName} bigint "${value.toString()}" exceeds safe number range and cannot be converted.`,
      )
      return undefined
    }

    warnings.push(`${fieldName} came as bigint and was automatically converted to number.`)
    return Number(value)
  }

  errors.push(
    `${fieldName} has unsupported runtime type "${resolveRuntimeType(value)}"; expected number-like input.`,
  )
  return undefined
}

/**
 * Robustly normalizes percent input, applies optional scaling, and formats via
 * {@link formatPercentToViewPercent}.
 *
 * Scaling step:
 * `scaledValue = (value * multiplier) / divider`
 *
 * Notes:
 * - defaults: `multiplier = 1`, `divider = 1`
 * - `divider = 0` is treated as an error
 */
export function robustFormatPercentToViewPercent({
  input,
  options,
  multiplier = 1,
  divider = 1,
  context = "robustFormatPercentToViewPercent",
  requiredFields,
  missingRequiredFieldSeverity = "warning",
}: RobustFormatPercentToViewPercentOptions = {}): RobustFormattingResult<FormatPercentToViewPercentValue> {
  const warnings: string[] = []
  const errors: string[] = []

  const hasMissingRequiredField = reportMissingRequiredFields(
    input,
    requiredFields,
    warnings,
    errors,
    missingRequiredFieldSeverity,
  )

  if (hasMissingRequiredField) {
    return finalizeRobustFormattingResult<FormatPercentToViewPercentValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  const normalizedValue = normalizeNumberValue(input?.value, warnings, errors)
  const normalizedMultiplier = normalizeScaleFactor(
    "multiplier",
    multiplier,
    warnings,
    errors,
  )
  const normalizedDivider = normalizeScaleFactor("divider", divider, warnings, errors)

  if (normalizedDivider !== undefined && normalizedDivider === 0) {
    errors.push("divider cannot be zero.")
  }

  if (errors.length > 0) {
    return finalizeRobustFormattingResult<FormatPercentToViewPercentValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  if (
    normalizedValue === undefined ||
    normalizedMultiplier === undefined ||
    normalizedDivider === undefined
  ) {
    return finalizeRobustFormattingResult<FormatPercentToViewPercentValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  try {
    const scaledValue = (normalizedValue * normalizedMultiplier) / normalizedDivider
    const value = formatPercentToViewPercent(scaledValue, options)

    return finalizeRobustFormattingResult(context, value, warnings, errors)
  } catch (error) {
    errors.push(`formatPercentToViewPercent threw: ${toErrorMessage(error)}.`)

    return finalizeRobustFormattingResult<FormatPercentToViewPercentValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }
}
