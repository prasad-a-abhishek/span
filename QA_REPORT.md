---
repo: span
version: 1.0.0
tested_at: 2026-07-24
tested_by: human + hermes-orchestrator (this is the retroactive remediation report, not adversarial QA — see notes below)
tests_run: 67
tests_passed: 67
---

# QA Report — span v1.0.0

## What was verified

### Automated test suite
- Command: `npm test` (which runs `node --test test/*.test.js`)
- Result: **67/67 passing**, 0 failures, 120ms wall-clock
- Coverage: every supported unit and alias, whitespace tolerance, sign semantics (`-1h30m` = `-5400000`), malformed input rejection (`1hrz`, `1.2.3h`, empty string, whitespace-only), CLI parsing (`span 1h30m` → `5400000`), CLI formatting (`span -f 5400000` → `1h30m`), CLI `--version` and `--help`, round-trip stability, edge cases (`0`, `NaN`, `Infinity`).

### Library smoke (manual, via node REPL)
- `parse('2 days 4h')` → `172800000` ✓
- `parse('-1h30m')` → `-5400000` ✓
- `parse('1.5h')` → `5400000` ✓
- `format(86400000)` → `"1d"` ✓
- `format(365 * 86400 * 1000)` → `"1y"` ✓ (clean multiple)
- `format(NaN)` → throws `TypeError` ✓
- `format(Infinity)` → throws `TypeError` ✓

### CLI smoke
- `span --version` → `1.0.0` ✓
- `span --help` → multi-line help text ✓
- `span 1h30m` → `5400000` ✓
- `span -f 5400000` → `1h30m` ✓
- `span -f 1500 -d 1` → `1.5s` ✓

### Documentation
- README.md present (110+ lines, install/CLI/library/edge cases/competitor comparison)
- LICENSE present (MIT)
- package.json: name, version, description, main, scripts, keywords, author, license

## Known limitations (documented in README, not bugs)

- `1mo` = fixed 30 days, not calendar-aware. Documented.
- `1y` = fixed 365 days, not calendar-aware. Documented.
- Not on npm yet — install from GitHub. Documented.
- ISO 8601 (`PT1H30M`) is not parsed. Out of scope; would be a separate API surface.

## What this report is NOT

This is a **remediation report** written after the fact, not an **adversarial QA pass**. An adversarial QA pass would:
- Generate new test cases targeting edge cases not in the existing suite (e.g., very large values near Number.MAX_SAFE_INTEGER, negative milliseconds, fractional `1.5mo`)
- Probe for security issues (ReDoS in the parser, command injection in CLI flags)
- Verify round-trip stability across the full grammar (parse → format → parse identity)
- Check package metadata against npm publish requirements

The adversarial pass is pending — `repo-qa` profile will run it on the **next** cycle before any v1.1.0 push. This v1.0.0 push is **remediating a documentation gap** (missing README/LICENSE/version), not claiming the lib has been adversarially QA'd.

tests_passing: true
ship_status: remediation_push_v1.0.0
adversarial_qa: deferred_to_next_cycle

VERDICT: SHIP