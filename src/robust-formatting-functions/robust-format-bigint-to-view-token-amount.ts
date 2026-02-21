import { formatBigIntToViewTokenAmount } from "../formatting-functions/bigIntToViewTokenAmount.js"
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

type FormatBigIntToViewTokenAmountConfig =
  Parameters<typeof formatBigIntToViewTokenAmount>[1]
type FormatBigIntToViewTokenAmountValue =
  ReturnType<typeof formatBigIntToViewTokenAmount>
const DEFAULT_REQUIRED_BIGINT_FIELDS = ["decimals"] as const

/**
 * Runtime-safe wrapper options for {@link robustFormatBigIntToViewTokenAmount}.
 *
 * `requiredFields` is key-typed against `input`.
 * Default behavior requires `decimals` when `bigIntValue` is present.
 */
export interface RobustFormatBigIntToViewTokenAmountOptions
  extends RobustFormattingBaseOptions {
  input?: RobustBigIntFormattingInput
  config?: FormatBigIntToViewTokenAmountConfig
  requiredFields?: RequiredFieldNames<RobustBigIntFormattingInput>
}

/**
 * Robustly normalizes bigint-like token amount input and formats it via
 * {@link formatBigIntToViewTokenAmount}.
 *
 * Behavior:
 * - `requiredFields` defaults to `["decimals"]`
 * - if `input.bigIntValue == null`, the default requirement is removed
 * - caller can override with explicit `requiredFields`
 */
export function robustFormatBigIntToViewTokenAmount(
  params: RobustFormatBigIntToViewTokenAmountOptions = {},
): RobustFormattingResult<FormatBigIntToViewTokenAmountValue> {
  const {
    input,
    config,
    context = "robustFormatBigIntToViewTokenAmount",
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
