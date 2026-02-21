import { formatBigIntToViewNumber } from "../formatting-functions/bigIntToViewNumber.js"
import {
  type RobustBigIntFormattingInput,
  type RobustFormattingBaseOptions,
  type RobustFormattingResult,
  type RequiredFieldNames,
  finalizeRobustFormattingResult,
  normalizeBigIntValue,
  normalizeDecimals,
  normalizeSymbol,
  reportMissingRequiredFields,
  toErrorMessage,
} from "./robust-formatting.js"

type FormatBigIntToViewNumberOptions = Parameters<typeof formatBigIntToViewNumber>[3]
type FormatBigIntToViewNumberValue = ReturnType<typeof formatBigIntToViewNumber>
const DEFAULT_REQUIRED_BIGINT_FIELDS = ["decimals"] as const

/**
 * Runtime-safe wrapper options for {@link robustFormatBigIntToViewNumber}.
 *
 * `requiredFields` is key-typed against `input`.
 * Default behavior requires `decimals` when `bigIntValue` is present.
 */
export interface RobustFormatBigIntToViewNumberOptions extends RobustFormattingBaseOptions {
  input?: RobustBigIntFormattingInput
  options?: FormatBigIntToViewNumberOptions
  requiredFields?: RequiredFieldNames<RobustBigIntFormattingInput>
}

/**
 * Robustly normalizes bigint-like input and formats it via {@link formatBigIntToViewNumber}.
 *
 * Behavior:
 * - `requiredFields` defaults to `["decimals"]`
 * - if `input.bigIntValue == null`, the default requirement is removed
 * - caller can override with explicit `requiredFields`
 */
export function robustFormatBigIntToViewNumber(
  params: RobustFormatBigIntToViewNumberOptions = {},
): RobustFormattingResult<FormatBigIntToViewNumberValue> {
  const {
    input,
    options,
    context = "robustFormatBigIntToViewNumber",
    requiredFields = DEFAULT_REQUIRED_BIGINT_FIELDS,
    missingRequiredFieldSeverity = "warning",
  } = params

  const warnings: string[] = []
  const errors: string[] = []
  const effectiveRequiredFields: RequiredFieldNames<RobustBigIntFormattingInput> =
    params.requiredFields == null && input?.bigIntValue == null
      ? []
      : requiredFields

  const hasMissingRequiredField = reportMissingRequiredFields(
    input,
    effectiveRequiredFields,
    warnings,
    errors,
    missingRequiredFieldSeverity,
  )

  if (hasMissingRequiredField) {
    return finalizeRobustFormattingResult<FormatBigIntToViewNumberValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  const normalizedBigIntValue = normalizeBigIntValue(input?.bigIntValue, warnings, errors)
  const normalizedSymbol = normalizeSymbol(input?.symbol, errors)
  const normalizedDecimals = normalizeDecimals(input?.decimals, warnings, errors)

  if (errors.length > 0) {
    return finalizeRobustFormattingResult<FormatBigIntToViewNumberValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  if (normalizedBigIntValue === undefined || normalizedDecimals === undefined) {
    return finalizeRobustFormattingResult<FormatBigIntToViewNumberValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  try {
    const value = formatBigIntToViewNumber(
      normalizedBigIntValue,
      normalizedDecimals,
      normalizedSymbol,
      options,
    )

    return finalizeRobustFormattingResult(context, value, warnings, errors)
  } catch (error) {
    errors.push(`formatBigIntToViewNumber threw: ${toErrorMessage(error)}.`)

    return finalizeRobustFormattingResult<FormatBigIntToViewNumberValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }
}
