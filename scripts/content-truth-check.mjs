#!/usr/bin/env node
/**
 * content-truth-check.mjs - Agentic Income claim-integrity gate.
 *
 * The brand promise is: no income promises, every number sourced. The other
 * gates prove surfaces exist and agree with themselves. None of them reads the
 * words. This gate does, for the two things that would damage trust fastest:
 *
 *   HARD (FAIL, exit 1) - a promise a reader could rely on to make money:
 *     guaranteed income, returns or results; "earn $N" style figures; get-rich,
 *     risk-free, financial-freedom and quit-your-job language; "trusted by N"
 *     social proof that nothing here can substantiate.
 *   SOFT (WARN, exit 0) - a number with no visible source nearby:
 *     a percentage or a currency amount in a sentence with no link, no
 *     "source" / "according to" / "as of" marker, and no date.
 *
 * A sentence that negates the pattern is allowed, because explaining what the
 * project does NOT promise is the point ("no guaranteed income", "never claims
 * earnings"). A line may opt out with a trailing marker and a reason:
 *     <!-- truth-ok: quoted from the cited statute -->
 * The marker is counted and printed, so exceptions stay visible.
 *
 * Scope: markdown and llms.txt in this repository, plus the visible text and
 * llms.txt of the three live product sites. Public reads only. Never edits.
 *
 * Contract:
 *   - Node built-ins only. No dependencies, no build step.
 *
 * Usage:
 *   node scripts/content-truth-check.mjs              repo files and live sites
 *   node scripts/content-truth-check.mjs --offline    repo files only
 *   node scripts/content-truth-check.mjs --self-test  prove the classifier on fixtures, no network
 *
 * Provenance: authored 2026-11-13 for Agentic-Income/.github. Owned by @frankxai.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const TIMEOUT_MS = 20000;
const MAX_SOFT_PRINTED = 25;

const SITES = [
  'https://www.agenticincome.ai',
  'https://www.agenticpassiveincome.com',
  'https://geninvestor-research.vercel.app',
];

const CURRENCY = '(?:\\$|\\u20ac|\\u00a3|USD\\s?|EUR\\s?)';

const HARD_PATTERNS = [
  { id: 'guarantee', re: /\bguarantee[sd]?\s+(?:\w+\s+){0,2}(?:income|revenue|returns?|profits?|results?|savings|roi|earnings)\b/i },
  { id: 'guaranteed-adjective', re: /\bguaranteed\s+(?:income|revenue|returns?|profits?|results?|savings|roi|earnings|success)\b/i },
  { id: 'earn-figure', re: new RegExp('\\b(?:earn|earns|earned|make|makes|made|generate|generates|generated)\\s+(?:up to\\s+|over\\s+|\\$?\\s?)?' + CURRENCY + '\\s?\\d[\\d,.]*\\s?[kKmM]?(?:\\s*(?:\\/|per|a|each)\\s*(?:day|week|month|mo|year|yr))?', 'i') },
  { id: 'per-period-income', re: new RegExp(CURRENCY + '\\s?\\d[\\d,.]*\\s?[kKmM]?\\s*(?:\\/|per|a)\\s*(?:day|week|month|mo)\\s+(?:in\\s+)?(?:passive\\s+)?(?:income|revenue|profit)', 'i') },
  { id: 'get-rich', re: /\bget[- ]rich\b|\bmake money (?:fast|while you sleep)\b|\bearn (?:money )?while you sleep\b/i },
  { id: 'risk-free', re: /\brisk[- ]free\b|\bno[- ]risk\b|\bcannot lose\b|\bsure thing\b/i },
  { id: 'financial-freedom', re: /\bfinancial (?:freedom|independence) (?:in|within|by|guaranteed)\b|\bquit your (?:9[- ]?to[- ]?5|job)\b|\bretire (?:early|in)\b/i },
  { id: 'social-proof-count', re: /\btrusted by\s+[\d,]+\+?\b|\bjoin\s+[\d,]+\+?\s+(?:creators|operators|users|members|founders)\b/i },
];

const SOFT_NUMBER = new RegExp('\\b\\d{1,3}(?:\\.\\d+)?\\s?%|' + CURRENCY + '\\s?\\d[\\d,.]*\\s?[kKmM]?\\b', 'i');
const NEGATION = /\b(?:no|not|never|without|none|nor|neither|don'?t|doesn'?t|do not|does not|won'?t|cannot|can'?t|isn'?t|aren'?t|avoid|avoids|refuse|refuses|prohibit|prohibited|forbid|forbidden|stop|stops|ban|banned|zero|nothing)\b/i;
const SOURCE_MARKER = /https?:\/\/|\]\(|\bsource[sd]?\b|\baccording to\b|\bas of\b|\b(?:19|20)\d{2}\b|\bfootnote\b|\bcite[sd]?\b|\bconfirmed\b|\bpublished\b/i;
const OPT_OUT = /<!--\s*truth-ok:\s*(.+?)\s*-->/i;

/** Split a block of text into sentence-like units, keeping line numbers. */
function sentences(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      continue;
    }
    const optOut = line.match(OPT_OUT);
    const clean = line.replace(OPT_OUT, '');
    const parts = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9"'`(\[])/);
    for (const part of parts) {
      if (part.trim()) {
        out.push({ line: i + 1, text: part.trim(), optOut: optOut ? optOut[1] : null });
      }
    }
  }
  return out;
}

/** Classify one unit of text. Pure function: this is what the self-test exercises. */
function classify(text) {
  const findings = [];
  const negated = NEGATION.test(text);
  for (const pattern of HARD_PATTERNS) {
    const match = text.match(pattern.re);
    if (match && !negated) {
      findings.push({ level: 'hard', id: pattern.id, evidence: match[0] });
      break;
    }
  }
  if (findings.length === 0 && SOFT_NUMBER.test(text) && !SOURCE_MARKER.test(text) && !negated) {
    const match = text.match(SOFT_NUMBER);
    findings.push({ level: 'soft', id: 'unsourced-number', evidence: match[0] });
  }
  return findings;
}

// Design specifications state layout percentages, not factual claims. Hard promise
// patterns still apply to them; only the unsourced-number warning is skipped.
const SOFT_SKIP = ['VISUAL-SYSTEM.md'];

function scanText(label, text, tally) {
  for (const unit of sentences(text)) {
    for (const finding of classify(unit.text)) {
      if (finding.level === 'soft' && SOFT_SKIP.indexOf(label) !== -1) {
        continue;
      }
      if (unit.optOut) {
        tally.optOuts.push({ file: label, line: unit.line, reason: unit.optOut, id: finding.id });
        continue;
      }
      const record = { file: label, line: unit.line, id: finding.id, evidence: finding.evidence, text: unit.text.slice(0, 140) };
      if (finding.level === 'hard') {
        tally.hard.push(record);
      } else {
        tally.soft.push(record);
      }
    }
  }
}

function repoFiles() {
  const found = [];
  const skip = new Set(['.git', 'node_modules', 'assets', 'contracts', 'scripts']);
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (!skip.has(entry)) {
          walk(full);
        }
      } else if (/\.(md|txt)$/i.test(entry)) {
        found.push(full);
      }
    }
  }
  walk(ROOT);
  return found.sort();
}

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, ' $1 ')
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|section|article|tr|br)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ');
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'agentic-income-content-truth-check' } });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function selfTest() {
  const mustFail = [
    'Our system gives you guaranteed income from day one.',
    'Operators earn $5,000 per month with this playbook.',
    'You can make $10k a month while you sleep.',
    'It is a completely risk-free way to start.',
    'Join 12,000 creators building agentic income.',
    'Reach financial freedom in 12 months.',
    'This is the way to get rich with agents.',
    'We guarantee results for every operator.',
    'Expect $2,000/mo in passive income.',
  ];
  const mustPass = [
    'There are no income promises on this site.',
    'We never claim guaranteed income or earnings.',
    'Results are not guaranteed and most operators earn nothing at first.',
    'The MCP server exposes 16 tools.',
    'This project does not promise that you will earn money.',
    'Retention improved 12% (source: https://example.org/report, 2026).',
    'Zero spend. Zero promises about earnings.',
    'Price: see the pricing page.',
  ];
  const mustWarn = [
    'Conversion rose by 34% after the redesign.',
    'The affiliate program pays $50 per signup.',
  ];
  let failed = 0;
  console.log('## Content-truth classifier self-test\n');
  console.log('| Expectation | Sentence | Result |');
  console.log('| :--- | :--- | :--- |');
  function row(expect, text, ok) {
    if (!ok) {
      failed += 1;
    }
    console.log('| ' + expect + ' | ' + text.slice(0, 62).replace(/\|/g, '/') + ' | ' + (ok ? 'pass' : 'FAIL') + ' |');
  }
  for (const text of mustFail) {
    const hits = classify(text);
    row('HARD', text, hits.length > 0 && hits[0].level === 'hard');
  }
  for (const text of mustPass) {
    row('clean', text, classify(text).length === 0);
  }
  for (const text of mustWarn) {
    const hits = classify(text);
    row('WARN', text, hits.length > 0 && hits[0].level === 'soft');
  }
  const optOutTally = { hard: [], soft: [], optOuts: [] };
  scanText('fixture', 'Operators earn $5,000 per month. <!-- truth-ok: quoted from a cited study -->', optOutTally);
  row('opt-out counted', 'line with a truth-ok marker', optOutTally.hard.length === 0 && optOutTally.optOuts.length === 1);
  const total = mustFail.length + mustPass.length + mustWarn.length + 1;
  console.log('\n' + (failed === 0 ? '**Self-test clean.** ' + total + ' of ' + total + ' fixtures classified correctly.' : '**Self-test FAILED:** ' + failed + ' of ' + total + ' wrong.'));
  return failed === 0 ? 0 : 1;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.indexOf('--self-test') !== -1) {
    return selfTest();
  }

  const tally = { hard: [], soft: [], optOuts: [] };
  const scanned = [];

  for (const file of repoFiles()) {
    scanText(relative(ROOT, file).replace(/\\/g, '/'), readFileSync(file, 'utf8'), tally);
    scanned.push(relative(ROOT, file).replace(/\\/g, '/'));
  }

  const unreachable = [];
  if (args.indexOf('--offline') === -1) {
    for (const origin of SITES) {
      for (const path of ['/', '/llms.txt']) {
        const label = origin.replace('https://', '') + path;
        try {
          const body = await fetchText(origin + path);
          scanText(label, path === '/' ? visibleText(body) : body, tally);
          scanned.push(label);
        } catch (error) {
          unreachable.push(label + ' (' + error.message + ')');
        }
      }
    }
  }

  console.log('## Content-truth check\n');
  console.log('Scanned ' + scanned.length + ' sources. Hard: ' + tally.hard.length + ' / soft: ' + tally.soft.length + ' / explicit opt-outs: ' + tally.optOuts.length + (unreachable.length ? ' / unreachable: ' + unreachable.length : '') + '\n');

  for (const item of tally.hard) {
    console.log('- **FAIL** `' + item.file + ':' + item.line + '` [' + item.id + '] "' + item.evidence + '" in: ' + item.text);
  }
  for (const item of tally.soft.slice(0, MAX_SOFT_PRINTED)) {
    console.log('- warn `' + item.file + ':' + item.line + '` [' + item.id + '] "' + item.evidence + '" has no visible source: ' + item.text);
  }
  if (tally.soft.length > MAX_SOFT_PRINTED) {
    console.log('- warn ... and ' + (tally.soft.length - MAX_SOFT_PRINTED) + ' more unsourced numbers');
  }
  for (const item of tally.optOuts) {
    console.log('- opt-out `' + item.file + ':' + item.line + '` [' + item.id + '] reason: ' + item.reason);
  }
  for (const item of unreachable) {
    console.log('- warn could not read ' + item);
  }

  if (tally.hard.length === 0) {
    console.log('\n**Gate clean.** No income promise or unsubstantiated social proof found' + (tally.soft.length ? '; ' + tally.soft.length + ' numbers still need a visible source.' : '.'));
    return 0;
  }
  console.log('\n**Gate failed.** ' + tally.hard.length + ' promise(s) a reader could rely on. Remove them, qualify them, or opt out with a stated reason.');
  return 1;
}

main().then(
  function (code) { process.exitCode = code; },
  function (error) { console.error(error); process.exitCode = 1; },
);
