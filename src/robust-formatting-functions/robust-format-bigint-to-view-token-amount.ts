import { formatBigIntToViewTokenAmount } from "../formatting-functions/bigIntToViewTokenAmount.js"
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

type FormatBigIntToViewTokenAmountConfig =
  Parameters<typeof formatBigIntToViewTokenAmount>[1]
type FormatBigIntToViewTokenAmountValue =
  ReturnType<typeof formatBigIntToViewTokenAmount>

export interface RobustFormatBigIntToViewTokenAmountOptions
  extends RobustFormattingBaseOptions {
  input?: RobustBigIntFormattingInput
  config?: FormatBigIntToViewTokenAmountConfig
}

export function robustFormatBigIntToViewTokenAmount({
  input,
  config,
  context = "robustFormatBigIntToViewTokenAmount",
  requiredFields,
  missingRequiredFieldSeverity = "warning",
}: RobustFormatBigIntToViewTokenAmountOptions = {}): RobustFormattingResult<FormatBigIntToViewTokenAmountValue> {
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
    return finalizeRobustFormattingResult<FormatBigIntToViewTokenAmountValue>(
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
    return finalizeRobustFormattingResult<FormatBigIntToViewTokenAmountValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  try {
    const value = formatBigIntToViewTokenAmount(
      {
        bigIntValue: normalizedBigIntValue,
        symbol: normalizedSymbol,
        decimals: normalizedDecimals,
      },
      config,
    )

    return finalizeRobustFormattingResult(context, value, warnings, errors)
  } catch (error) {
    errors.push(
      `formatBigIntToViewTokenAmount threw: ${toErrorMessage(error)}.`,
    )

    return finalizeRobustFormattingResult<FormatBigIntToViewTokenAmountValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }
}
