#!/usr/bin/env node
/**
 * org-surface-check.mjs — Agentic Income organization surface gate.
 *
 * Verifies the public, externally observable surface of the organization:
 * the profile README, the assets it embeds, the metadata of every public
 * repository, the llms.txt discovery surface, and the live MCP contract.
 *
 * Contract:
 *   - Node built-ins only. No dependencies, no build step.
 *   - Public endpoints only. GITHUB_TOKEN, when present in the CI environment,
 *     is used to raise the REST rate limit; absent, the run degrades to
 *     anonymous reads rather than failing.
 *   - Hard failures exit 1. Soft gaps warn and exit 0.
 *
 * Usage:
 *   node scripts/org-surface-check.mjs
 *
 * Provenance: authored 2026-11-13 for Agentic-Income/.github. Owned by @frankxai.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ORG = 'Agentic-Income';
const SELF_REPO = '.github';
const PROFILE_PATH = 'profile/README.md';

const MCP_MANIFEST = 'https://www.agenticincome.ai/.well-known/mcp.json';
const MCP_ENDPOINT = 'https://www.agenticincome.ai/api/mcp';

const MIN_TOPICS = 3;
const MIN_PROFILE_BYTES = 500;
const FETCH_TIMEOUT_MS = 25_000;
const RAW_HOST = 'raw.githubusercontent.com';
const PLACEHOLDER_PATTERN = /\b(?:TODO|TBD|FIXME|lorem)\b/i;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @type {{check: string, scope: string, status: 'PASS'|'FAIL'|'WARN', detail: string}[]} */
const rows = [];

const record = (check, scope, status, detail) => {
  rows.push({ check, scope, status, detail });
  return status;
};

const truncate = (text, max = 96) => {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

const authHeaders = () => {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'agentic-income-org-surface-check',
    'x-github-api-version': '2022-11-28',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
};

const get = async (url, options = {}) => {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'user-agent': 'agentic-income-org-surface-check', ...(options.headers || {}) },
    ...options,
  });
  return response;
};

/* ------------------------------------------------------------------ *
 * 1. Profile README present and substantive
 * ------------------------------------------------------------------ */

const profileFile = join(ROOT, PROFILE_PATH);

const checkProfilePresent = () => {
  if (!existsSync(profileFile)) {
    record('Profile README', PROFILE_PATH, 'FAIL', 'file is missing');
    return null;
  }

  const text = readFileSync(profileFile, 'utf8');
  const bytes = Buffer.byteLength(text, 'utf8');

  if (bytes < MIN_PROFILE_BYTES) {
    record('Profile README', PROFILE_PATH, 'FAIL', `${bytes} bytes, below the ${MIN_PROFILE_BYTES} byte floor`);
  } else {
    record('Profile README', PROFILE_PATH, 'PASS', `${bytes} bytes, present`);
  }
  return text;
};

/* ------------------------------------------------------------------ *
 * 2. Every raw.githubusercontent.com image URL resolves, and points
 *    at a file that exists on this branch
 * ------------------------------------------------------------------ */

const extractImageUrls = (text) => {
  const found = new Set();
  const markdown = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  const html = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
  for (const pattern of [markdown, html]) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1].includes(RAW_HOST)) found.add(match[1]);
    }
  }
  return [...found];
};

const checkImageUrls = async (text) => {
  const urls = extractImageUrls(text);
  if (urls.length === 0) {
    record('Profile images', PROFILE_PATH, 'FAIL', 'no raw.githubusercontent.com image URLs found');
    return;
  }

  for (const url of urls) {
    let status;
    try {
      const response = await get(url);
      status = response.status;
    } catch (error) {
      record('Profile images', truncate(url, 88), 'FAIL', `request failed: ${error.message}`);
      continue;
    }

    if (status !== 200) {
      record('Profile images', truncate(url, 88), 'FAIL', `HTTP ${status}`);
      continue;
    }

    // Resolve the local path when the URL targets this repository on main,
    // so a 200 from a stale copy elsewhere cannot mask a missing file.
    const selfPrefix = `${RAW_HOST}/${ORG}/${SELF_REPO}/main/`;
    const selfIndex = url.indexOf(selfPrefix);
    if (selfIndex !== -1) {
      const localPath = join(ROOT, decodeURIComponent(url.slice(selfIndex + selfPrefix.length)));
      if (!existsSync(localPath)) {
        record('Profile images', truncate(url, 88), 'FAIL', `HTTP 200 but no file at ${localPath.replace(ROOT, '.')} on this branch`);
        continue;
      }
    }

    record('Profile images', truncate(url, 88), 'PASS', 'HTTP 200');
  }
};

/* ------------------------------------------------------------------ *
 * 3. Placeholder scan on the profile
 * ------------------------------------------------------------------ */

const checkPlaceholders = (text) => {
  const lines = text.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, index) => {
    if (PLACEHOLDER_PATTERN.test(line)) hits.push(`${index + 1}: ${truncate(line, 60)}`);
  });

  if (hits.length > 0) {
    record('Placeholder scan', PROFILE_PATH, 'FAIL', `${hits.length} hit(s) — ${hits.slice(0, 3).join(' | ')}`);
    return;
  }
  record('Placeholder scan', PROFILE_PATH, 'PASS', 'no TODO / TBD / FIXME / lorem');
};

/* ------------------------------------------------------------------ *
 * 4. Repository metadata: description, topics, homepage
 * ------------------------------------------------------------------ */

const listOrgRepos = async () => {
  const url = `https://api.github.com/orgs/${ORG}/repos?per_page=100&type=public`;
  let response = await get(url, { headers: authHeaders() });

  // A CI installation token can be narrower than the organization scope. The
  // data is public, so retry anonymously rather than reporting a false failure.
  if (!response.ok && (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) && [401, 403, 404].includes(response.status)) {
    const { authorization, ...anonymous } = authHeaders();
    response = await get(url, { headers: anonymous });
  }

  if (!response.ok) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    throw new Error(`GitHub API HTTP ${response.status}${remaining ? ` (rate limit remaining: ${remaining})` : ''}`);
  }

  const repos = await response.json();
  if (!Array.isArray(repos)) throw new Error('GitHub API returned a non-array payload');

  // Archived repositories are retired and read-only; they carry no live
  // maintenance obligation. Forks are not owned by this organization.
  return repos.filter((repo) => !repo.archived && !repo.fork);
};

const checkRepoMetadata = (repos) => {
  if (repos.length === 0) {
    record('Repository metadata', `${ORG}/*`, 'FAIL', 'no public, non-archived repositories returned');
    return;
  }

  for (const repo of repos) {
    const name = repo.name;
    const problems = [];

    const description = (repo.description || '').trim();
    if (!description) problems.push('no description');

    const topicCount = Array.isArray(repo.topics) ? repo.topics.length : 0;
    if (topicCount < MIN_TOPICS) problems.push(`${topicCount} topic(s), needs ${MIN_TOPICS}`);

    const homepage = (repo.homepage || '').trim();
    if (!homepage || !/^https?:\/\//i.test(homepage)) problems.push('no homepage/docs URL');

    if (problems.length > 0) {
      record('Repository metadata', name, 'FAIL', problems.join('; '));
    } else {
      record('Repository metadata', name, 'PASS', `${topicCount} topics, description and homepage set`);
    }
  }
};

/* ------------------------------------------------------------------ *
 * 5. llms.txt discovery surface (soft)
 * ------------------------------------------------------------------ */

const checkLlmsTxt = async (repos) => {
  for (const repo of repos) {
    const branch = repo.default_branch || 'main';
    const candidates = [`https://raw.githubusercontent.com/${ORG}/${repo.name}/${branch}/llms.txt`];

    const homepage = (repo.homepage || '').trim();
    if (/^https?:\/\//i.test(homepage) && !homepage.includes('github.com')) {
      try {
        candidates.push(new URL('/llms.txt', homepage).href);
      } catch {
        /* an unparsable homepage is already reported by the metadata check */
      }
    }

    let found = null;
    for (const candidate of candidates) {
      try {
        const response = await get(candidate);
        if (response.status === 200) {
          found = candidate;
          break;
        }
      } catch {
        /* try the next candidate */
      }
    }

    if (found) {
      record('llms.txt', repo.name, 'PASS', truncate(found.replace('https://', ''), 80));
    } else {
      record('llms.txt', repo.name, 'WARN', 'not published at repo root or site origin');
    }
  }
};

/* ------------------------------------------------------------------ *
 * 6. Live MCP contract: manifest count == tools/list count
 * ------------------------------------------------------------------ */

const readToolNamesFromResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (contentType.includes('text/event-stream')) {
    for (const line of body.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload);
        if (parsed?.result?.tools) return parsed.result.tools.map((tool) => tool.name);
      } catch {
        /* not the frame we want */
      }
    }
    return null;
  }

  const parsed = JSON.parse(body);
  const tools = parsed?.result?.tools;
  return Array.isArray(tools) ? tools.map((tool) => tool.name) : null;
};

const checkMcpContract = async () => {
  let manifestTools;
  try {
    const response = await get(MCP_MANIFEST);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    manifestTools = Array.isArray(manifest?.tools) ? manifest.tools : null;
    if (!manifestTools) throw new Error('manifest has no tools array');
  } catch (error) {
    record('MCP manifest', MCP_MANIFEST, 'FAIL', error.message);
    return;
  }

  record('MCP manifest', MCP_MANIFEST.replace('https://', ''), 'PASS', `${manifestTools.length} tools declared`);

  let liveTools;
  try {
    const response = await get(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': '2025-06-18',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    liveTools = await readToolNamesFromResponse(response);
    if (!liveTools) throw new Error('no tools array in tools/list response');
  } catch (error) {
    record('MCP tools/list', MCP_ENDPOINT.replace('https://', ''), 'FAIL', error.message);
    return;
  }

  record('MCP tools/list', MCP_ENDPOINT.replace('https://', ''), 'PASS', `${liveTools.length} tools served`);

  if (manifestTools.length === liveTools.length) {
    const declared = new Set(manifestTools);
    const served = new Set(liveTools);
    const drift = [
      ...[...declared].filter((name) => !served.has(name)).map((name) => `-${name}`),
      ...[...served].filter((name) => !declared.has(name)).map((name) => `+${name}`),
    ];
    if (drift.length > 0) {
      record('MCP parity', 'manifest vs tools/list', 'WARN', `count matches at ${liveTools.length}, names differ: ${truncate(drift.join(', '), 80)}`);
    } else {
      record('MCP parity', 'manifest vs tools/list', 'PASS', `${liveTools.length} tools, identical names`);
    }
  } else {
    record('MCP parity', 'manifest vs tools/list', 'FAIL', `manifest ${manifestTools.length} vs live ${liveTools.length}`);
  }
};

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

const render = () => {
  const failures = rows.filter((row) => row.status === 'FAIL');
  const warnings = rows.filter((row) => row.status === 'WARN');
  const passes = rows.filter((row) => row.status === 'PASS');

  const lines = [
    '## Organization surface check',
    '',
    `Organization: \`${ORG}\` · checks: ${rows.length} · pass: ${passes.length} · warn: ${warnings.length} · fail: ${failures.length}`,
    '',
    '| Check | Scope | Result | Detail |',
    '| :--- | :--- | :--- | :--- |',
    ...rows.map(
      (row) =>
        `| ${row.check} | ${row.scope.replace(/\|/g, '\\|')} | ${row.status === 'PASS' ? 'pass' : row.status === 'WARN' ? 'warn' : '**fail**'} | ${row.detail.replace(/\|/g, '\\|')} |`,
    ),
    '',
  ];

  if (failures.length > 0) {
    lines.push(`**Gate failed:** ${failures.length} hard failure(s).`);
    for (const failure of failures) lines.push(`- ${failure.check} · ${failure.scope} — ${failure.detail}`);
  } else if (warnings.length > 0) {
    lines.push(`**Gate passed with ${warnings.length} soft gap(s).** Warnings do not block; they are tracked surface debt.`);
  } else {
    lines.push('**Gate clean.** Every hard and soft check passed.');
  }

  return { text: `${lines.join('\n')}\n`, failures, warnings };
};

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const main = async () => {
  const profileText = checkProfilePresent();

  if (profileText) {
    await checkImageUrls(profileText);
    checkPlaceholders(profileText);
  }

  try {
    const repos = await listOrgRepos();
    checkRepoMetadata(repos);
    await checkLlmsTxt(repos);
  } catch (error) {
    record('Repository metadata', `${ORG}/*`, 'FAIL', `cannot enumerate repositories: ${error.message}`);
  }

  await checkMcpContract();

  const { text, failures } = render();
  process.stdout.write(text);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('node:fs');
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, text, 'utf8');
    } catch {
      /* the stdout copy above remains the record */
    }
  }

  process.exit(failures.length > 0 ? 1 : 0);
};

main().catch((error) => {
  process.stderr.write(`org-surface-check failed unexpectedly: ${error?.stack || error}\n`);
  process.exit(1);
});
