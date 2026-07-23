# `span` research audit (2026-07-23)

## Scope and method

I reviewed the public documentation/source pages for the principal JavaScript duration packages, plus the repository's tests and `lib/` implementation. The ecosystem splits into two different jobs: **parsing a compact expression into milliseconds** and **formatting a numeric duration for a person**. Date libraries additionally model calendar-relative durations or human distance between dates; they are not interchangeable with a strict duration parser.

## 1. Tool audit

| Tool | What users get | Practical implication for `span` |
|---|---|---|
| [`ms`](https://github.com/vercel/ms) | Tiny, familiar parser/formatter: `2 days`, `1h`, `2.5 hrs`; numeric output is milliseconds. Its compact grammar and aliases make it a common config/CLI dependency. | Strong benchmark for a small zero-dependency parser. Keep strict errors and explicit unit aliases; do not imply calendar-aware dates. |
| [`parse-duration`](https://www.npmjs.com/package/parse-duration) | Dedicated human-string parser with compound values, decimals and unit aliases; commonly used when input is supplied by humans/config. | This is the nearest category competitor. Compatibility with its common spellings matters more than exotic date APIs. |
| [`pretty-ms`](https://github.com/sindresorhus/pretty-ms) | Milliseconds → compact readable text, with options for colon notation, seconds, verbose output, and unit/spacing behavior. | Formatting is a product surface, not merely inverse parsing. `span` already has useful deterministic compact output but should expose a readable mode. |
| [`humanize-duration`](https://github.com/EvanHahn/HumanizeDuration.js) | Milliseconds → localized natural-language phrases, configurable units, precision, largest-unit count, conjunctions, and locale. | Localization/accessibility are deliberately outside a compact grammar. Avoid competing broadly; offer a stable machine/CLI format and perhaps an opt-in plain-English formatter. |
| [`moment.duration`](https://momentjs.com/docs/#/durations/) | Duration objects from milliseconds, unit objects, ISO 8601 strings, and ASP.NET-style strings; rich getters/humanization, but Moment is legacy/heavy. | ISO 8601 is a separate interoperability grammar. Supporting it should be explicit (`parse.iso`) rather than silently mixing semantics with `1m`/`mo`. |
| [`Luxon Duration`](https://moment.github.io/luxon/api-docs/index.html#duration) | Immutable duration objects, ISO parsing/serialization, unit shifting/conversion, locale-aware `toHuman`; can preserve calendar units in a matrix. | Useful model for separating representation/conversion from display. `span` should document that month/year are fixed averages, not calendar arithmetic. |
| [`Day.js duration`](https://day.js.org/docs/en/durations/durations) | Plugin-based duration object; accepts milliseconds, unit maps, and ISO 8601 duration strings; humanization needs relative-time/plugin ecosystem. | Plugin/API tradeoff is unlike `span`'s zero-dependency goal. Keep the core small and predictable. |
| [`chrono-node`](https://github.com/wanasit/chrono) | Natural-language date/time parser (`"in 2 hours"`, dates), not a duration-only grammar. | Do not chase unconstrained English. A bounded grammar is safer for automation. |
| [`date-fns formatDistance`](https://date-fns.org/v4.1.0/docs/formatDistance) | Human distance between two dates (`about 1 hour`), locale-aware and rounded by thresholds. | It answers “how far apart are these instants?”, not “what does `1h30m` mean?”. Separate these APIs conceptually. |
| [`npm-duration`](https://www.npmjs.com/package/npm-duration) | Small duration parsing/formatting package in the familiar npm ecosystem. | Reinforces demand for a narrow convenience package; documentation and edge-case behavior are the differentiator. |

**Observed convention:** compact syntax is usually concatenated or whitespace-separated (`1h30m`, `1h 30m`), case-insensitive, with decimal numbers and aliases. ISO 8601 (`PT1H30M`) and natural language (`one hour and thirty minutes`, locale strings) are distinct contracts. Most libraries choose fixed millisecond conversions for `d` and often approximate `mo`/`y`; calendar-aware libraries retain unit structure and require a reference date for calendar math.

## 2. User complaints / failure modes

Searches for “duration parsing wrong”, “1h30m ambiguous”, and “duration parser locale” consistently point to ambiguity rather than lack of another formatter:

* **Unit collisions:** `m` means minute in duration syntax but can be confused with month; `mo` is safer. `ms` must be matched before `m`; greedy or naïve regexes turn `500ms` into minutes or reject it.
* **Semantic mismatch:** a “month” is not a fixed number of milliseconds. Users expect calendar behavior in scheduling/billing contexts, while timeout and telemetry users expect deterministic milliseconds.
* **Sign semantics:** `-1h30m` generally means negative total duration, not `-1h + 30m`. Parsers that apply the sign per token surprise users.
* **Partial acceptance:** permissive parsers silently ignore typos (`1hrz`, `10 minutes garbage`) and create dangerous timeout/billing bugs. Users want full-string validation and useful error locations.
* **Locale:** words and decimal commas (`1,5 h`), pluralization, and “1 hour 30 minutes” are not safely universal. Locale-aware display is easier than locale-aware parsing; automatic locale detection is a footgun.
* **Formatting expectations:** users ask for compact machine output, clock output (`01:30:00`), or natural language at different times. One default cannot satisfy all three.

## 3. Tuesday workflows (five concrete personas)

1. **Dev-tools CLI author:** accepts `--timeout 30s`, `--retry 1.5m`, or `1h30m`; needs zero dependencies, deterministic parsing, clear non-zero errors, and stdout suitable for scripts. A compact `span parse`/`span format` is directly useful.
2. **SRE piping job durations:** parses CI/log values and emits milliseconds for sorting, metrics, or alert thresholds. Needs case/whitespace tolerance, compound units, bounded grammar, no locale surprises, and round-trip stability.
3. **Billing / duration-invoice engine:** converts billable intervals to money. Needs exact policy, decimal-safe arithmetic, explicit rounding, and prohibition or explicit treatment of `mo`/`y`; silently treating a calendar month as 30.4375 days is a financial hazard.
4. **Video editor reading `1h 23m`:** wants a friendly, visible duration and often frame/timecode precision. Needs spaces, long aliases, perhaps `HH:MM:SS` and a human display; compact `1h23m` alone is machine-oriented.
5. **Accessibility feature timeout:** accepts settings such as “2 minutes” and announces remaining time. Needs plain-language/localized output, no ambiguous abbreviations, bounded ranges, and a separate accessibility formatter; parser should accept common English only if explicitly documented.

## 4. Current `span` coverage

Based on `test/span.test.js` and `lib/parse.js`/`lib/format.js`:

### SHIPPED (tests specify it)

* Parse single and compound units: `ms/s/m/h/d`, `1h30m`, whitespace-separated and embedded whitespace.
* Decimal values (`1.5h`, `0.5s`, `2.5d`), case-insensitive units, long singular/plural aliases, weeks/months/years.
* Leading negative sign, including compound negative values; `0`/`0s`; TypeError for invalid/non-string input.
* Format non-negative finite milliseconds into compact largest-to-smallest output; `0ms`; decimal option; unit restriction (`24h`); weeks/months/years; large values; parse(format(x)) tests; CLI parse, format, and version.

### PARTIAL / risky despite intended coverage

* **Parser is not actually robust:** the implementation's implicit-token regex can split unit text incorrectly and has a sign model that stores one mutable sign. It is easy for adjacent tokens, long aliases, or malformed strings to behave unexpectedly; the reported baseline (16/27 passing) confirms this is the release blocker.
* **Month/year semantics:** fixed averages (30.4375 days, 365.25 days) are documented in tests but not distinguished in the API from elapsed units; callers can mistake them for calendar arithmetic.
* **Formatter options:** `decimals` is global and unit selection is narrow; there is no documented natural-language, locale, colon/timecode, or rounding policy beyond current tests.
* **CLI contract:** positional compact parse and `-f` format are covered, but stdin, useful diagnostics, and explicit grammar/versioned machine output are absent.

### MISSING

* ISO 8601 duration parsing/serialization (`PT1H30M`, `P1W`, calendar component semantics).
* Clock/timecode input (`01:23:00`), words (`1 hour 30 minutes` beyond currently tested aliases), and locale-aware decimal/input parsing.
* Structured result (components, source tokens, warnings/precision) and explicit calendar-vs-fixed unit mode.
* Overflow/safe-integer policy, duplicate-unit policy, token-order policy, and error offsets.
* Locale/accessibility human formatter, configurable conjunctions, and pluralized long output.

## 5. ONE wedge

**`span` should be the strict, zero-dependency, script-safe parser/formatter for compact duration expressions in Node CLIs and configuration (`1h30m` → integer milliseconds), with deterministic round trips and excellent errors.**

The wedge is not “the most human” parser, a date-distance library, or a calendar engine. It is the boringly reliable boundary between human-entered timeout/interval syntax and machine milliseconds. That targets dev-tool and SRE workflows first, while remaining useful anywhere a config file or CLI needs a duration.

## 6. Recommendation

1. **Ship the parser fix before adding breadth.** Use a full-string tokenizer that recognizes sign once, number (including a documented decimal grammar), then longest-match unit; reject any unconsumed character. Make `-1h30m` unambiguously `-(1h30m)`. Add regression tests for `500ms`, long aliases, malformed separators, duplicate units, and sign placement.
2. **Make semantics explicit.** Keep `d`, `w`, `mo`, `y` fixed conversion constants in the core and call them out as approximate elapsed units. Either expose `calendar: false` as the only core behavior or provide a separate calendar API later; never imply that `1mo` equals a date-library calendar month.
3. **Document the grammar as a contract.** State accepted forms (`1h30m`, `1h 30m`, `1 h 30 m`, aliases, case), rejected forms, rounding/number precision, safe range, and whether units must be descending/unique. Strict complete consumption should be the default.
4. **Keep formatting deterministic and add modes only after the wedge works.** Preserve compact `format()` for scripts; consider a separate `formatHuman()` or `formatClock()` rather than changing defaults. Do not add locale parsing to core.
5. **CLI ergonomics:** retain `span VALUE` and `span -f MS`; add `--json` only if a stable machine contract is needed, and send parse errors to stderr with the offending token. Read stdin only as an explicit feature.
6. **Position against alternatives:** `ms` is the incumbent tiny parser, `pretty-ms` the formatter, and Moment/Luxon/Day.js the object/ISO/date ecosystems. `span` wins by combining a strict compact grammar, predictable round-trip formatting, zero dependencies, and a focused CLI—not by reproducing their locale/calendar surface.

### Sources actually read

1. https://github.com/vercel/ms
2. https://www.npmjs.com/package/parse-duration
3. https://github.com/sindresorhus/pretty-ms
4. https://github.com/EvanHahn/HumanizeDuration.js
5. https://momentjs.com/docs/#/durations/
6. https://moment.github.io/luxon/api-docs/index.html#duration
7. https://day.js.org/docs/en/durations/durations
8. https://date-fns.org/v4.1.0/docs/formatDistance
9. https://github.com/wanasit/chrono
10. https://www.npmjs.com/package/npm-duration
