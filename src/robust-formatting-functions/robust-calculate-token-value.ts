import { parseUnits } from "viem"
import {
  type RobustFormattingBaseOptions,
  type RobustFormattingResult,
  finalizeRobustFormattingResult,
  normalizeBigIntValue,
  normalizeDecimals,
  reportMissingRequiredFields,
  resolveRuntimeType,
  toErrorMessage,
} from "./robust-formatting.js"

export interface RobustCalculateTokenValueInput {
  tokenAmount?: unknown
  tokenPrice?: unknown
  tokenDecimals?: unknown
  tokenPriceDecimals?: unknown
}

export interface RobustCalculatedTokenValue {
  tokenValueRaw: bigint
  tokenValueDecimals: number
}

/**
 * Runtime-safe wrapper options for {@link robustCalculateTokenValue}.
 *
 * All `input` fields are required for successful calculation:
 * `tokenAmount`, `tokenPrice`, `tokenDecimals`, `tokenPriceDecimals`.
 */
export interface RobustCalculateTokenValueOptions
  extends RobustFormattingBaseOptions {
  input?: RobustCalculateTokenValueInput
}

const REQUIRED_CALCULATE_TOKEN_VALUE_FIELDS = [
  "tokenAmount",
  "tokenPrice",
  "tokenDecimals",
  "tokenPriceDecimals",
] as const

function normalizeTokenPriceToScaledBigInt(
  tokenPrice: unknown,
  tokenPriceDecimals: number | undefined,
  warnings: string[],
  errors: string[],
): bigint | undefined {
  if (tokenPrice === undefined || tokenPrice === null) {
    return undefined
  }

  if (typeof tokenPrice === "bigint") {
    return tokenPrice
  }

  if (tokenPriceDecimals === undefined) {
    errors.push(
      "tokenPriceDecimals is required to parse non-bigint tokenPrice values.",
    )
    return undefined
  }

  if (typeof tokenPrice === "number") {
    if (!Number.isFinite(tokenPrice)) {
      errors.push(`tokenPrice number "${tokenPrice}" is not finite.`)
      return undefined
    }

    if (tokenPrice < 0) {
      errors.push(`tokenPrice number "${tokenPrice}" cannot be negative.`)
      return undefined
    }

    try {
      return parseUnits(String(tokenPrice), tokenPriceDecimals)
    } catch (error) {
      errors.push(`tokenPrice number could not be parsed: ${toErrorMessage(error)}.`)
      return undefined
    }
  }

  if (typeof tokenPrice === "string") {
    const trimmedValue = tokenPrice.trim()
    if (!trimmedValue) {
      errors.push("tokenPrice string is empty and cannot be parsed.")
      return undefined
    }

    warnings.push(
      "tokenPrice came as string and was parsed into scaled bigint price value.",
    )

    try {
      const parsedPrice = parseUnits(trimmedValue, tokenPriceDecimals)
      if (parsedPrice < BigInt(0)) {
        errors.push(`tokenPrice string "${tokenPrice}" cannot be negative.`)
        return undefined
      }
      return parsedPrice
    } catch (error) {
      errors.push(`tokenPrice string "${tokenPrice}" is invalid: ${toErrorMessage(error)}.`)
      return undefined
    }
  }

  errors.push(
    `tokenPrice has unsupported runtime type "${resolveRuntimeType(tokenPrice)}".`,
  )
  return undefined
}

/**
 * Robustly computes token value from amount/price/decimals.
 *
 * Formula:
 * `tokenValueRaw = (tokenAmount * tokenPriceScaled) / 10^tokenDecimals`
 *
 * Output decimals are always `tokenPriceDecimals`.
 * This wrapper never throws and returns diagnostics in `warnings` / `errors`.
 */
export function robustCalculateTokenValue({
  input,
  context = "robustCalculateTokenValue",
  missingRequiredFieldSeverity = "warning",
}: RobustCalculateTokenValueOptions = {}): RobustFormattingResult<RobustCalculatedTokenValue> {
  const warnings: string[] = []
  const errors: string[] = []

  const hasMissingRequiredField = reportMissingRequiredFields(
    input,
    REQUIRED_CALCULATE_TOKEN_VALUE_FIELDS,
    warnings,
    errors,
    missingRequiredFieldSeverity,
  )

  if (hasMissingRequiredField) {
    return finalizeRobustFormattingResult<RobustCalculatedTokenValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  const normalizedTokenAmount = normalizeBigIntValue(
    input?.tokenAmount,
    warnings,
    errors,
  )
  const normalizedTokenDecimals = normalizeDecimals(
    input?.tokenDecimals,
    warnings,
    errors,
  )
  const normalizedTokenPriceDecimals = normalizeDecimals(
    input?.tokenPriceDecimals,
    warnings,
    errors,
  )
  const normalizedTokenPrice = normalizeTokenPriceToScaledBigInt(
    input?.tokenPrice,
    normalizedTokenPriceDecimals,
    warnings,
    errors,
  )

  if (normalizedTokenAmount !== undefined && normalizedTokenAmount < BigInt(0)) {
    errors.push("tokenAmount cannot be negative.")
  }

  if (normalizedTokenPrice !== undefined && normalizedTokenPrice < BigInt(0)) {
    errors.push("tokenPrice cannot be negative.")
  }

  if (errors.length > 0) {
    return finalizeRobustFormattingResult<RobustCalculatedTokenValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  if (
    normalizedTokenAmount === undefined ||
    normalizedTokenPrice === undefined ||
    normalizedTokenDecimals === undefined ||
    normalizedTokenPriceDecimals === undefined
  ) {
    return finalizeRobustFormattingResult<RobustCalculatedTokenValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }

  try {
    const divider = BigInt(10) ** BigInt(normalizedTokenDecimals)
    const tokenValueRaw = (normalizedTokenAmount * normalizedTokenPrice) / divider

    return finalizeRobustFormattingResult(
      context,
      {
        tokenValueRaw,
        tokenValueDecimals: normalizedTokenPriceDecimals,
      },
      warnings,
      errors,
    )
  } catch (error) {
    errors.push(`token value calculation failed: ${toErrorMessage(error)}.`)

    return finalizeRobustFormattingResult<RobustCalculatedTokenValue>(
      context,
      undefined,
      warnings,
      errors,
    )
  }
}
