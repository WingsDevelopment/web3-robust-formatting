import { formatNumberToViewNumber } from "../formatting-functions/numberToViewNumber.js"
import {
  type RobustFormattingBaseOptions,
  type RobustFormattingResult,
  type RobustNumberFormattingInput,
  finalizeRobustFormattingResult,
  normalizeNumberValue,
  normalizeSymbol,
  reportMissingRequiredFields,
  toErrorMessage,
} from "./robust-formatting.js"

type FormatNumberToViewNumberOptions = Parameters<typeof formatNumberToViewNumber>[2]
type FormatNumberToViewNumberValue = ReturnType<typeof formatNumberToViewNumber>

export interface RobustFormatNumberToViewNumberOptions
  extends RobustFormattingBaseOptions {
  input?: RobustNumberFormattingInput
  options?: FormatNumberToViewNumberOptions
}

export function robustFormatNumberToViewNumber({
  input,
  options,
  context = "robustFormatNumberToViewNumber",
  requiredFields,
  missingRequiredFieldSeverity = "warning",
}: RobustFormatNumberToViewNumberOptions = {}): RobustFormattingResult<FormatNumberToViewNumberValue> {
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
    return finalizeRobustFormattingResult<FormatNumberToViewNumberValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  const normalizedValue = normalizeNumberValue(input?.value, warnings, errors)
  const normalizedSymbol = normalizeSymbol(input?.symbol, errors)

  if (errors.length > 0) {
    return finalizeRobustFormattingResult<FormatNumberToViewNumberValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  if (normalizedValue === undefined) {
    return finalizeRobustFormattingResult<FormatNumberToViewNumberValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  try {
    const value = formatNumberToViewNumber(
      normalizedValue,
      normalizedSymbol,
      options,
    )

    return finalizeRobustFormattingResult(context, value, warnings, errors)
  } catch (error) {
    errors.push(`formatNumberToViewNumber threw: ${toErrorMessage(error)}.`)

    return finalizeRobustFormattingResult<FormatNumberToViewNumberValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }
}
