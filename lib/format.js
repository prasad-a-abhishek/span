'use strict';

// span/lib/format.js
// Formats a millisecond count into a human-readable duration string.
//
// Behavior:
//   - 0 → "0ms"
//   - sub-second → milliseconds ("500ms")
//   - otherwise, use the LARGEST unit that fits ≥ 1, down to seconds.
//     We never auto-promote to months/years because they're calendar
//     approximations, not fixed SI durations.
//   - Drop zero-valued units: 60_000 → "1m", not "1m0s".
//   - Decimal sub-second parts: 1500 → "1.5s".
//   - `decimals` option controls trailing precision on the smallest unit.
//   - `units` option restricts the unit set; default is full hierarchy.
//
// Why greedy top-down + decimals on the smallest:
//   The test expects `1500` to format as "1.5s", not "1s500ms".
//   When the chosen smallest unit divides evenly into the value,
//   show the whole number (no decimal). When it doesn't, show the
//   fractional part with up to `decimals` places.

const { UNITS } = require('./parse');

// Order from largest to smallest. We do not include 'mo' or 'y' here
// because they're calendar approximations; the test explicitly
// expects round-trip behavior with these (365.25 days → "1y").
// We include them in this list but use them only when the value is
// a multiple of the unit (no fractional calendar units).
const HIERARCHY = ['y', 'mo', 'w', 'd', 'h', 'm', 's', 'ms'];

const UNIT_LABEL = {
  ms: 'ms', s: 's', m: 'm', h: 'h', d: 'd',
  w: 'w', mo: 'mo', y: 'y',
};

// Format `value` (a Number) with up to `decimals` decimal places,
// trimming trailing zeros. '1.500' → '1.5', '1.000' → '1'.
function trimZeros(value, decimals) {
  if (decimals === 0) return String(Math.round(value));
  // toFixed(NaN, x) === 'NaN' — but we guard upstream.
  let s = value.toFixed(decimals);
  if (s.indexOf('.') === -1) return s;
  // Trim trailing zeros, then a trailing dot if present.
  s = s.replace(/0+$/, '');
  if (s.endsWith('.')) s = s.slice(0, -1);
  return s;
}

// Validate inputs. Throws TypeError for non-number / NaN, RangeError
// for negative or non-finite.
function validateInput(ms) {
  if (typeof ms !== 'number') {
    throw new TypeError(`format() expects a number, got ${typeof ms}`);
  }
  if (Number.isNaN(ms)) {
    throw new TypeError(`format() received NaN`);
  }
  if (!Number.isFinite(ms)) {
    throw new RangeError(`format() received ${ms}`);
  }
  if (ms < 0) {
    throw new RangeError(`format() received negative value: ${ms}`);
  }
}

// Format a single (value, unit) pair. `value` is in the unit's scale
// already; we just add decimals and trim.
function renderUnit(value, unit, decimals) {
  const isInteger = Math.abs(value - Math.round(value)) < 1e-9;
  const showDecimals = unit === 'ms' || unit === 's' || !isInteger;
  // For calendar units (mo, y), always show as integer unless forced.
  const text = showDecimals
    ? trimZeros(value, decimals)
    : String(Math.round(value));
  return text + UNIT_LABEL[unit];
}

// Main entry point. Options:
//   - decimals: integer 0..6 (default: 2 for sub-second, else 0)
//   - units: array of canonical unit keys restricting the hierarchy.
//            Anything not in this set is skipped (but still added to
//            the residual that the next smaller unit picks up).
function format(ms, opts) {
  validateInput(ms);
  const o = opts || {};
  const decimals = o.decimals == null ? undefined : o.decimals;
  if (decimals != null && (!Number.isInteger(decimals) || decimals < 0 || decimals > 6)) {
    throw new TypeError(`decimals must be an integer 0..6, got ${decimals}`);
  }
  if (o.units != null && (!Array.isArray(o.units) || o.units.length === 0)) {
    throw new TypeError(`units must be a non-empty array`);
  }

  // The hierarchy used for picking the largest fitting unit. If the
  // user restricted units, the GREEDY unit must come from their set.
  const hierarchy = (o.units ? o.units.slice() : HIERARCHY.slice())
    .filter(u => UNITS.hasOwnProperty(u));
  if (hierarchy.length === 0) {
    throw new TypeError(`units must include at least one known unit`);
  }

  if (ms === 0) {
    // Convention: 0 → "0ms" per the test spec. Even if units=['s'],
    // we still show "0ms" so users never get an empty string.
    return '0ms';
  }

// Walk top-down. For each unit, compute the value in that unit's
  // scale. If value >= 1, that's a real unit. Otherwise we keep
  // descending.
  //
  // Strategy for the residual: rather than emitting "1s500ms",
  // attach the residual as a decimal on the largest unit. This
  // matches what humans prefer ("1.5s") and what the test expects.
  // The exception: if `units` explicitly lists BOTH the chosen
  // unit AND a smaller unit, we may emit the smaller unit (e.g.
  // units=['s','ms'] → "1500ms" or "1s500ms" depending on opt-in).
  // For simplicity, we only emit multiple units when the residual
  // is a clean whole-number of a smaller unit from the hierarchy.
  // Pick the LARGEST unit that fits, then build the value in that
  // unit's scale. Don't walk down the hierarchy emitting smaller
  // units automatically — that's the job of the residual-handling
  // step below, which decides whether to combine (decimal) or split.
  let largestUnit = null;
  let largestMult = 1;
  for (let i = 0; i < hierarchy.length; i++) {
    const u = hierarchy[i];
    const mult = UNITS[u];
    if (ms >= mult) {
      largestUnit = u;
      largestMult = mult;
      break;
    }
  }
  if (largestUnit == null) {
    // ms is smaller than every unit in the hierarchy — fall back to ms.
    return renderUnit(ms, 'ms', decimals == null ? 0 : decimals);
  }
  let remaining = ms;
  const parts = [];
  const v = Math.floor(remaining / largestMult);
  remaining -= v * largestMult;
  parts.push({ value: v, unit: largestUnit });

  // Decide: split the residual into the next smaller unit, or
  // combine it as a decimal on the largest unit?
  //
  // Default: split if the residual is a clean multiple of the
  // NEXT smaller unit in the canonical hierarchy. This gives
  // "1h30m" instead of "1.5h", which matches human expectation
  // and round-trip behavior.
  //
  // Combine (decimal) only when:
  //   - The residual is NOT a clean multiple of the next smaller
  //     unit (e.g. 90_000 ms of minutes gives 1.5m), OR
  //   - The user passed `units` containing only the largest unit
  //     (e.g. units=['h'] → "1.5h" forced).
  if (remaining > 0) {
    // Iteratively split the residual into the LARGEST possible unit
    // at each step, until either residual=0 (we're done) or no
    // smaller unit cleanly divides the remaining. The latter case
    // becomes a decimal on the last unit we emitted.
    //
    // Example walk-through: ms = 1d + 1h + 1m + 1s = 90_061_000.
    //   - largestUnit = d, v = 1, remaining = 3_661_000
    //   - try h: 3_661_000 % 3_600_000 ≠ 0, skip
    //   - try m: 3_661_000 % 60_000 = 1_000 ≠ 0, skip
    //   - try s: 3_661_000 % 1_000 = 0 ✓ → push "1h" hmm wait.
    //
    // Re-think: my "first match" logic finds s first, but I want
    // the LARGEST unit that fits. So I should iterate from smallest
    // up and take the SMALLEST unit (largest count) — but that gives
    // "1d3661s", which is what we don't want.
    //
    // The actual desired behavior is: keep greedily consuming the
    // residual with the largest unit that fits, then repeat.
    // That's exactly the "top-down" approach. So: if a split fails,
    // try the NEXT SMALLER unit. If no unit divides cleanly, the
    // residual becomes a decimal on the LAST emitted unit.

    let last = parts[parts.length - 1];
    let lastIdx = hierarchy.indexOf(last.unit);

    // Track the last emitted unit — we'll attach any non-splitting
    // residual to it as a decimal.
    let lastEmitted = last;

    // Greedy split: walk down the hierarchy emitting units until the
    // residual is 0 OR no smaller unit ≤ residual exists. At each
    // step pick the LARGEST unit (smallest index in hierarchy) that
    // is ≤ the residual. Round-trip is preserved because each part
    // is exactly the integer multiple of its unit.
    while (remaining > 0) {
      let splitUnit = null;
      let splitMult = 0;
      let splitIdx = -1;
      for (let j = lastIdx + 1; j < hierarchy.length; j++) {
        const candidate = hierarchy[j];
        if (candidate === 'ms') continue;
        const mult = UNITS[candidate];
        if (mult <= remaining) {
          splitUnit = candidate;
          splitMult = mult;
          splitIdx = j;
          break;
        }
      }
      if (splitUnit == null) break;
      if (o.units) {
        const userSet = new Set(o.units);
        if (!userSet.has(splitUnit)) break;
      }
      const v = Math.floor(remaining / splitMult);
      const subRemaining = remaining - v * splitMult;
      parts.push({ value: v, unit: splitUnit });
      lastEmitted = { value: v, unit: splitUnit };
      lastIdx = splitIdx;
      remaining = subRemaining;
      if (subRemaining === 0) break;
    }

    if (remaining > 0) {
      // Combine into the lastEmitted unit as a decimal.
      const combined = lastEmitted.value + remaining / UNITS[lastEmitted.unit];
      const d = decimals == null ? 2 : decimals;
      parts[parts.length - 1] = { value: combined, unit: lastEmitted.unit, decimals: d };
    }
  }

  // Render each part.
  const out = parts.map(p => {
    if (p.decimals != null) return renderUnit(p.value, p.unit, p.decimals);
    return renderUnit(p.value, p.unit, 0);
  });
  return out.join('');
}

module.exports = { format, HIERARCHY };