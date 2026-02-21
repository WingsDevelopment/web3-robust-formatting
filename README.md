# web3-robust-formatting

Formatting helpers and robust wrappers for web3 number/token display workflows.

## Install

```bash
npm install web3-robust-formatting
```

## Exports

### Formatting functions

- `formatBigIntToViewNumber`
- `formatBigIntToViewTokenAmount`
- `formatNumberToViewNumber`
- `formatPercentToViewPercent`

### Robust formatting functions

- `robustFormatBigIntToViewNumber`
- `robustFormatBigIntToViewTokenAmount`
- `robustFormatNumberToViewNumber`
- `robustFormatPercentToViewPercent`
- `robustCalculateTokenValue`

### Robust diagnostics/helpers

- `finalizeRobustFormattingResult`
- `buildRobustDiagnosticsMessage`
- `mergeRobustDiagnostics`
- `mapRobustFormattingToDisplayValue`
- `normalizeBigIntValue`
- `normalizeDecimals`
- `normalizeNumberValue`
- `normalizeSymbol`
- `reportMissingRequiredFields`
- `resolveRuntimeType`
- `toErrorMessage`

## Usage

```ts
import {
  formatBigIntToViewTokenAmount,
  robustFormatBigIntToViewTokenAmount,
  robustCalculateTokenValue,
} from "web3-robust-formatting"

const amount = formatBigIntToViewTokenAmount(
  { bigIntValue: 1234567890000000000n, decimals: 18, symbol: "ETH" },
  { twoDigitDecimals: 4 },
)

const robustAmount = robustFormatBigIntToViewTokenAmount({
  input: { bigIntValue: "1234567890000000000", decimals: "18", symbol: "ETH" },
})

const tokenValue = robustCalculateTokenValue({
  input: {
    tokenAmount: 1230000n,
    tokenPrice: "2.45",
    tokenDecimals: 6,
    tokenPriceDecimals: 8,
  },
})
```

## Notes

- This package intentionally contains no React/UI components.
- Runtime dependency: `viem`.
