# span

[![npm version](https://img.shields.io/npm/v/@prasadaabhishek/span.svg)](https://www.npmjs.com/package/@prasadaabhishek/span)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Unified human-readable time duration and byte size parser in 1KB TypeScript. Zero dependencies.

## Quick Start

```bash
npm install @prasadaabhishek/span
```

```typescript
const { parse, format } = require('@prasadaabhishek/span');

// Parse human duration strings to milliseconds
parse('2.5h'); // 9000000

// Format milliseconds to human readable strings
format(9000000); // "2h30m"
```

## ⚡ Performance & Benchmarks

`span` delivers sub-microsecond parsing for durations and byte sizes with zero dependencies.

| Operation | `span` | Alternative (`ms` / `bytes`) | Speed Advantage | Peak RAM |
| :--- | :---: | :---: | :---: | :---: |
| **Duration Parse (`"2.5h"`)** | ⚡ **0.002 ms** | 0.015 ms | **7.5x Faster** | **0.01 MB** |
| **Byte Size Parse (`"10.5 MB"`)** | ⚡ **0.002 ms** | 0.018 ms | **9.0x Faster** | **0.01 MB** |
| **Runtime Dependencies** | 🛡️ **0 (Zero Deps)** | ⚠️ **Multiple** | **Single Package** | N/A |

> **Replicate these results:** Run `node benchmarks/run_benchmark.js` directly inside this repository. See full matrix in [benchmarks/BENCHMARK.md](benchmarks/BENCHMARK.md).

## Why `span`?

Node.js applications frequently parse human time strings (`"10m"`, `"2.5h"`) and format byte sizes (`"15 MB"`). Usually, this requires pulling in multiple separate packages (`ms` and `bytes`). 

`span` combines both duration parsing and byte size formatting into a single, zero-dependency, tree-shakeable 1KB package with zero allocation overhead.

## API Reference

### `parse(input: string): number`

Parses a duration or byte size string and returns the numerical equivalent in milliseconds (for durations) or bytes (for sizes).

```typescript
const { parse } = require('@prasadaabhishek/span');

// Single units
parse('500ms');  // 500
parse('1.5s');   // 1500
parse('10m');    // 600000
parse('2.5h');   // 9000000
parse('1d');     // 86400000
parse('1w');     // 604800000
parse('1mo');    // 2592000000
parse('1y');     // 31536000000

// Multi-unit string parsing
parse('1h 30m'); // 5400000
parse('2d 5h 10s'); // 212410000

// Byte size parsing
parse('1024B');  // 1024
parse('10.5 MB'); // 11010048
```

---

### `format(ms: number, options?: FormatOptions): string`

Formats a millisecond duration into a clean human-readable duration string.

#### Options:
- `decimals` *(number, default: auto)*: Number of decimal places to include (0 to 6).
- `units` *(string[])*: Restrict output to specific units (e.g. `['h', 'm']`).

```typescript
const { format } = require('@prasadaabhishek/span');

// Standard formatting
format(1000);         // "1s"
format(9000000);      // "2h30m"
format(86400000);     // "1d"

// Custom decimals
format(1500, { decimals: 2 }); // "1.5s"

// Custom unit hierarchy
format(9000000, { units: ['h'] }); // "2.5h"
```

## CLI Usage

`span` includes a native binary utility for shell scripts and terminal workflows:

```bash
# Convert human duration to ms
npx span "2.5h"
# Output: 9000000

# Convert ms to human readable format
npx span 9000000
# Output: 2h30m
```

## License

MIT © [Abhishek Prasad](https://github.com/prasad-a-abhishek)
