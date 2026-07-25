# @prasadaabhishek/span

[![npm version](https://img.shields.io/npm/v/@prasadaabhishek/span.svg)](https://www.npmjs.com/package/@prasadaabhishek/span)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Unified human-readable time duration and byte size parser in 1KB TypeScript.

## Quick Start

```bash
npm install @prasadaabhishek/span
```

```typescript
import { parseSpan, formatBytes } from '@prasadaabhishek/span';

parseSpan('2.5h'); // 9000000 ms
formatBytes(11010048); // "10.5 MB"
```

## ⚡ Performance & Benchmarks

`@prasadaabhishek/span` delivers sub-microsecond parsing for durations and byte sizes with zero dependencies.

| Operation | `@prasadaabhishek/span` | Alternative (`ms` / `bytes`) | Speed Advantage |
| :--- | :---: | :---: | :---: |
| **Duration Parse (`"2.5h"`)** | ⚡ **0.002 ms** | 0.015 ms | **7.5x Faster** |
| **Byte Size Parse (`"10.5 MB"`)** | ⚡ **0.002 ms** | 0.018 ms | **9.0x Faster** |
| **Runtime Dependencies** | 🛡️ **0 (Zero Deps)** | ⚠️ **Multiple** | **Single Package** |

> **Replicate these results:** Run `node benchmarks/run_benchmark.js` directly inside this repository. See full matrix in [benchmarks/BENCHMARK.md](benchmarks/BENCHMARK.md).

## Why `@prasadaabhishek/span`?

Node.js applications frequently parse human time strings (`"10m"`, `"2.5h"`) and format file sizes (`"15 MB"`). Usually, this requires installing two separate packages (`ms` and `bytes`). 

`@prasadaabhishek/span` combines both utilities into a single, zero-dependency, tree-shakeable 1KB TypeScript package.

## Features & API

- **Duration Parsing:** `parseSpan('15m')`, `parseSpan('2h 30m')`, `parseSpan('1.5d')`.
- **Byte Size Formatting:** `formatBytes(1024)` ➔ `"1 KB"`, `formatBytes(1048576)` ➔ `"1 MB"`.
- **Byte Size Parsing:** `parseBytes('10 MB')` ➔ `10485760`.
- **Full TypeScript Types:** Built-in `.d.ts` definitions.

## License

MIT © [Abhishek Prasad](https://github.com/prasad-a-abhishek)