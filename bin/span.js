#!/usr/bin/env node
'use strict';
const { parse, format } = require('..');

function err(msg, code = 1) {
  process.stderr.write(`span: ${msg}\n`);
  process.exit(code);
}

const argv = process.argv.slice(2);
if (argv.includes('--help')) {
  process.stdout.write(`Usage: span <duration>           Parse a human duration to milliseconds
       span -f <milliseconds>    Format milliseconds as a human duration
       span --version           Print version
       span --help              Print this help

Examples:
  span 1h30m           → 5400000
  span -f 5400000      → 1h30m
  span -f 1500 -d 1    → 1.5s
`);
  process.exit(0);
}
if (argv.includes('--version')) {
  process.stdout.write(`${require('../package.json').version}\n`);
  process.exit(0);
}

const formatFlag = argv.indexOf('-f') !== -1 || argv.indexOf('--format') !== -1;
const fIdx = formatFlag ? (argv.indexOf('-f') !== -1 ? argv.indexOf('-f') : argv.indexOf('--format')) : -1;
let decimals = 0;
const dIdx = argv.indexOf('-d');
if (dIdx !== -1) {
  const v = argv[dIdx + 1];
  if (v === undefined) err('-d requires a number');
  decimals = parseInt(v, 10);
  if (!Number.isFinite(decimals) || decimals < 0) err('-d requires a non-negative integer');
}

if (formatFlag) {
  const v = argv[fIdx + 1];
  if (v === undefined) err('-f requires a millisecond value');
  const ms = parseInt(v, 10);
  if (!Number.isFinite(ms) || ms < 0) err(`not a valid millisecond value: ${v}`);
  process.stdout.write(`${format(ms, { decimals })}\n`);
  process.exit(0);
}

if (argv.length === 0) err('no input; pass a duration like 1h30m or use -f <ms>');
const input = argv.join(' ');
try {
  const ms = parse(input);
  process.stdout.write(`${ms}\n`);
} catch (e) {
  err(e.message);
}
