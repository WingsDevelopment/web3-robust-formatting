import { formatBigIntToViewNumber } from "../formatting-functions/bigIntToViewNumber.js"
import {
  type RobustBigIntFormattingInput,
  type RobustFormattingBaseOptions,
  type RobustFormattingResult,
  finalizeRobustFormattingResult,
  normalizeBigIntValue,
  normalizeDecimals,
  normalizeSymbol,
  reportMissingRequiredFields,
  toErrorMessage,
} from "./robust-formatting.js"

type FormatBigIntToViewNumberOptions =
  Parameters<typeof formatBigIntToViewNumber>[3]
type FormatBigIntToViewNumberValue = ReturnType<typeof formatBigIntToViewNumber>

export interface RobustFormatBigIntToViewNumberOptions
  extends RobustFormattingBaseOptions {
  input?: RobustBigIntFormattingInput
  options?: FormatBigIntToViewNumberOptions
}

export function robustFormatBigIntToViewNumber({
  input,
  options,
  context = "robustFormatBigIntToViewNumber",
  requiredFields,
  missingRequiredFieldSeverity = "warning",
}: RobustFormatBigIntToViewNumberOptions = {}): RobustFormattingResult<FormatBigIntToViewNumberValue> {
  const warnings: string[] = []
  const errors: string[] = []

  const hasMissingRequiredField = reportMissingRequiredFields(
    input as Record<string, unknown> | undefined,
    requiredFields,
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

  const normalizedBigIntValue = normalizeBigIntValue(
    input?.bigIntValue,
    warnings,
    errors,
  )
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
