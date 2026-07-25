# @prasadaabhishek/span

> Unified time duration & byte size parser in 1KB TypeScript.

## Quick Start

```bash
npm install @prasadaabhishek/span
```

```typescript
import { parseSpan, formatBytes } from '@prasadaabhishek/span';
parseSpan('2.5h'); // 9000000
formatBytes(11010048); // "10.5 MB"
```

## ⚡ Performance & Benchmarks

`@prasadaabhishek/span` delivers sub-microsecond parsing for durations and byte sizes with zero dependencies.

| Input Profile | `@prasadaabhishek/span` | Alternative (`ms` / `bytes`) | Speed Advantage |
| :--- | :---: | :---: | :---: |
| **Duration Parse (`"2.5h"`)** | ⚡ **0.002 ms** | 0.015 ms | **7.5x Faster** |
| **Byte Size Parse (`"10.5 MB"`)** | ⚡ **0.002 ms** | 0.018 ms | **9.0x Faster** |

> **Replicate these results:** Run `node benchmarks/run_benchmark.js` directly inside this repository. See full matrix in [benchmarks/BENCHMARK.md](benchmarks/BENCHMARK.md).

## License

MIT