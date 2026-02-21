export interface RobustFormattingResult<T> {
  value: T | undefined
  warnings: string[]
  errors: string[]
}

export interface RobustDisplayValue<T> {
  value?: T
  warnings?: string[]
  errors?: string[]
}

export type MissingRequiredFieldSeverity = "warning" | "error"

export type RequiredFieldNames<TInput> = ReadonlyArray<Extract<keyof TInput, string>>

export interface RobustFormattingBaseOptions {
  context?: string
  missingRequiredFieldSeverity?: MissingRequiredFieldSeverity
}

export interface RobustBigIntFormattingInput {
  bigIntValue?: unknown
  symbol?: unknown
  decimals?: unknown
}

export interface RobustNumberFormattingInput {
  value?: unknown
  symbol?: unknown
}

export interface RobustPercentFormattingInput {
  value?: unknown
}

export function resolveRuntimeType(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function reportRobustFormattingDiagnostics(
  context: string,
  warnings: string[],
  errors: string[],
): void {
  for (const warning of warnings) {
    console.error(`[${context}] ${warning}`, { severity: "warning" })
  }

  for (const error of errors) {
    console.error(`[${context}] ${error}`, { severity: "error" })
  }
}

export function finalizeRobustFormattingResult<T>(
  context: string,
  value: T | undefined,
  warnings: string[],
  errors: string[],
): RobustFormattingResult<T> {
  if (warnings.length > 0 || errors.length > 0) {
    reportRobustFormattingDiagnostics(context, warnings, errors)
  }

  return {
    value,
    warnings,
    errors,
  }
}

export function buildRobustDiagnosticsMessage({
  warnings,
  errors,
}: {
  warnings?: string[]
  errors?: string[]
}): string | undefined {
  const uniqueErrors = Array.from(
    new Set(
      (errors ?? [])
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    ),
  )
  const uniqueWarnings = Array.from(
    new Set(
      (warnings ?? [])
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    ),
  )

  const lines: string[] = []

  if (uniqueErrors.length > 0) {
    lines.push("Errors:")
    lines.push(...uniqueErrors.map((line) => `- ${line}`))
  }

  if (uniqueWarnings.length > 0) {
    lines.push("Warnings:")
    lines.push(...uniqueWarnings.map((line) => `- ${line}`))
  }

  if (lines.length === 0) {
    return undefined
  }

  return lines.join("\n")
}

export function mergeRobustDiagnostics(
  ...results: Array<
    | Pick<RobustFormattingResult<unknown>, "warnings" | "errors">
    | undefined
  >
): { warnings: string[]; errors: string[] } {
  const warnings = Array.from(
    new Set(results.flatMap((result) => result?.warnings ?? [])),
  )
  const errors = Array.from(
    new Set(results.flatMap((result) => result?.errors ?? [])),
  )

  return { warnings, errors }
}

export function mapRobustFormattingToDisplayValue<T>(
  result: RobustFormattingResult<T>,
): RobustDisplayValue<T> {
  return {
    value: result.value,
    warnings: result.warnings,
    errors: result.errors,
  }
}

export function reportMissingRequiredFields<TInput extends object>(
  input: TInput | undefined,
  requiredFields: RequiredFieldNames<TInput> | undefined,
  warnings: string[],
  errors: string[],
  severity: MissingRequiredFieldSeverity = "warning",
): boolean {
  if (!requiredFields?.length) {
    return false
  }

  let hasMissingRequiredField = false
  const recordInput = input as Record<string, unknown> | undefined

  for (const fieldName of requiredFields) {
    const value = recordInput?.[fieldName]
    if (value !== undefined && value !== null) {
      continue
    }

    hasMissingRequiredField = true
    const missingAs = value === null ? "null" : "undefined"
    const message = `${fieldName} is required but received ${missingAs}.`

    if (severity === "error") {
      errors.push(message)
    } else {
      warnings.push(message)
    }
  }

  return hasMissingRequiredField
}

export function normalizeBigIntValue(
  value: unknown,
  warnings: string[],
  errors: string[],
): bigint | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value === "bigint") {
    return value
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      errors.push(
        `bigIntValue has invalid number type "${value}"; expected integer bigint-like value.`,
      )
      return undefined
    }

    warnings.push(
      "bigIntValue came as number and was automatically converted to bigint.",
    )
    return BigInt(value)
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim()
    if (!trimmedValue || !/^-?\d+$/.test(trimmedValue)) {
      errors.push(
        `bigIntValue string "${value}" is not a valid bigint-like integer string.`,
      )
      return undefined
    }

    try {
      warnings.push(
        "bigIntValue came as string and was automatically converted to bigint.",
      )
      return BigInt(trimmedValue)
    } catch {
      errors.push(`bigIntValue string "${value}" could not be converted to bigint.`)
      return undefined
    }
  }

  errors.push(
    `bigIntValue has unsupported runtime type "${resolveRuntimeType(value)}".`,
  )
  return undefined
}

export function normalizeSymbol(
  symbol: unknown,
  errors: string[],
): string | undefined {
  if (symbol === undefined || symbol === null) {
    return undefined
  }

  if (typeof symbol === "string") {
    return symbol
  }

  errors.push(
    `symbol has unsupported runtime type "${resolveRuntimeType(symbol)}"; expected string.`,
  )
  return undefined
}

export function normalizeDecimals(
  decimals: unknown,
  warnings: string[],
  errors: string[],
): number | undefined {
  if (decimals === undefined || decimals === null) {
    return undefined
  }

  if (typeof decimals === "number") {
    if (
      !Number.isFinite(decimals) ||
      !Number.isSafeInteger(decimals) ||
      decimals < 0
    ) {
      errors.push(
        `decimals number "${decimals}" is invalid; expected non-negative safe integer.`,
      )
      return undefined
    }

    return decimals
  }

  if (typeof decimals === "bigint") {
    if (decimals < BigInt(0) || decimals > BigInt(Number.MAX_SAFE_INTEGER)) {
      errors.push(
        `decimals bigint "${decimals.toString()}" is outside non-negative safe integer range.`,
      )
      return undefined
    }

    warnings.push("decimals came as bigint and was automatically converted to number.")
    return Number(decimals)
  }

  if (typeof decimals === "string") {
    const trimmedValue = decimals.trim()
    if (!trimmedValue || !/^\d+$/.test(trimmedValue)) {
      errors.push(
        `decimals string "${decimals}" is invalid; expected non-negative integer string.`,
      )
      return undefined
    }

    const parsedValue = Number(trimmedValue)
    if (!Number.isSafeInteger(parsedValue)) {
      errors.push(
        `decimals string "${decimals}" exceeds safe integer number range.`,
      )
      return undefined
    }

    warnings.push("decimals came as string and was automatically converted to number.")
    return parsedValue
  }

  errors.push(
    `decimals has unsupported runtime type "${resolveRuntimeType(decimals)}".`,
  )
  return undefined
}

export function normalizeNumberValue(
  value: unknown,
  warnings: string[],
  errors: string[],
): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      errors.push(`value number "${value}" is not finite.`)
      return undefined
    }

    return value
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      errors.push("value string is empty and cannot be converted to number.")
      return undefined
    }

    const parsedValue = Number(trimmedValue)
    if (!Number.isFinite(parsedValue)) {
      errors.push(
        `value string "${value}" is not a finite numeric representation.`,
      )
      return undefined
    }

    warnings.push("value came as string and was automatically converted to number.")
    return parsedValue
  }

  if (typeof value === "bigint") {
    if (
      value < BigInt(Number.MIN_SAFE_INTEGER) ||
      value > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      errors.push(
        `value bigint "${value.toString()}" exceeds safe number range and cannot be converted.`,
      )
      return undefined
    }

    warnings.push("value came as bigint and was automatically converted to number.")
    return Number(value)
  }

  errors.push(
    `value has unsupported runtime type "${resolveRuntimeType(value)}"; expected number-like input.`,
  )
  return undefined
}
