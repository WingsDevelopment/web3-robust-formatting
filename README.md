# web3-robust-formatting

Formatting helpers for **token amounts, USD values, percentages, and robust runtime-safe formatting** in TypeScript/JavaScript projects.

- **Core formatting functions** for bigint, number, token amount, and percent display
- **Robust wrappers** with runtime normalization (`unknown` inputs), warnings, and errors
- **Consistent display semantics**: compact values, min/max sentinel flags, sign handling
- **Web3-ready**: built on `viem` for base-unit conversions and parsing
- **Pipeline friendly**: calculate token value safely, then format with diagnostics
- **Strong rendering recommendation**: pair with [`web3-display-components`](https://www.npmjs.com/package/web3-display-components) for UI output

---

## Table of Contents

- [Installation](#installation)
- [See It In Action](#see-it-in-action)
- [Strong Rendering Recommendation](#strong-rendering-recommendation)
- [Why This Library](#why-this-library)
- [Quick Start](#quick-start)
- [Examples](#examples)
- [Formatting Functions](#formatting-functions)
  - [formatBigIntToViewTokenAmount](#formatbiginttoviewtokenamount)
  - [formatBigIntToViewNumber](#formatbiginttoviewnumber)
  - [formatNumberToViewNumber](#formatnumbertoviewnumber)
  - [formatPercentToViewPercent](#formatpercenttoviewpercent)
- [Robust Formatting Functions](#robust-formatting-functions)
  - [robustFormatBigIntToViewTokenAmount](#robustformatbiginttoviewtokenamount)
  - [robustFormatBigIntToViewNumber](#robustformatbiginttoviewnumber)
  - [robustFormatNumberToViewNumber](#robustformatnumbertoviewnumber)
  - [robustFormatPercentToViewPercent](#robustformatpercenttoviewpercent)
  - [robustCalculateTokenValue](#robustcalculatetokenvalue)
- [Diagnostics Helpers](#diagnostics-helpers)
- [Formatting Behavior Notes](#formatting-behavior-notes)
- [API Exports](#api-exports)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
npm install web3-robust-formatting
```

Peer dependencies:

```json
{
  "peerDependencies": {
    "viem": "^2.0.0"
  }
}
```

---

## See It In Action

- Mock vaults page: https://react-clean-code-tutorials.vercel.app/mock-vaults
- Storybook docs: https://react-clean-code-tutorials.vercel.app/storybook/index.html?path=/docs/display-components-token-value-field--docs

---

## Strong Rendering Recommendation

This package focuses on formatting and robust runtime diagnostics.  
For actual UI rendering, use **[`web3-display-components`](https://www.npmjs.com/package/web3-display-components)** as the primary companion library.

Why this pairing is strongly recommended:

- formatter outputs from this package (`viewValue`, `symbol`, `sign`, `belowMin`, `aboveMax`) map directly to display concerns
- keeps formatting logic and rendering logic separated cleanly
- gives you consistent UI behavior for loading/error/sentinel display patterns

Example integration pattern:

```tsx
import {
  formatBigIntToViewTokenAmount,
  formatPercentToViewPercent,
} from "web3-robust-formatting"
import {
  DisplayTokenAmount,
  DisplayPercentage,
} from "web3-display-components"

const amount = formatBigIntToViewTokenAmount({
  bigIntValue: 1234567n,
  decimals: 6,
  symbol: "USDC",
})

const apy = formatPercentToViewPercent(0.125)

// Use formatter outputs as renderer inputs
;<DisplayTokenAmount {...amount} />
;<DisplayPercentage {...apy} />
```

---

## Why This Library

Formatting in web3/finance UIs gets messy quickly:

- base-unit bigints with varying decimals
- tiny value floors (`<`) and upper caps (`>`)
- compact vs grouped display rules
- ratio-to-percent conversion
- unknown API payloads that need runtime validation

This package keeps those concerns in one place and gives you both:

1. deterministic formatting primitives
2. robust wrappers that never throw into your UI pipeline

---

## Quick Start

```ts
import {
  formatBigIntToViewTokenAmount,
  robustCalculateTokenValue,
  robustFormatBigIntToViewNumber,
  mergeRobustDiagnostics,
} from "web3-robust-formatting"

// 1) Format raw token amount (base units)
const tokenAmount = formatBigIntToViewTokenAmount(
  { bigIntValue: 1234567890000000000n, decimals: 18, symbol: "ETH" },
  { twoDigitDecimals: 4, compactDecimals: 2 }
)

// 2) Robustly calculate token value from potentially untrusted runtime input
const calc = robustCalculateTokenValue({
  input: {
    tokenAmount: "1234567890000000000",
    tokenDecimals: "18",
    tokenPrice: "2450.5",
    tokenPriceDecimals: 8,
  },
})

// 3) Robustly format calculated token value (if available)
const formattedValue = robustFormatBigIntToViewNumber({
  input: {
    bigIntValue: calc.value?.tokenValueRaw,
    decimals: calc.value?.tokenValueDecimals,
    symbol: "$",
  },
})

// 4) Merge diagnostics from multiple steps
const diagnostics = mergeRobustDiagnostics(calc, formattedValue)
```

---

## Examples

### Example 1 — Format token amount

```ts
import { formatBigIntToViewTokenAmount } from "web3-robust-formatting"

const out = formatBigIntToViewTokenAmount(
  { bigIntValue: 987654321n, decimals: 6, symbol: "USDC" },
  { twoDigitDecimals: 2 }
)

// out.viewValue   -> "987.65"
// out.compact     -> "987.65"
// out.symbol      -> "USDC"
// out.belowMin    -> false
// out.aboveMax    -> false
```

### Example 2 — Tiny values with floor

```ts
const tiny = formatBigIntToViewTokenAmount(
  { bigIntValue: 5n, decimals: 9, symbol: "ABC" },
  { minDisplay: 0.000001, singleDigitDecimals: 6 }
)

// tiny.viewValue  -> "0.000001"
// tiny.belowMin   -> true
// UI can prepend "<" when belowMin === true
```

### Example 3 — Format bigint USD-like value

```ts
import { formatBigIntToViewNumber } from "web3-robust-formatting"

const price = formatBigIntToViewNumber(123_456_789n, 8, "$")

// price.viewValue -> "1.23"
// price.compact   -> "1.23"
// price.decimals  -> 8
```

### Example 4 — Format plain number with max cap flag

```ts
import { formatNumberToViewNumber } from "web3-robust-formatting"

const out = formatNumberToViewNumber(12345.678, "$", {
  standardDecimals: 2,
  maxDisplay: 10000,
})

// out.viewValue -> "10,000.00"
// out.aboveMax  -> true
```

### Example 5 — Format percent from ratio

```ts
import { formatPercentToViewPercent } from "web3-robust-formatting"

const p = formatPercentToViewPercent(0.0954)

// p.viewValue -> "9.54"
// p.symbol    -> "%"
// p.compact   -> "9.54"
```

### Example 6 — Robust wrapper with unknown input

```ts
import { robustFormatBigIntToViewTokenAmount } from "web3-robust-formatting"

const res = robustFormatBigIntToViewTokenAmount({
  input: {
    bigIntValue: "1234567",
    decimals: "6",
    symbol: "USDC",
  },
})

// res.value     -> formatted object | undefined
// res.warnings  -> conversion warnings (if any)
// res.errors    -> validation/runtime errors (if any)
```

### Example 7 — Strict required fields (typed keys) with error severity

```ts
import { robustFormatNumberToViewNumber } from "web3-robust-formatting"

const res = robustFormatNumberToViewNumber({
  input: { value: null, symbol: "$" },
  requiredFields: ["value"] as const,
  missingRequiredFieldSeverity: "error",
})

// res.value    -> undefined
// res.errors   -> ["value is required but received null."]
```

### Example 8 — Percent scaling with multiplier/divider

```ts
import { robustFormatPercentToViewPercent } from "web3-robust-formatting"

const res = robustFormatPercentToViewPercent({
  input: { value: 25 }, // basis points-like input
  multiplier: 1,
  divider: 100, // 25 / 100 => 0.25 ratio
})

// res.value?.viewValue -> "25.00"
// res.value?.symbol    -> "%"
```

---

## Formatting Functions

All formatters keep symbols separate from numeric strings.

### formatBigIntToViewTokenAmount

```ts
formatBigIntToViewTokenAmount(
  data?: {
    bigIntValue?: bigint | string | number | null
    symbol?: string | null
    decimals?: number | null
  },
  config?: {
    locale?: string
    decimals?: number
    placeholder?: string
    singleDigitDecimals?: number
    twoDigitDecimals?: number
    compactDecimals?: number
    minDisplay?: number
    maxDisplay?: number
  }
)
```

Returns a `ViewBigInt` with:

- `viewValue`, `compact`, `originalValue`
- `belowMin`, `aboveMax`, `sign`
- passthrough metadata: `symbol`, `decimals`, `bigIntValue`

If `bigIntValue` or `decimals` is missing, the function returns `undefined`.

### formatBigIntToViewNumber

```ts
formatBigIntToViewNumber(
  input: bigint | string,
  decimals: number | undefined,
  symbol = "$",
  opts?: FormatPriceNewOptions
)
```

Uses `formatUnits` + `formatNumberToViewNumber` and returns number-display output plus `decimals`.

### formatNumberToViewNumber

```ts
formatNumberToViewNumber(
  input?: number | string | null,
  symbol = "$",
  opts?: {
    locale?: string
    standardDecimals?: number
    compactDecimals?: number
    compactThreshold?: number
    minDisplay?: number
    maxDisplay?: number
  }
)
```

Returns `viewValue`, `compact`, `belowMin`, `aboveMax`, `sign`, original value fields.

### formatPercentToViewPercent

```ts
formatPercentToViewPercent(
  input?: number | string | null,
  opts?: {
    locale?: string
    standardDecimals?: number
    compactDecimals?: number
    compactThreshold?: number
    minDisplay?: number
    maxDisplay?: number
  }
)
```

Input is a **ratio** (for example `0.125`), output is in **percent units** (`12.5`).

---

## Robust Formatting Functions

Each robust function returns:

```ts
{
  value: T | undefined
  warnings: string[]
  errors: string[]
}
```

If warnings/errors exist, diagnostics are logged via `console.error` with context.

### robustFormatBigIntToViewTokenAmount

```ts
robustFormatBigIntToViewTokenAmount({
  input,
  config,
  context,
  requiredFields,
  missingRequiredFieldSeverity,
})
```

`requiredFields` is typed as keys of `input` (for example `("bigIntValue" | "decimals" | "symbol")[]`).
Also: default `requiredFields` includes `["decimals"]`, but that default is skipped when `input.bigIntValue == null`.
You can override this by passing `requiredFields` explicitly (for example `[]`).

### robustFormatBigIntToViewNumber

```ts
robustFormatBigIntToViewNumber({
  input,
  options,
  context,
  requiredFields,
  missingRequiredFieldSeverity,
})
```

`requiredFields` is typed as keys of `input`.
Also: default `requiredFields` includes `["decimals"]`, but that default is skipped when `input.bigIntValue == null`.
You can override this by passing `requiredFields` explicitly (for example `[]`).

### robustFormatNumberToViewNumber

```ts
robustFormatNumberToViewNumber({
  input,
  options,
  context,
  requiredFields,
  missingRequiredFieldSeverity,
})
```

`requiredFields` is typed as keys of `input` (for example `("value" | "symbol")[]`).

### robustFormatPercentToViewPercent

```ts
robustFormatPercentToViewPercent({
  input,
  options,
  multiplier,
  divider,
  context,
  requiredFields,
  missingRequiredFieldSeverity,
})
```

`requiredFields` is typed as keys of `input` (for example `("value")[]`).
`multiplier` and `divider` are applied before calling `formatPercentToViewPercent`:

```ts
scaledValue = (value * multiplier) / divider
```

### robustCalculateTokenValue

```ts
robustCalculateTokenValue({
  input: {
    tokenAmount?: unknown
    tokenPrice?: unknown
    tokenDecimals?: unknown
    tokenPriceDecimals?: unknown
  },
  context,
  missingRequiredFieldSeverity,
})
```

All four input fields above are always required for calculation.

On success, `value` is:

```ts
{
  tokenValueRaw: bigint
  tokenValueDecimals: number
}
```

Use this as an intermediate safe step before `robustFormatBigIntToViewNumber`.

---

## Diagnostics Helpers

Exported helpers in `robust-formatting-functions`:

- `buildRobustDiagnosticsMessage` — build multiline diagnostics text from warnings/errors
- `mergeRobustDiagnostics` — deduplicate warnings/errors across multiple robust results
- `mapRobustFormattingToDisplayValue` — map robust result to `{ value?, warnings?, errors? }`
- `reportMissingRequiredFields` — runtime required-field validation using typed input keys
- `normalizeBigIntValue`, `normalizeDecimals`, `normalizeNumberValue`, `normalizeSymbol`
- `resolveRuntimeType`, `toErrorMessage`, `finalizeRobustFormattingResult`

---

## Formatting Behavior Notes

- `viewValue` and `compact` are numeric strings without automatic symbol concatenation.
- `belowMin` and `aboveMax` are display flags; you choose how to render sentinels (`<`, `>`).
- `sign` is separated so consumers can control symbol/sign ordering.
- For non-finite input, functions return original input text in `viewValue`/`compact` where applicable.
- Percent formatter expects **ratio input**, not already scaled percent.

---

## API Exports

```ts
// Root
export * from "./formatting-functions/index.js"
export * from "./robust-formatting-functions/index.js"

// Formatting
export * from "./formatting-functions/bigIntToViewNumber.js"
export * from "./formatting-functions/bigIntToViewTokenAmount.js"
export * from "./formatting-functions/numberToViewNumber.js"
export * from "./formatting-functions/numberToViewPercentage.js"

// Robust
export * from "./robust-formatting-functions/robust-formatting.js"
export * from "./robust-formatting-functions/robust-calculate-token-value.js"
export * from "./robust-formatting-functions/robust-format-bigint-to-view-number.js"
export * from "./robust-formatting-functions/robust-format-bigint-to-view-token-amount.js"
export * from "./robust-formatting-functions/robust-format-number-to-view-number.js"
export * from "./robust-formatting-functions/robust-format-percent-to-view-percent.js"
```

---

## Contributing

PRs and issues are welcome.

Guidelines:

- keep formatting deterministic and locale-explicit
- avoid mixing symbols into numeric strings
- keep robust wrappers non-throwing and diagnostics-rich
- preserve type safety while handling runtime `unknown` payloads

---

## License

MIT
