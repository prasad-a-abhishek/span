'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

let span;
test.before(async () => {
  span = require('..');
});

// ---------------------------------------------------------------------------
// parse() — human format → milliseconds
// ---------------------------------------------------------------------------

test('parse() handles single unit', () => {
  assert.equal(span.parse('30s'), 30_000);
  assert.equal(span.parse('5m'), 300_000);
  assert.equal(span.parse('2h'), 7_200_000);
  assert.equal(span.parse('1d'), 86_400_000);
  assert.equal(span.parse('100ms'), 100);
});

test('parse() handles combined units', () => {
  assert.equal(span.parse('1h30m'), 5_400_000);
  assert.equal(span.parse('2d 4h'), 2 * 86_400_000 + 4 * 3_600_000);
  assert.equal(span.parse('1h30m45s'), 5_445_000);
});

test('parse() handles whitespace variations', () => {
  assert.equal(span.parse('1h 30m'), 5_400_000);
  assert.equal(span.parse('1 h 30 m'), 5_400_000);
  assert.equal(span.parse('  1h30m  '), 5_400_000);
});

test('parse() handles decimal values', () => {
  assert.equal(span.parse('1.5h'), 5_400_000);
  assert.equal(span.parse('0.5s'), 500);
  assert.equal(span.parse('2.5d'), 2 * 86_400_000 + 12 * 3_600_000);
});

test('parse() handles negative values', () => {
  assert.equal(span.parse('-1h'), -3_600_000);
  assert.equal(span.parse('-1h30m'), -5_400_000);
});

test('parse() returns 0 for "0" or empty unit', () => {
  assert.equal(span.parse('0s'), 0);
  assert.equal(span.parse('0'), 0);
});

test('parse() is case-insensitive on units', () => {
  assert.equal(span.parse('1H'), 3_600_000);
  assert.equal(span.parse('30M'), 1_800_000);
});

test('parse() handles "ms" alternative for milliseconds', () => {
  assert.equal(span.parse('500ms'), 500);
  assert.equal(span.parse('100 milliseconds'), 100);
});

test('parse() handles week, month, year (calendar units)', () => {
  // Week is exactly 7 days
  assert.equal(span.parse('1w'), 7 * 86_400_000);
  // Month is calendar average (30.4375 days)
  const m = span.parse('1mo');
  assert.equal(m, Math.round(30.4375 * 86_400_000));
  // Year is calendar average (365.25 days)
  const y = span.parse('1y');
  assert.equal(y, Math.round(365.25 * 86_400_000));
});

test('parse() throws on invalid input', () => {
  assert.throws(() => span.parse(''), TypeError);
  assert.throws(() => span.parse('hello'), TypeError);
  assert.throws(() => span.parse('1x'), TypeError);     // unknown unit
  assert.throws(() => span.parse('abc1h'), TypeError);
  assert.throws(() => span.parse('  '), TypeError);
});

test('parse() throws on non-string input', () => {
  assert.throws(() => span.parse(123), TypeError);
  assert.throws(() => span.parse(null), TypeError);
  assert.throws(() => span.parse(undefined), TypeError);
});

// ---------------------------------------------------------------------------
// format() — milliseconds → human format
// ---------------------------------------------------------------------------

test('format() handles sub-second values as ms', () => {
  assert.equal(span.format(0), '0ms');
  assert.equal(span.format(500), '500ms');
  assert.equal(span.format(999), '999ms');
});

test('format() handles seconds', () => {
  assert.equal(span.format(1_000), '1s');
  assert.equal(span.format(1500), '1.5s');
  assert.equal(span.format(30_000), '30s');
});

test('format() handles minutes', () => {
  assert.equal(span.format(60_000), '1m');
  assert.equal(span.format(90_000), '1m30s');
  assert.equal(span.format(3_600_000), '1h');
});

test('format() handles hours', () => {
  assert.equal(span.format(3_600_000), '1h');
  assert.equal(span.format(7_200_000), '2h');
  assert.equal(span.format(5_400_000), '1h30m');
});

test('format() handles days', () => {
  assert.equal(span.format(86_400_000), '1d');
  assert.equal(span.format(2 * 86_400_000 + 4 * 3_600_000), '2d4h');
});

test('format() drops zero units by default', () => {
  assert.equal(span.format(3_600_000), '1h'); // no 0s, no 0m
  assert.equal(span.format(86_400_000), '1d'); // no 0h, no 0m, no 0s
});

test('format() handles zero', () => {
  assert.equal(span.format(0), '0ms');
});

test('format() throws on negative or non-numeric input', () => {
  assert.throws(() => span.format(-1), RangeError);
  assert.throws(() => span.format('hello'), TypeError);
  assert.throws(() => span.format(NaN), TypeError);
  assert.throws(() => span.format(Infinity), RangeError);
});

test('format() respects decimals option', () => {
  assert.equal(span.format(1500, { decimals: 1 }), '1.5s');
  assert.equal(span.format(1500, { decimals: 0 }), '2s');
  assert.equal(span.format(1234, { decimals: 2 }), '1.23s');
});

test('format() respects units option (limit to specific units)', () => {
  assert.equal(span.format(5_400_000, { units: ['h'] }), '1.5h');
  assert.equal(span.format(1500, { units: ['s'] }), '1.5s');
  assert.equal(span.format(86_400_000, { units: ['h'] }), '24h');
});

test('format() returns compact form (drops empty)', () => {
  assert.equal(span.format(60_000), '1m');
  assert.equal(span.format(120_000), '2m');
});

test('format() handles very large values', () => {
  const yr = 365.25 * 86_400_000;
  assert.equal(span.format(yr), '1y');
  assert.equal(span.format(yr * 2 + 86_400_000), '2y1d');
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

test('round-trip parse(format(x)) for many values', () => {
  const cases = [
    0, 1, 500, 1000, 60_000, 90_000, 3_600_000, 5_400_000,
    86_400_000, 86_400_000 * 7, 365.25 * 86_400_000,
  ];
  for (const ms of cases) {
    const formatted = span.format(ms);
    const parsed = span.parse(formatted);
    assert.equal(parsed, ms, `round-trip failed for ${ms}: got ${formatted} → ${parsed}`);
  }
});

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

test('CLI parses a duration', () => {
  const { execFileSync } = require('node:child_process');
  const CLI = require('path').join(__dirname, '..', 'bin', 'span.js');
  const out = execFileSync('node', [CLI, '1h30m'], { encoding: 'utf-8' }).trim();
  assert.equal(out, '5400000');
});

test('CLI formats milliseconds', () => {
  const { execFileSync } = require('node:child_process');
  const CLI = require('path').join(__dirname, '..', 'bin', 'span.js');
  const out = execFileSync('node', [CLI, '-f', '5400000'], { encoding: 'utf-8' }).trim();
  assert.equal(out, '1h30m');
});

test('CLI prints --version', () => {
  const { execFileSync } = require('node:child_process');
  const CLI = require('path').join(__dirname, '..', 'bin', 'span.js');
  const out = execFileSync('node', [CLI, '--version'], { encoding: 'utf-8' }).trim();
  assert.match(out, /^0\./);
});
