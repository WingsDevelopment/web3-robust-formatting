import { formatPercentToViewPercent } from "../formatting-functions/numberToViewPercentage.js"
import {
  type RobustFormattingBaseOptions,
  type RobustFormattingResult,
  type RobustPercentFormattingInput,
  finalizeRobustFormattingResult,
  normalizeNumberValue,
  reportMissingRequiredFields,
  toErrorMessage,
} from "./robust-formatting.js"

type FormatPercentToViewPercentOptions =
  Parameters<typeof formatPercentToViewPercent>[1]
type FormatPercentToViewPercentValue = ReturnType<typeof formatPercentToViewPercent>

export interface RobustFormatPercentToViewPercentOptions
  extends RobustFormattingBaseOptions {
  input?: RobustPercentFormattingInput
  options?: FormatPercentToViewPercentOptions
}

export function robustFormatPercentToViewPercent({
  input,
  options,
  context = "robustFormatPercentToViewPercent",
  requiredFields,
  missingRequiredFieldSeverity = "warning",
}: RobustFormatPercentToViewPercentOptions = {}): RobustFormattingResult<FormatPercentToViewPercentValue> {
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
    return finalizeRobustFormattingResult<FormatPercentToViewPercentValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  const normalizedValue = normalizeNumberValue(input?.value, warnings, errors)

  if (errors.length > 0) {
    return finalizeRobustFormattingResult<FormatPercentToViewPercentValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  if (normalizedValue === undefined) {
    return finalizeRobustFormattingResult<FormatPercentToViewPercentValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  try {
    const value = formatPercentToViewPercent(normalizedValue, options)

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
