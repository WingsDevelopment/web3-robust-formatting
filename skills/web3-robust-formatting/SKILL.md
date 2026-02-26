# web3-robust-formatting

Use this skill when integrating or refactoring code that formats token amounts, token values, numbers, or percentages with runtime-safe diagnostics.

## Scope

This skill is for projects using `web3-robust-formatting` as the formatting/normalization layer.
Pair with `web3-display-components` for rendering.

## Install

```bash
npm install web3-robust-formatting
```

Recommended renderer pairing:

```bash
npm install web3-display-components
```

## What the library guarantees

Every robust wrapper returns:

```ts
{
  value: T | undefined
  warnings: string[]
  errors: string[]
}
```

Robust wrappers do not throw into UI flows. They normalize unknown input and report diagnostics.

## Function selection

- `robustFormatBigIntToViewTokenAmount`
  - Use for token amount display formatting from base units.
- `robustFormatBigIntToViewNumber`
  - Use for bigint base-unit values that represent fiat/value-like display.
- `robustFormatNumberToViewNumber`
  - Use for plain number-like inputs.
- `robustFormatPercentToViewPercent`
  - Use for ratios/percent values, including optional scaling via `multiplier` and `divider`.
- `robustCalculateTokenValue`
  - Use for safe token value calculation (`tokenAmount * tokenPrice`) before formatting.

## Required fields behavior

### Key-typed required fields

`requiredFields` is key-typed to each wrapper's `input` shape.

Examples:

- `robustFormatNumberToViewNumber`: `("value" | "symbol")[]`
- `robustFormatBigIntToViewNumber`: `("bigIntValue" | "decimals" | "symbol")[]`

### Bigint wrappers default policy

For bigint wrappers (`robustFormatBigIntToViewNumber`, `robustFormatBigIntToViewTokenAmount`):

- Default function arg is `requiredFields = ["decimals"]`.
- If `input.bigIntValue == null` and caller did not provide `requiredFields`, default requirement is skipped.
- Caller can override explicitly (for example `requiredFields: []`).

### Token value calculation policy

`robustCalculateTokenValue` always treats these inputs as required:

- `tokenAmount`
- `tokenPrice`
- `tokenDecimals`
- `tokenPriceDecimals`

No external `requiredFields` option is used for this function.

## Percent scaling rule

`robustFormatPercentToViewPercent` supports:

- `multiplier?: unknown` (default `1`)
- `divider?: unknown` (default `1`)

Scaling happens before formatting:

```ts
scaledValue = (value * multiplier) / divider
```

`divider = 0` is an error.

## Best Practice Examples from blog-examples

Reference implementation files:

- `/Users/srdjan/Documents/GitHub/web3-libs/blog-examples/src/app/data/vaults/vaults.mapper.ts`
- `/Users/srdjan/Documents/GitHub/web3-libs/blog-examples/src/app/data/vaults/vaults.fetch.ts`
- `/Users/srdjan/Documents/GitHub/web3-libs/blog-examples/src/app/data/vaults/vaults.types.ts`
- `/Users/srdjan/Documents/GitHub/web3-libs/blog-examples/src/app/mock-vaults/components/VaultRow.tsx`

### 1) Percentage formatting for APY and utilization

```ts
const supplyApy = robustFormatPercentToViewPercent({
  context: `${baseContext}.supplyApy`,
  input: { value: seed.supplyApy },
  multiplier: seed.supplyApyMultiplier ?? 1,
  divider: seed.supplyApyDivider ?? 1,
  options: {
    standardDecimals: 2,
    compactDecimals: 2,
    minDisplay: 0.01,
    maxDisplay: 500,
  },
})

const utilization = robustFormatPercentToViewPercent({
  context: `${baseContext}.utilization`,
  input: { value: seed.utilization },
  options: {
    standardDecimals: 2,
    compactDecimals: 2,
    minDisplay: 0.01,
    maxDisplay: 100,
  },
})
```

### 2) Token amount formatting from base units

```ts
const totalSupplyAmount = robustFormatBigIntToViewTokenAmount({
  context: `${baseContext}.totalSupply.amount`,
  input: {
    bigIntValue: seed.totalSupplyRaw,
    symbol: seed.symbol,
    decimals: seed.decimals,
  },
  requiredFields: ["decimals"],
})
```

### 3) Token USD value pipeline (calculate -> format -> merge diagnostics)

```ts
const calcResult = robustCalculateTokenValue({
  context: `${context}.calculate`,
  input: {
    tokenAmount,
    tokenPrice,
    tokenDecimals,
    tokenPriceDecimals,
  },
})

const formattedResult = robustFormatBigIntToViewNumber({
  context: `${context}.format`,
  input: {
    bigIntValue: calcResult.value?.tokenValueRaw,
    decimals: calcResult.value?.tokenValueDecimals,
    symbol: "$",
  },
  options: {
    standardDecimals: 2,
    compactDecimals: 2,
    minDisplay: 0.01,
    maxDisplay: 10_000_000_000,
  },
})

const diagnostics = mergeRobustDiagnostics(calcResult, formattedResult)
```

### 4) Shape used by renderer layer

`VaultRow` renders robust outputs for percentages, token amounts, and token values. Simple text values (`name`, `chain`, `note`) are passed directly as strings and should not go through numeric formatters.

Preferred render spread order in display-field wrappers:

```tsx
<DisplayPercentageField
  {...row?.supplyApy}
  {...row?.supplyApyQueryState}
  {...queryState}
/>

<DisplayTokenAmountField
  {...row?.totalSupplyAmount}
  {...row?.totalSupplyAmountQueryState}
  {...queryState}
/>

<DisplayTokenValueField
  {...row?.totalSupplyUsd}
  {...row?.totalSupplyUsdQueryState}
  {...queryState}
/>
```

## Data-quality scenario coverage from mock seeds

`vaults.fetch.ts` includes concrete runtime examples that should remain covered by tests:

- string coercions (`decimals`, `totalSupplyRaw`, `price`, `supplyApy`, `utilization` as strings)
- malformed object payload (`inWalletRaw: { raw: "123" }`)
- undefined/null/empty-string amount payloads
- query errors that should override warnings in display layer
- negative decimals hard error
- malformed price metadata (empty price + non-integer decimals string)
- long symbol + huge values + tiny percentages (compact and below-min behavior)

## Recommended integration patterns

### 1) Safe token value pipeline

```ts
import {
  robustCalculateTokenValue,
  robustFormatBigIntToViewNumber,
  mergeRobustDiagnostics,
} from "web3-robust-formatting"

const calc = robustCalculateTokenValue({
  input: {
    tokenAmount: raw?.tokenAmount,
    tokenPrice: raw?.tokenPrice,
    tokenDecimals: raw?.tokenDecimals,
    tokenPriceDecimals: raw?.tokenPriceDecimals,
  },
})

const formatted = robustFormatBigIntToViewNumber({
  input: {
    bigIntValue: calc.value?.tokenValueRaw,
    decimals: calc.value?.tokenValueDecimals,
    symbol: "$",
  },
})

const diagnostics = mergeRobustDiagnostics(calc, formatted)
```

### 2) Percent from scaled domain values

```ts
import { robustFormatPercentToViewPercent } from "web3-robust-formatting"

// Example: basis points-like value 25 -> 0.25 ratio -> 25.00%
const out = robustFormatPercentToViewPercent({
  input: { value: 25 },
  multiplier: 1,
  divider: 100,
})
```

### 3) Strict validation at ingestion edges

```ts
import { robustFormatNumberToViewNumber } from "web3-robust-formatting"

const out = robustFormatNumberToViewNumber({
  input: { value: payload?.apy, symbol: "%" },
  requiredFields: ["value"] as const,
  missingRequiredFieldSeverity: "error",
})
```

## Diagnostics handling checklist

- Always branch on `result.value` for rendering.
- Surface `warnings` and `errors` in logs or UI diagnostics.
- Use `mergeRobustDiagnostics` to aggregate multi-step pipeline diagnostics.
- Use `mapRobustFormattingToDisplayValue` when bridging into display-layer contracts.

## Anti-patterns to avoid

- Do not assume `value` exists when no errors are present.
- Do not strip warnings in data-quality-sensitive paths.
- Do not pre-concatenate symbols into numeric strings if renderer can position symbols.
- Do not pass already-percent-scaled values into `formatPercentToViewPercent` unless you intentionally adjust with `multiplier`/`divider`.

## Expected style for Codex edits in this domain

When using this skill, Codex should:

- Prefer robust wrappers at runtime boundaries.
- Keep formatting logic separated from rendering logic.
- Add/maintain tests for:
  - coercion behavior
  - required-field behavior
  - scaling/divider validation
  - diagnostics output shape
- Update README API docs whenever wrapper signatures or defaults change.
- Mirror established vaults mapper patterns for new formatted fields.
