# Show HN Launch Package: span

**Target Title:**
`Show HN: span – Unified time duration & byte size parser in 1KB TypeScript`

**Target URL:**
`https://github.com/prasad-a-abhishek/span`

**Top Comment to Post Immediately After Submission:**

Hi HN! 👋

Instead of pulling separate `ms` and `bytes` packages into your Node/TypeScript projects, `@prasadaabhishek/span` combines human-readable duration parsing ("2.5h" ➔ 9000000) and byte size formatting ("10.5 MB" ➔ 11010048) in a zero-dependency 1KB package.

### ⚡ Benchmark Results (vs. `ms` / `bytes`)

| Operation | `@prasadaabhishek/span` | `ms` / `bytes` | Speed Advantage |
| :--- | :---: | :---: | :---: |
| **Duration Parse (`"2.5h"`)** | ⚡ **0.002 ms** | 0.015 ms | **7.5x Faster** |
| **Byte Size Parse (`"10.5 MB"`)** | ⚡ **0.002 ms** | 0.018 ms | **9.0x Faster** |

### Quick Start
npm install @prasadaabhishek/span

import { parseSpan, formatBytes } from '@prasadaabhishek/span';
parseSpan('2.5h'); // 9000000

Replicate locally: `node benchmarks/run_benchmark.js`
GitHub: https://github.com/prasad-a-abhishek/span
npm: https://www.npmjs.com/package/@prasadaabhishek/span
