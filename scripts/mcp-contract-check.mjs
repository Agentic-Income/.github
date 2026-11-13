#!/usr/bin/env node
/**
 * mcp-contract-check.mjs - Agentic Income MCP contract stability gate.
 *
 * org-surface-check and site-surface-check prove the live MCP server and its
 * manifest agree on tool NAMES. That does not catch a silent breaking change:
 * a tool whose required input changed, a property that was removed or retyped,
 * an enum value that disappeared. Those break every agent already calling the
 * server while the tool count stays the same.
 *
 * This gate snapshots every tool's name and input schema, and fails when the
 * live server drifts from the snapshot in a way that can break a caller.
 *
 * Breaking (FAIL, exit 1):
 *   - a tool was removed
 *   - an input property was removed or its type changed
 *   - an optional input became required, or a new required input appeared
 *   - an enum lost a value
 *   - additionalProperties went from permitted to forbidden
 * Compatible (WARN, exit 0):
 *   - a tool was added
 *   - a new optional input property was added
 *   - an enum gained a value
 *   - a tool description changed (descriptions steer agents, so review them)
 *
 * Contract:
 *   - Node built-ins only. No dependencies, no build step.
 *   - Anonymous read of the public tools/list endpoint. Never edits anything.
 *
 * Usage:
 *   node scripts/mcp-contract-check.mjs               check live against the snapshot
 *   node scripts/mcp-contract-check.mjs --write       accept the live contract as the new snapshot
 *   node scripts/mcp-contract-check.mjs --self-test   prove the diff logic with synthetic changes, no network
 *
 * The snapshot is an explicit human decision. A breaking change should land
 * together with a reviewed snapshot update, never silently.
 *
 * Provenance: authored 2026-11-13 for Agentic-Income/.github. Owned by @frankxai.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENDPOINT = 'https://www.agenticincome.ai/api/mcp';
const PROTOCOL_VERSION = '2025-06-18';
const HERE = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(HERE, '..', 'contracts', 'agenticincome-mcp.snapshot.json');
const TIMEOUT_MS = 20000;

function sha(text) {
  return createHash('sha256').update(String(text)).digest('hex').slice(0, 16);
}

/** Canonical form: object keys sorted, so key order never reads as a change. */
function canonical(value) {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonical(value[key]);
    }
    return out;
  }
  return value;
}

function typeOf(schema) {
  if (!schema || typeof schema !== 'object') {
    return 'unknown';
  }
  if (Array.isArray(schema.type)) {
    return schema.type.slice().sort().join('|');
  }
  return schema.type || (schema.enum ? 'enum' : schema.anyOf ? 'anyOf' : schema.oneOf ? 'oneOf' : 'unknown');
}

function toSnapshot(tools) {
  const out = {};
  for (const tool of tools) {
    out[tool.name] = {
      descriptionSha: sha(tool.description || ''),
      inputSchema: canonical(tool.inputSchema || { type: 'object', properties: {} }),
    };
  }
  return out;
}

/**
 * Compare two schemas at a path. Pushes human-readable messages onto
 * `breaking` and `compatible`. Recurses through object properties and array items.
 */
function diffSchema(path, before, after, breaking, compatible) {
  if (typeOf(before) !== typeOf(after)) {
    breaking.push(path + ': type changed ' + typeOf(before) + ' to ' + typeOf(after));
    return;
  }

  const beforeEnum = Array.isArray(before.enum) ? before.enum : null;
  const afterEnum = Array.isArray(after.enum) ? after.enum : null;
  if (beforeEnum && afterEnum) {
    const lost = beforeEnum.filter(function (v) { return afterEnum.indexOf(v) === -1; });
    const gained = afterEnum.filter(function (v) { return beforeEnum.indexOf(v) === -1; });
    if (lost.length) {
      breaking.push(path + ': enum lost ' + JSON.stringify(lost));
    }
    if (gained.length) {
      compatible.push(path + ': enum gained ' + JSON.stringify(gained));
    }
  } else if (beforeEnum && !afterEnum) {
    compatible.push(path + ': enum constraint removed (more permissive)');
  } else if (!beforeEnum && afterEnum) {
    breaking.push(path + ': new enum constraint ' + JSON.stringify(afterEnum));
  }

  if (before.additionalProperties !== false && after.additionalProperties === false) {
    breaking.push(path + ': additionalProperties now forbidden');
  }

  if (typeOf(before) === 'array' && before.items && after.items) {
    diffSchema(path + '[]', before.items, after.items, breaking, compatible);
  }

  const beforeProps = before.properties || {};
  const afterProps = after.properties || {};
  const beforeRequired = Array.isArray(before.required) ? before.required : [];
  const afterRequired = Array.isArray(after.required) ? after.required : [];

  for (const name of Object.keys(beforeProps)) {
    if (!(name in afterProps)) {
      breaking.push(path + '.' + name + ': property removed');
      continue;
    }
    diffSchema(path + '.' + name, beforeProps[name], afterProps[name], breaking, compatible);
  }
  for (const name of Object.keys(afterProps)) {
    if (!(name in beforeProps)) {
      if (afterRequired.indexOf(name) !== -1) {
        breaking.push(path + '.' + name + ': new REQUIRED property');
      } else {
        compatible.push(path + '.' + name + ': new optional property');
      }
    }
  }
  for (const name of afterRequired) {
    if (name in beforeProps && beforeRequired.indexOf(name) === -1) {
      breaking.push(path + '.' + name + ': optional became required');
    }
  }
  for (const name of beforeRequired) {
    if (afterRequired.indexOf(name) === -1 && name in afterProps) {
      compatible.push(path + '.' + name + ': required relaxed to optional');
    }
  }
}

function diffContracts(snapshot, live) {
  const breaking = [];
  const compatible = [];
  for (const name of Object.keys(snapshot)) {
    if (!(name in live)) {
      breaking.push(name + ': tool removed');
      continue;
    }
    diffSchema(name, snapshot[name].inputSchema, live[name].inputSchema, breaking, compatible);
    if (snapshot[name].descriptionSha !== live[name].descriptionSha) {
      compatible.push(name + ': description changed (review how agents will read it)');
    }
  }
  for (const name of Object.keys(live)) {
    if (!(name in snapshot)) {
      compatible.push(name + ': tool added');
    }
  }
  return { breaking: breaking, compatible: compatible };
}

function parseToolsResponse(text) {
  const trimmed = text.trim();
  let body = trimmed;
  if (!trimmed.startsWith('{')) {
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('data:')) {
        body = line.slice(5).trim();
        break;
      }
    }
  }
  const parsed = JSON.parse(body);
  if (!parsed.result || !Array.isArray(parsed.result.tools)) {
    throw new Error('no result.tools array in tools/list response');
  }
  return parsed.result.tools;
}

async function fetchLive() {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': PROTOCOL_VERSION,
        'user-agent': 'agentic-income-mcp-contract-check',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return toSnapshot(parseToolsResponse(await response.text()));
  } finally {
    clearTimeout(timer);
  }
}

/** Synthetic proof that each class of change is classified correctly. No network. */
function selfTest() {
  const base = {
    tool_a: {
      descriptionSha: 'x',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' }, mode: { type: 'string', enum: ['a', 'b'] }, n: { type: 'number' } },
        required: ['id'],
      },
    },
  };
  function mutate(fn) {
    const copy = JSON.parse(JSON.stringify(base));
    fn(copy.tool_a);
    return copy;
  }
  const cases = [
    ['identical contract', mutate(function () {}), 0, 0],
    ['tool removed', {}, 1, 0],
    ['property removed', mutate(function (t) { delete t.inputSchema.properties.n; }), 1, 0],
    ['type changed', mutate(function (t) { t.inputSchema.properties.n.type = 'string'; }), 1, 0],
    ['optional became required', mutate(function (t) { t.inputSchema.required.push('n'); }), 1, 0],
    ['new required property', mutate(function (t) { t.inputSchema.properties.z = { type: 'string' }; t.inputSchema.required.push('z'); }), 1, 0],
    ['enum lost a value', mutate(function (t) { t.inputSchema.properties.mode.enum = ['a']; }), 1, 0],
    ['additionalProperties forbidden', mutate(function (t) { t.inputSchema.additionalProperties = false; }), 1, 0],
    ['new optional property', mutate(function (t) { t.inputSchema.properties.z = { type: 'string' }; }), 0, 1],
    ['enum gained a value', mutate(function (t) { t.inputSchema.properties.mode.enum = ['a', 'b', 'c']; }), 0, 1],
    ['description changed', mutate(function (t) { t.descriptionSha = 'y'; }), 0, 1],
    ['tool added', Object.assign(JSON.parse(JSON.stringify(base)), { tool_b: { descriptionSha: 'q', inputSchema: { type: 'object', properties: {} } } }), 0, 1],
  ];
  let failed = 0;
  console.log('## MCP contract diff self-test\n');
  console.log('| Case | Breaking | Compatible | Result |');
  console.log('| :--- | ---: | ---: | :--- |');
  for (const c of cases) {
    const result = diffContracts(base, c[1]);
    const ok = result.breaking.length === c[2] && result.compatible.length === c[3];
    if (!ok) {
      failed += 1;
    }
    console.log('| ' + c[0] + ' | ' + result.breaking.length + ' | ' + result.compatible.length + ' | ' + (ok ? 'pass' : 'FAIL expected ' + c[2] + '/' + c[3]) + ' |');
  }
  console.log('\n' + (failed === 0 ? '**Self-test clean.** ' + cases.length + ' of ' + cases.length + ' classifications correct.' : '**Self-test FAILED:** ' + failed + ' wrong.'));
  return failed === 0 ? 0 : 1;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.indexOf('--self-test') !== -1) {
    return selfTest();
  }

  let live;
  try {
    live = await fetchLive();
  } catch (error) {
    console.log('## MCP contract check\n\n**FAIL** cannot read live tools/list from ' + ENDPOINT + ': ' + error.message);
    return 1;
  }

  if (args.indexOf('--write') !== -1) {
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, JSON.stringify({ endpoint: ENDPOINT, protocolVersion: PROTOCOL_VERSION, tools: live }, null, 2) + '\n');
    console.log('Snapshot written: ' + Object.keys(live).length + ' tools to ' + SNAPSHOT_PATH);
    return 0;
  }

  if (!existsSync(SNAPSHOT_PATH)) {
    console.log('## MCP contract check\n\n**FAIL** no snapshot at contracts/agenticincome-mcp.snapshot.json. Review the live contract, then run with --write.');
    return 1;
  }
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')).tools;
  const result = diffContracts(snapshot, live);

  console.log('## MCP contract check\n');
  console.log(Object.keys(snapshot).length + ' tools in snapshot, ' + Object.keys(live).length + ' live. Breaking: ' + result.breaking.length + ' / compatible changes: ' + result.compatible.length + '\n');
  for (const line of result.breaking) {
    console.log('- **BREAKING** ' + line);
  }
  for (const line of result.compatible) {
    console.log('- warn ' + line);
  }
  if (result.breaking.length === 0 && result.compatible.length === 0) {
    console.log('**Gate clean.** Live contract is identical to the snapshot.');
  } else if (result.breaking.length === 0) {
    console.log('\n**Compatible drift.** Review, then run with --write to accept.');
  } else {
    console.log('\n**Contract broken.** Fix the server or land a reviewed snapshot update with the change.');
  }
  return result.breaking.length === 0 ? 0 : 1;
}

// Set exitCode and let the event loop drain. Calling process.exit() while a fetch
// socket is still closing aborts Node on Windows (libuv UV_HANDLE_CLOSING).
main().then(
  function (code) { process.exitCode = code; },
  function (error) { console.error(error); process.exitCode = 1; },
);
