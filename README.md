# span

> Tiny zero-dep human-duration parser and formatter. `'1h30m'` ↔ `5400000`. Bidirectional, deterministic, edge-case tested.

```
$ span 1h30m
5400000
$ span -f 5400000
1h30m
$ span -f 1500 -d 1
1.5s
```

## Why span exists

Most "duration" packages do **one** of: parsing human strings, or formatting milliseconds. The few that do both usually couple the formatter to the parser and bake in calendar assumptions (`mo` = 30.4375 days, `y` = 365.25 days). `span` keeps the two halves separable, deterministic, and small.

- **Zero dependencies.** No `luxon`, no `moment`, no `date-fns`. Drop the file in any Node project.
- **Bidirectional but independent.** `parse` and `format` don't share state. You can swap one without the other.
- **Calendar approximations are explicit.** `1mo` parses as a fixed 30-day month, `1y` as 365 days. `format()` will only emit calendar units when the value is a clean multiple — never `0.5y`.
- **Strict input validation.** `1hrz` throws; `1.2.3h` throws; trailing garbage throws. The parser doesn't silently accept broken input — that's the most common bug in this category.

## Install

```bash
npm install @prasadaabhishek/span
```

;

## CLI

```bash
span <duration>          # parse, print milliseconds
span -f <ms>             # format, print human string
span -f <ms> -d 2        # format with 2 decimal places on the smallest unit
span --version
span --help
```

## Library

```js
const { parse, format } = require('span');

parse('1h30m');                 // → 5400000
parse('-1h30m');                // → -5400000  (sign applies to the whole duration, not per-term)
parse('2 days 4h');             // → 172800000
parse('1ms');                   // → 1
parse('500ms');                 // → 500
parse('1.5h');                  // → 5400000

format(5400000);                // → "1h30m"
format(1500, { decimals: 1 });  // → "1.5s"
format(86400000);               // → "1d"
format(0);                      // → "0ms"
format(365 * 86400 * 1000);     // → "1y"   (only when value is a clean multiple of the unit)
```

## Supported units

| Unit | Aliases | Milliseconds |
|---|---|---|
| `ms` | `milliseconds` | 1 |
| `s` | `sec`, `secs`, `second`, `seconds` | 1,000 |
| `m` | `min`, `mins`, `minute`, `minutes` | 60,000 |
| `h` | `hr`, `hrs`, `hour`, `hours` | 3,600,000 |
| `d` | `day`, `days` | 86,400,000 |
| `w` | `wk`, `week`, `weeks` | 604,800,000 |
| `mo` | `month`, `months` | 2,592,000,000 (30 days, fixed) |
| `y` | `yr`, `year`, `years` | 31,536,000,000 (365 days, fixed) |

Case-insensitive. Whitespace tolerant between terms and between number and unit.

## Edge cases that matter

- `parse('')` → `TypeError("empty duration")`
- `parse('   ')` → `TypeError("empty duration")`
- `parse('1hrz')` → `TypeError` (unknown unit, no silent acceptance)
- `parse('1.2.3h')` → `TypeError` (malformed number)
- `parse('-1h30m')` → `-5400000` (sign applies once, not per-term)
- `parse('1H 30M')` → `5400000` (uppercase works)
- `format(0)` → `"0ms"`
- `format(NaN)` → `TypeError`
- `format(Infinity)` → `TypeError`

## Why not use `ms` or `parse-duration`?

| | `span` | `ms` | `parse-duration` |
|---|---|---|---|
| Zero deps | ✓ | ✓ | ✓ |
| Bidirectional | ✓ | partial | ✗ (parser only) |
| Strict input validation | ✓ | partial | partial |
| Configurable format precision | ✓ | ✗ | ✗ |
| CLI included | ✓ | partial | ✗ |
| ESM + CJS | ✓ | ✓ | ✓ |

## Test

```bash
npm test
```

67 tests covering: every supported unit + alias, whitespace tolerance, sign semantics, malformed input rejection, CLI parsing, CLI formatting, CLI `--version`/`--help`, round-trip stability, edge cases (0, NaN, Infinity, overflow).

## License

MIT — see [LICENSE](./LICENSE).