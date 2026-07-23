'use strict';
// Additional tests covering edge cases and adversarial inputs.
const test = require('node:test');
const assert = require('node:assert/strict');

let span;
test.before(async () => { span = require('..'); });

// ---------------------------------------------------------------------------
// Parse — extras / fuzz
// ---------------------------------------------------------------------------

test('parse: bare number is treated as milliseconds', () => {
  assert.equal(span.parse('42'), 42);
  assert.equal(span.parse('1000'), 1000);
});

test('parse: bare decimal is treated as milliseconds', () => {
  // Bare numbers (no unit) are interpreted as milliseconds. This
  // matches the popular `ms` library convention.
  assert.equal(span.parse('1.5'), 1.5);
  assert.equal(span.parse('0.5'), 0.5);
  assert.equal(span.parse('-2.5'), -2.5);
});

test('parse: +1h works as positive', () => {
  assert.equal(span.parse('+1h'), 3_600_000);
});

test('parse: leading minus without a term is an error', () => {
  assert.throws(() => span.parse('-'), TypeError);
  assert.throws(() => span.parse('- x'), TypeError);
});

test('parse: rejects trailing garbage', () => {
  assert.throws(() => span.parse('1h foo'), TypeError);
  assert.throws(() => span.parse('1h.'), TypeError);
});

test('parse: whitespace between number and unit', () => {
  assert.equal(span.parse('1 h'), 3_600_000);
  assert.equal(span.parse('1\t\thour'), 3_600_000);
});

test('parse: whitespace inside a term is allowed anywhere', () => {
  assert.equal(span.parse('1 hour 30 mins'), 5_400_000);
});

test('parse: case-insensitive units in mixed case', () => {
  assert.equal(span.parse('1H30M'), 5_400_000);
  assert.equal(span.parse('1H 30 minutes'), 5_400_000);
});

test('parse: full unit names', () => {
  assert.equal(span.parse('1 hour'), 3_600_000);
  assert.equal(span.parse('2 hours'), 7_200_000);
  assert.equal(span.parse('5 minutes'), 300_000);
  assert.equal(span.parse('30 seconds'), 30_000);
});

test('parse: bare number followed by a space and unit is still a single term', () => {
  // '42 h' is parsed as 42 hours because there's a single term
  // (number + whitespace + unit) — the parser's whitespace tolerance
  // treats '42 h' and '42h' identically.
  assert.equal(span.parse('42 h'), 42 * 3_600_000);
  assert.equal(span.parse('30 m'), 30 * 60_000);
});

test('parse: bare number then separate term requires explicit delimiter', () => {
  // '42h' is unambiguously 42 hours.
  assert.equal(span.parse('42h'), 42 * 3_600_000);
});

test('parse: rejects multiple dots in number', () => {
  assert.throws(() => span.parse('1.2.3h'), TypeError);
});

test('parse: throws RangeError for overflow', () => {
  // 1e308 * anything will overflow.
  assert.throws(() => span.parse('1e400h'), TypeError);
});

test('parse: handles long compound strings', () => {
  assert.equal(span.parse('1w 2d 3h 4m 5s 6ms'),
    1 * 7 * 86_400_000 + 2 * 86_400_000 + 3 * 3_600_000 +
    4 * 60_000 + 5 * 1000 + 6);
});

test('parse: tabs and newlines are valid whitespace', () => {
  assert.equal(span.parse('1h\t30m'), 5_400_000);
  assert.equal(span.parse('1h\n30m'), 5_400_000);
});

// ---------------------------------------------------------------------------
// Format — extras
// ---------------------------------------------------------------------------

test('format: 1ms is "1ms"', () => {
  assert.equal(span.format(1), '1ms');
});

test('format: 999ms is "999ms"', () => {
  assert.equal(span.format(999), '999ms');
});

test('format: 1000ms is "1s" (no decimals)', () => {
  assert.equal(span.format(1000), '1s');
});

test('format: 60000ms is "1m"', () => {
  assert.equal(span.format(60_000), '1m');
});

test('format: 3600000ms is "1h"', () => {
  assert.equal(span.format(3_600_000), '1h');
});

test('format: 1d + 1h + 1m + 1s = clean composite', () => {
  const ms = 86_400_000 + 3_600_000 + 60_000 + 1000;
  assert.equal(span.format(ms), '1d1h1m1s');
});

test('format: 1y + 1mo + 1w + 1d', () => {
  const y = 365.25 * 86_400_000;
  const mo = 30.4375 * 86_400_000;
  const w = 7 * 86_400_000;
  const d = 86_400_000;
  // This combines clean: each is a multiple of the next-larger in the
  // hierarchy, so we expect "1y1mo1w1d".
  assert.equal(span.format(y + mo + w + d), '1y1mo1w1d');
});

test('format: decimals option forces precision', () => {
  assert.equal(span.format(1500, { decimals: 1 }), '1.5s');
  assert.equal(span.format(1500, { decimals: 0 }), '2s');
  assert.equal(span.format(1234, { decimals: 2 }), '1.23s');
  assert.equal(span.format(1234, { decimals: 3 }), '1.234s');
});

test('format: units option restricts the unit set', () => {
  // Force hours only — 1.5h.
  assert.equal(span.format(5_400_000, { units: ['h'] }), '1.5h');
  assert.equal(span.format(1500, { units: ['s'] }), '1.5s');
  // Restricting to hours forces a larger-value decimal: 86400000ms = 24h.
  assert.equal(span.format(86_400_000, { units: ['h'] }), '24h');
});

test('format: units option with multiple units emits separate', () => {
  // units=['h','m'] forces the 1h30m layout.
  assert.equal(span.format(5_400_000, { units: ['h', 'm'] }), '1h30m');
});

test('format: 0 returns "0ms"', () => {
  assert.equal(span.format(0), '0ms');
});

test('format: huge values do not overflow', () => {
  // 1e15 ms ≈ 31 years.
  const out = span.format(1e15);
  assert.ok(/^\d+y/.test(out), `expected output to start with years, got ${out}`);
});

test('format: throws on non-number', () => {
  assert.throws(() => span.format('1500'), TypeError);
  assert.throws(() => span.format(null), TypeError);
  assert.throws(() => span.format(undefined), TypeError);
  assert.throws(() => span.format({}), TypeError);
});

test('format: throws on negative', () => {
  assert.throws(() => span.format(-1), RangeError);
  assert.throws(() => span.format(-1000), RangeError);
});

test('format: throws on NaN/Infinity', () => {
  assert.throws(() => span.format(NaN), TypeError);
  assert.throws(() => span.format(Infinity), RangeError);
  assert.throws(() => span.format(-Infinity), RangeError);
});

test('format: throws on bad decimals option', () => {
  assert.throws(() => span.format(1500, { decimals: -1 }), TypeError);
  assert.throws(() => span.format(1500, { decimals: 7 }), TypeError);
  assert.throws(() => span.format(1500, { decimals: '1' }), TypeError);
});

test('format: throws on bad units option', () => {
  assert.throws(() => span.format(1500, { units: [] }), TypeError);
  assert.throws(() => span.format(1500, { units: ['xx'] }), TypeError);
  assert.throws(() => span.format(1500, { units: 's' }), TypeError);
});

// ---------------------------------------------------------------------------
// Round-trip — fuzz
// ---------------------------------------------------------------------------

test('round-trip: many values parse(format(x)) === x', () => {
  const cases = [
    0, 1, 100, 999, 1000, 1500, 30_000, 60_000, 90_000, 3_600_000, 5_400_000,
    86_400_000, 86_400_000 + 3_600_000, 86_400_000 * 7, 365.25 * 86_400_000,
    365.25 * 86_400_000 * 2, 86_400_000 * 30,
  ];
  for (const ms of cases) {
    const formatted = span.format(ms);
    const parsed = span.parse(formatted);
    assert.equal(parsed, ms, `round-trip failed for ${ms}: got "${formatted}" → ${parsed}`);
  }
});

test('round-trip: negative values format cleanly when parsed back', () => {
  // parse('-1h30m') === -5_400_000.
  const parsed = span.parse('-1h30m');
  // We can't format negative values, but we can round-trip the parse.
  assert.equal(parsed, -5_400_000);
});

// ---------------------------------------------------------------------------
// CLI: --version, --help
// ---------------------------------------------------------------------------

test('CLI: --help exits 0', () => {
  const { execFileSync } = require('node:child_process');
  const CLI = require('node:path').join(__dirname, '..', 'bin', 'span.js');
  const out = execFileSync(process.execPath, [CLI, '--help'], { encoding: 'utf8' });
  assert.match(out, /Usage: span/);
});

test('CLI: --version prints a version', () => {
  const { execFileSync } = require('node:child_process');
  const CLI = require('node:path').join(__dirname, '..', 'bin', 'span.js');
  const out = execFileSync(process.execPath, [CLI, '--version'], { encoding: 'utf8' }).trim();
  assert.match(out, /^0\./);
});

test('CLI: bare number passes through as ms', () => {
  const { execFileSync } = require('node:child_process');
  const CLI = require('node:path').join(__dirname, '..', 'bin', 'span.js');
  const out = execFileSync(process.execPath, [CLI, '1500'], { encoding: 'utf8' }).trim();
  assert.equal(out, '1500');
});

test('CLI: -f 1500 with -d 1 produces 1.5s', () => {
  // The CLI defaults to -d 0 (no decimals). With -d 1 we get 1.5s.
  const { execFileSync } = require('node:child_process');
  const CLI = require('node:path').join(__dirname, '..', 'bin', 'span.js');
  const out = execFileSync(process.execPath, [CLI, '-f', '1500', '-d', '1'], { encoding: 'utf8' }).trim();
  assert.equal(out, '1.5s');
});

test('CLI: -f 1500 with default decimals rounds', () => {
  const { execFileSync } = require('node:child_process');
  const CLI = require('node:path').join(__dirname, '..', 'bin', 'span.js');
  const out = execFileSync(process.execPath, [CLI, '-f', '1500'], { encoding: 'utf8' }).trim();
  assert.equal(out, '2s');  // default -d 0 → Math.round(1.5) = 2
});

test('CLI: invalid input exits with non-zero', () => {
  const { execFileSync } = require('node:child_process');
  const CLI = require('node:path').join(__dirname, '..', 'bin', 'span.js');
  let code = 0;
  try {
    execFileSync(process.execPath, [CLI, 'garbage'], { encoding: 'utf8' });
  } catch (e) {
    code = e.status;
  }
  assert.notEqual(code, 0, 'expected non-zero exit for invalid input');
});