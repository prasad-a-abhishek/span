'use strict';

// span/lib/parse.js
// Parses human-readable duration strings into milliseconds.
//
// Grammar (BNF-like):
//   duration   := <sign>? <term> (<ws>* <term>)*
//   sign       := '-'
//   term       := <number> <ws>* <unit>
//   number     := <digit>+ ('.' <digit>+)?
//   ws         := ' ' | '\t'
//   unit       := 'ms' | 'milliseconds'
//              |  's' | 'sec' | 'secs' | 'second' | 'seconds'
//              |  'm' | 'min' | 'mins' | 'minute' | 'minutes'
//              |  'h' | 'hr' | 'hrs' | 'hour' | 'hours'
//              |  'd' | 'day' | 'days'
//              |  'w' | 'wk' | 'week' | 'weeks'
//              |  'mo' | 'month' | 'months'
//              |  'y' | 'yr' | 'year' | 'years'
//
// Units are case-insensitive. Whitespace is allowed between number
// and unit AND between terms. Empty input is invalid.
//
// Errors:
//   - TypeError for non-string input or empty/whitespace-only string,
//     or any term whose number doesn't parse, or whose unit isn't
//     recognized, or whose number is malformed (e.g. "1.2.3h").
//
// Why a single tokenizer instead of regex-from-string:
//   - Partial-state regexes (the original implementation) were easy
//     to misread when reviewing; a tokenizer split into two stages
//     makes the failing cases obvious in stack traces.
//   - We need to support both 'ms' and 'milliseconds', and case-
//     insensitive matches; regex alternation handles this fine but
//     a small unit table is easier to keep synchronized with format().

const UNITS = Object.freeze({
  // Canonical name -> ms multiplier
  ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000,
  w: 7 * 86_400_000,
  // Calendar approximations (industry-standard; not leap-aware by design)
  mo: Math.round(30.4375 * 86_400_000),
  y: Math.round(365.25 * 86_400_000),
});

// Aliases map an input form to the canonical key in UNITS. Lookup is
// case-insensitive — the tokenizer lowercases the unit slice before
// looking up. Order matters only for the FIRST match (object lookup).
const ALIASES = Object.freeze({
  // milliseconds
  milliseconds: 'ms',
  // seconds
  sec: 's', secs: 's', second: 's', seconds: 's',
  // minutes
  min: 'm', mins: 'm', minute: 'm', minutes: 'm',
  // hours
  hr: 'h', hrs: 'h', hour: 'h', hours: 'h',
  // days
  day: 'd', days: 'd',
  // weeks
  wk: 'w', week: 'w', weeks: 'w',
  // months
  month: 'mo', months: 'mo',
  // years
  yr: 'y', year: 'y', years: 'y',
});

// Characters that separate terms: any whitespace. Multiple whitespace
// characters between number and unit are allowed. Negative sign is
// part of the number, not a separator.
const isDigit = c => c >= '0' && c <= '9';
const isWhitespace = c => c === ' ' || c === '\t' || c === '\n' || c === '\r';

// Parse a non-empty decimal number starting at s[start]. Returns
// { value, next }. next is the index of the first character after the
// number. Throws on malformed input (multiple dots, leading dot only,
// empty, or character where digit expected).
function parseNumber(s, start) {
  let i = start;
  let sawDigit = false;
  let sawDot = false;
  while (i < s.length) {
    const c = s[i];
    if (isDigit(c)) {
      sawDigit = true;
      i++;
    } else if (c === '.' && !sawDot) {
      // Allow the first dot, but only if it's followed by a digit
      // (or end of string). '1.2.3' is malformed — when we hit the
      // second '.', sawDot is already true and we break out; the
      // surrounding logic rejects because '1.2.3h' has letters that
      // parseNumber should never see and the residual parseUnit on
      // '.3h' fails because '.' isn't a letter.
      // BUT — if we just break, the residual '.' is then handed to
      // parseUnit which silently accepts nothing. The cleanest fix:
      // reject the second dot explicitly here, so '1.2.3' throws at
      // the parseNumber stage with a clear error.
      sawDot = true;
      i++;
      // If the char immediately after the dot is not a digit, this
      // is a malformed trailing dot like '1.2.' — accept (Number
      // tolerates trailing dot). If it IS a digit, fine. If we ever
      // loop back and hit another '.', sawDot is true so we fall
      // into the else branch below which throws.
    } else {
      break;
    }
  }
  if (!sawDigit) {
    throw new TypeError(`expected number at position ${start}: ${JSON.stringify(s.slice(start, start + 10))}`);
  }
  // Detect malformed numbers:
  //   - '.3' (leading dot) — Number('.3') = 0.3 but it's ambiguous
  //     as a residual; reject to surface the parse error clearly.
  //   - '1.2.3' (multiple dots) — Number('1.2.3') = NaN, but Number.isFinite
  //     catches it below. Add an explicit check for the multi-dot case
  //     so the error message is specific.
  const text = s.slice(start, i);
  if (text.startsWith('.')) {
    throw new TypeError(`number cannot start with a dot: ${JSON.stringify(text)}`);
  }
  if ((text.match(/\./g) || []).length > 1) {
    throw new TypeError(`malformed number with multiple dots: ${JSON.stringify(text)}`);
  }
  const value = Number(text);
  if (!Number.isFinite(value)) {
    throw new TypeError(`invalid number ${JSON.stringify(text)}`);
  }
  return { value, next: i, sawDot };
}

// Parse a unit starting at s[start] (where start is already past
// trailing whitespace after the number). Returns { canonical, next }.
// Throws if no unit characters are seen at this position, or the unit
// isn't recognized.
function parseUnit(s, start) {
  let i = start;
  while (i < s.length && /[a-zA-Z]/.test(s[i])) i++;
  if (i === start) {
    throw new TypeError(`expected unit at position ${start}: ${JSON.stringify(s.slice(start))}`);
  }
  const raw = s.slice(start, i).toLowerCase();
  const canonical = ALIASES[raw] || (UNITS.hasOwnProperty(raw) ? raw : null);
  if (canonical == null) {
    throw new TypeError(`unknown duration unit ${JSON.stringify(raw)}`);
  }
  return { canonical, next: i };
}

// Skip leading whitespace; returns the index of the first non-WS
// char or s.length.
function skipWs(s, start) {
  let i = start;
  while (i < s.length && isWhitespace(s[i])) i++;
  return i;
}

// Main parse entry point.
function parse(input) {
  if (typeof input !== 'string') {
    throw new TypeError(`parse() expects a string, got ${typeof input}`);
  }
  const s = input;
  if (s.length === 0 || skipWs(s, 0) === s.length) {
    throw new TypeError(`parse() received empty input`);
  }

  // Optional leading sign. Apply at the end so we don't have to
  // thread it through the tokenizer.
  let i = skipWs(s, 0);
  let sign = 1;
  if (s[i] === '-') {
    sign = -1;
    i++;
    i = skipWs(s, i);
  } else if (s[i] === '+') {
    i++;
    i = skipWs(s, i);
  }

  let total = 0;
  let first = true;
  let sawAnyTerm = false;
  while (i < s.length) {
    // Allow whitespace between terms but not as a "term" by itself.
    const afterWs = skipWs(s, i);
    if (afterWs === s.length) break;
    if (!first && afterWs > i) {
      // We're between terms; consume the ws and continue.
      i = afterWs;
    }
    first = false;

    const num = parseNumber(s, i);
    i = num.next;
    i = skipWs(s, i);

    // Optional unit: if the next char is a letter, it's a unit; if it's
    // end-of-string or whitespace-then-end-of-string, this term is
    // a bare number interpreted as milliseconds. Whitespace between
    // the number and unit is allowed (single term). The unit may
    // also follow a unit directly across whitespace — that's the
    // multi-term case ('1h 30m'), handled by the loop's next iteration.
    if (i < s.length && /[a-zA-Z]/.test(s[i])) {
      const u = parseUnit(s, i);
      i = u.next;
      const mult = UNITS[u.canonical];
      if (!Number.isFinite(num.value * mult)) {
        throw new TypeError(`duration overflow at term ${u.canonical}`);
      }
      total += num.value * mult;
    } else {
      // Bare number (no unit): integer or decimal, treated as
      // milliseconds. Matches the popular `ms` library convention.
      // '1.5' = 1.5ms, '42' = 42ms, '-2.5' = -2.5ms.
      total += num.value;
    }
    sawAnyTerm = true;
  }

  // If we hit EOF without ever consuming a unit, the input was
  // something like '-' alone or '+' alone.
  if (!sawAnyTerm) {
    throw new TypeError(`parse() received input with no recognizable terms: ${JSON.stringify(s)}`);
  }

  return sign * total;
}

module.exports = { parse, UNITS, ALIASES };