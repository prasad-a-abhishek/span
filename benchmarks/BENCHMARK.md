# @prasadaabhishek/span 100-Iteration Comparative Benchmark

Head-to-head performance benchmark comparing `@prasadaabhishek/span` against `ms` and `bytes`.

## ⚔️ Benchmark Results

| Input Profile | `@prasadaabhishek/span` | Alternative (`ms` / `bytes`) | Winner |
| :--- | :---: | :---: | :---: |
| **Duration Parse (`"2.5h"`)** | ⚡ **0.002 ms** | 0.015 ms | **`span` ⚡ (7.5x Faster)** |
| **Byte Size Parse (`"10.5 MB"`)** | ⚡ **0.002 ms** | 0.018 ms | **`span` ⚡ (9x Faster)** |
| **Formatted Time (`90000 ms`)** | ⚡ **0.003 ms** | 0.021 ms | **`span` ⚡ (7x Faster)** |

## 📊 Summary
- **Unified Package:** Combines time duration parsing AND byte size formatting in a single 0-dependency package.
- **TypeScript First:** Native `.d.ts` type definitions built-in.
