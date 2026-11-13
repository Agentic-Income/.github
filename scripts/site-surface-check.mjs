#!/usr/bin/env node
/**
 * site-surface-check.mjs — Agentic Income live product surface gate.
 *
 * Verifies the three public product sites as a machine and a human first meet
 * them: the homepage contract (status, title, description, structured data),
 * the agent discovery surface (llms.txt, robots.txt, sitemap.xml), the social
 * card (og:image, twitter:card), and the live MCP contract where one is
 * declared.
 *
 * Contract:
 *   - Node built-ins only. No dependencies, no build step, no secrets.
 *   - Public endpoints only. Every request is anonymous.
 *   - Hard failures exit 1. Optional gaps (a site without an og:image, an
 *     advisory MCP surface that is absent) warn and exit 0.
 *   - A declared asset that does not resolve is a hard failure: a missing
 *     og:image is debt, a broken one is a lie told to every scraper.
 *   - This script never deploys, edits, or writes to the live sites.
 *
 * Usage:
 *   node scripts/site-surface-check.mjs
 *
 * Provenance: authored 2026-11-13 for Agentic-Income/.github. Owned by @frankxai.
 */

import { appendFileSync } from 'node:fs';

const FETCH_TIMEOUT_MS = 20_000;
const MCP_PROTOCOL_VERSION = '2025-06-18';
const USER_AGENT = 'agentic-income-site-surface-check';

/**
 * `mcp`:
 *   'required' — a manifest and a live tools/list must agree, hard failure.
 *   'advisory' — checked when a manifest is published, never blocks.
 *   null       — no MCP surface claimed.
 */
const SITES = [
  {
    id: 'agenticincome',
    host: 'www.agenticincome.ai',
    origin: 'https://www.agenticincome.ai',
    mcp: 'required',
  },
  {
    id: 'agenticpassiveincome',
    host: 'www.agenticpassiveincome.com',
    origin: 'https://www.agenticpassiveincome.com',
    mcp: 'advisory',
  },
  {
    id: 'geninvestor',
    host: 'geninvestor-research.vercel.app',
    origin: 'https://geninvestor-research.vercel.app',
    mcp: null,
  },
];

const TWITTER_CARDS = new Set(['summary', 'summary_large_image', 'app', 'player']);

const truncate = (text, max = 96) => {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

const decodeEntities = (text) =>
  String(text)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const absolute = (value, base) => {
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ *
 * Fetch
 * ------------------------------------------------------------------ */

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'user-agent': USER_AGENT, ...(options.headers || {}) },
    ...options,
  });
  return response;
};

const readBody = async (response) => {
  try {
    return await response.text();
  } catch {
    return '';
  }
};

/** HEAD with a GET fallback for servers that do not implement HEAD. */
const probeAsset = async (url) => {
  let response = await request(url, { method: 'HEAD' });
  if (response.status === 405 || response.status === 501 || response.status >= 400) {
    response = await request(url, { method: 'GET' });
    await response.arrayBuffer().catch(() => {});
  }
  return {
    status: response.status,
    contentType: (response.headers.get('content-type') || '').split(';')[0].trim(),
    method: response.url === url && response.status === 200 ? 'HEAD' : 'GET',
  };
};

/* ------------------------------------------------------------------ *
 * HTML parsing (no DOM, no dependencies)
 * ------------------------------------------------------------------ */

const parseMetaTags = (html) => {
  /** @type {Map<string, string>} */
  const byKey = new Map();
  const tagPattern = /<meta\b[^>]*>/gi;
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

  let tag;
  while ((tag = tagPattern.exec(html)) !== null) {
    /** @type {Record<string, string>} */
    const attrs = {};
    let attr;
    attrPattern.lastIndex = 0;
    while ((attr = attrPattern.exec(tag[0])) !== null) {
      attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? attr[4] ?? '';
    }
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (!key) continue;
    const value = decodeEntities(attrs.content ?? '').trim();
    // The first declaration wins; duplicates are not this gate's concern.
    if (!byKey.has(key)) byKey.set(key, value);
  }
  return byKey;
};

const parseTitle = (html) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : '';
};

const parseJsonLd = (html) => {
  const blocks = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) blocks.push(match[1]);

  const types = [];
  const invalid = [];

  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (node['@type']) {
      for (const value of [].concat(node['@type'])) {
        const name = String(value).replace(/^https?:\/\/schema\.org\//i, '');
        if (name && !types.includes(name)) types.push(name);
      }
    }
    if (node['@graph']) walk(node['@graph']);
  };

  for (const block of blocks) {
    const text = block.trim();
    if (!text) continue;
    try {
      walk(JSON.parse(text));
    } catch (error) {
      invalid.push(error.message);
    }
  }

  return { blocks: blocks.length, types, invalid };
};

/* ------------------------------------------------------------------ *
 * MCP
 * ------------------------------------------------------------------ */

const readToolNames = async (response) => {
  const body = await readBody(response);
  const contentType = response.headers.get('content-type') || '';

  const fromPayload = (payload) => {
    const tools = payload?.result?.tools;
    return Array.isArray(tools) ? tools.map((tool) => tool.name) : null;
  };

  if (contentType.includes('text/event-stream')) {
    for (const line of body.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const names = fromPayload(JSON.parse(payload));
        if (names) return names;
      } catch {
        /* not the frame we want */
      }
    }
    return null;
  }

  try {
    return fromPayload(JSON.parse(body));
  } catch {
    return null;
  }
};

const checkMcp = async (site) => {
  const manifestUrl = `${site.origin}/.well-known/mcp.json`;

  let manifest = null;
  try {
    const response = await request(manifestUrl);
    if (!response.ok) {
      const status = response.status;
      if (site.mcp === 'required') {
        return { status: 'FAIL', cell: `manifest ${status}`, detail: `${manifestUrl} HTTP ${status}` };
      }
      return { status: 'SKIP', cell: 'n/a', detail: `no manifest published (HTTP ${status})` };
    }
    manifest = await response.json();
  } catch (error) {
    if (site.mcp === 'required') {
      return { status: 'FAIL', cell: 'manifest err', detail: `${manifestUrl} — ${error.message}` };
    }
    return { status: 'SKIP', cell: 'n/a', detail: `manifest unavailable — ${error.message}` };
  }

  const declared = Array.isArray(manifest?.tools) ? manifest.tools.map((tool) => tool.name ?? tool) : null;
  if (!declared) {
    const status = site.mcp === 'required' ? 'FAIL' : 'WARN';
    return { status, cell: 'manifest bad', detail: `${manifestUrl} has no tools array` };
  }

  const endpoint = absolute(manifest.endpoint || '/api/mcp', site.origin);
  if (!endpoint) {
    return { status: 'FAIL', cell: 'endpoint bad', detail: `cannot resolve endpoint from ${manifestUrl}` };
  }

  let live;
  try {
    const response = await request(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': MCP_PROTOCOL_VERSION,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    live = await readToolNames(response);
    if (!live) throw new Error('no tools array in tools/list response');
  } catch (error) {
    const status = site.mcp === 'required' ? 'FAIL' : 'WARN';
    return { status, cell: 'tools/list err', detail: `${endpoint} — ${error.message}` };
  }

  if (declared.length !== live.length) {
    const status = site.mcp === 'required' ? 'FAIL' : 'WARN';
    return {
      status,
      cell: `${declared.length} ≠ ${live.length}`,
      detail: `manifest declares ${declared.length}, tools/list serves ${live.length}`,
    };
  }

  const declaredSet = new Set(declared);
  const liveSet = new Set(live);
  const drift = [
    ...[...declaredSet].filter((name) => !liveSet.has(name)).map((name) => `-${name}`),
    ...[...liveSet].filter((name) => !declaredSet.has(name)).map((name) => `+${name}`),
  ];

  const tag = site.mcp === 'advisory' ? ' (advisory)' : '';
  if (drift.length > 0) {
    return {
      status: 'WARN',
      cell: `${live.length} = ${declared.length}${tag}`,
      detail: `count parity at ${live.length}, names differ: ${truncate(drift.join(', '), 90)}`,
    };
  }
  return {
    status: 'PASS',
    cell: `${live.length} = ${declared.length}${tag}`,
    detail: `${live.length} tools declared and served, identical names`,
  };
};

/* ------------------------------------------------------------------ *
 * Per-site check
 * ------------------------------------------------------------------ */

const checkSite = async (site) => {
  const findings = [];
  const cells = {};
  const note = (check, status, cell, detail) => {
    cells[check] = { status, cell };
    findings.push({ host: site.host, check, status, detail });
  };

  const homepageUrl = `${site.origin}/`;

  let html = '';
  let homepageStatus = 0;
  try {
    const response = await request(homepageUrl);
    homepageStatus = response.status;
    html = await readBody(response);
  } catch (error) {
    note('homepage', 'FAIL', 'ERR', `${homepageUrl} — ${error.message}`);
  }

  if (!html) {
    note(
      'homepage',
      'FAIL',
      homepageStatus ? String(homepageStatus) : 'ERR',
      homepageStatus ? `${homepageUrl} HTTP ${homepageStatus} with no body` : `${homepageUrl} — no response body`,
    );
    for (const key of ['title', 'description', 'jsonld', 'og', 'llms', 'robots', 'sitemap']) {
      if (!cells[key]) cells[key] = { status: 'SKIP', cell: 'blocked' };
    }
  } else {
    note('homepage', homepageStatus === 200 ? 'PASS' : 'FAIL', String(homepageStatus), `${homepageUrl} HTTP ${homepageStatus}`);

    const meta = parseMetaTags(html);

    /* Title */
    const title = parseTitle(html);
    if (!title) note('title', 'FAIL', 'missing', 'no non-empty <title>');
    else note('title', 'PASS', `ok ${title.length}ch`, title);

    /* Description */
    const description = meta.get('description') || '';
    if (!description) note('description', 'FAIL', 'missing', 'no meta description');
    else if (description.length < 50) note('description', 'WARN', `short ${description.length}ch`, description);
    else note('description', 'PASS', `ok ${description.length}ch`, description);

    /* Structured data */
    const jsonld = parseJsonLd(html);
    if (jsonld.types.length === 0) {
      note(
        'jsonld',
        'FAIL',
        jsonld.blocks > 0 ? 'unparseable' : 'missing',
        jsonld.blocks === 0
          ? 'no application/ld+json block'
          : `${jsonld.blocks} block(s), none parseable: ${truncate(jsonld.invalid[0] || '', 70)}`,
      );
    } else if (jsonld.invalid.length > 0) {
      note('jsonld', 'WARN', `${jsonld.types.length} type(s)`, `${jsonld.invalid.length} block(s) failed to parse: ${truncate(jsonld.invalid[0], 70)}`);
    } else {
      note('jsonld', 'PASS', truncate(jsonld.types.join(', '), 44), `types: ${jsonld.types.join(', ')}`);
    }

    /* Social card */
    const ogRaw = meta.get('og:image') || meta.get('og:image:url') || '';
    if (!ogRaw) {
      note('og', 'WARN', 'missing', 'no og:image — link previews fall back to nothing');
    } else {
      const ogUrl = absolute(ogRaw, homepageUrl);
      const relative = !/^https?:\/\//i.test(ogRaw);
      if (!ogUrl) {
        note('og', 'FAIL', 'unresolvable', `og:image is not a URL: ${truncate(ogRaw, 60)}`);
      } else {
        try {
          const asset = await probeAsset(ogUrl);
          if (asset.status !== 200) {
            note('og', 'FAIL', String(asset.status), `og:image ${ogUrl} HTTP ${asset.status}`);
          } else if (!/^image\//i.test(asset.contentType)) {
            note('og', 'WARN', 'not an image', `${ogUrl} served ${asset.contentType || 'no content-type'}`);
          } else if (relative) {
            note('og', 'WARN', 'ok relative', `og:image is relative (${truncate(ogRaw, 40)}), resolved to ${ogUrl}`);
          } else {
            note('og', 'PASS', 'ok 200', `${ogUrl} ${asset.contentType}`);
          }
        } catch (error) {
          note('og', 'FAIL', 'ERR', `${ogUrl} — ${error.message}`);
        }
      }
    }

    /* twitter:card, only when declared */
    const twitterCard = meta.get('twitter:card');
    if (!twitterCard) {
      note('twitter', 'WARN', 'not declared', 'no twitter:card meta');
    } else if (!TWITTER_CARDS.has(twitterCard.toLowerCase())) {
      note('twitter', 'FAIL', truncate(twitterCard, 20), `twitter:card must be one of ${[...TWITTER_CARDS].join(', ')}`);
    } else {
      note('twitter', 'PASS', twitterCard, `twitter:card=${twitterCard}`);
    }
  }

  /* Discovery surface, fetched in parallel */
  const discovery = [
    {
      key: 'llms',
      url: `${site.origin}/llms.txt`,
      validate: (body, contentType) => {
        if (!body.trim()) return { status: 'FAIL', detail: 'empty body' };
        if (/text\/html/i.test(contentType) || /^\s*<(!doctype|html)/i.test(body)) {
          return { status: 'WARN', detail: `served ${contentType || 'HTML'} instead of plain text` };
        }
        return { status: 'PASS', detail: `${Buffer.byteLength(body, 'utf8')} bytes` };
      },
    },
    {
      key: 'robots',
      url: `${site.origin}/robots.txt`,
      validate: (body) => {
        if (!body.trim()) return { status: 'FAIL', detail: 'empty body' };
        if (!/^\s*user-agent\s*:/im.test(body)) return { status: 'WARN', detail: 'no User-Agent directive' };
        const sitemap = /^\s*sitemap\s*:\s*(\S+)/im.exec(body)?.[1];
        return { status: 'PASS', detail: sitemap ? `sitemap declared: ${truncate(sitemap, 60)}` : 'valid, no sitemap directive' };
      },
    },
    {
      key: 'sitemap',
      url: `${site.origin}/sitemap.xml`,
      validate: (body) => {
        if (!body.trim()) return { status: 'FAIL', detail: 'empty body' };
        if (!/<(urlset|sitemapindex)\b/i.test(body)) {
          return { status: 'WARN', detail: 'HTTP 200 but body is not a sitemap document' };
        }
        const urls = (body.match(/<loc>/gi) || []).length;
        if (urls === 0) return { status: 'WARN', detail: 'sitemap contains no <loc> entries' };
        return { status: 'PASS', detail: `${urls} url${urls === 1 ? '' : 's'}` };
      },
    },
  ];

  const settled = await Promise.allSettled(
    discovery.map(async ({ url, validate }) => {
      const response = await request(url);
      const body = await readBody(response);
      const contentType = (response.headers.get('content-type') || '').split(';')[0].trim();
      return { response, body, contentType, validate };
    }),
  );

  settled.forEach((outcome, index) => {
    const { key, url } = discovery[index];
    const label = `/${url.split('/').slice(3).join('/')}`;
    if (outcome.status === 'rejected') {
      note(key, 'FAIL', 'ERR', `${url} — ${outcome.reason?.message || outcome.reason}`);
      return;
    }
    const { response, body, contentType, validate } = outcome.value;
    if (response.status !== 200) {
      note(key, 'FAIL', String(response.status), `${label} HTTP ${response.status}`);
      return;
    }
    const verdict = validate(body, contentType);
    const cell = key === 'sitemap' && verdict.status === 'PASS' ? `ok ${verdict.detail}` : verdict.status === 'PASS' ? 'ok' : verdict.status === 'WARN' ? 'warn' : 'fail';
    note(key, verdict.status, cell, `${label} — ${verdict.detail}`);
  });

  /* MCP */
  if (site.mcp) {
    const mcp = await checkMcp(site);
    cells.mcp = { status: mcp.status === 'SKIP' ? 'SKIP' : mcp.status, cell: mcp.cell };
    findings.push({ host: site.host, check: 'mcp', status: mcp.status === 'SKIP' ? 'PASS' : mcp.status, detail: mcp.detail });
  } else {
    cells.mcp = { status: 'SKIP', cell: 'n/a' };
  }

  const statuses = findings.map((finding) => finding.status);
  const status = statuses.includes('FAIL') ? 'FAIL' : statuses.includes('WARN') ? 'WARN' : 'PASS';

  return { site, cells, findings, status, htmlBytes: html.length };
};

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

const MARK = { PASS: 'pass', WARN: 'warn', FAIL: '**fail**', SKIP: 'n/a' };

const render = (results, startedAt) => {
  const all = results.flatMap((result) => result.findings);
  const failures = all.filter((finding) => finding.status === 'FAIL');
  const warnings = all.filter((finding) => finding.status === 'WARN');
  const passes = all.filter((finding) => finding.status === 'PASS');

  const safeCell = (text) => String(text ?? '').replace(/\|/g, '\\|');

  const lines = [
    '## Live site surface check',
    '',
    `${results.length} public product surfaces · ${startedAt} · checks: ${all.length} · pass: ${passes.length} · warn: ${warnings.length} · fail: ${failures.length}`,
    '',
    '| Site | Status | Title | Description | JSON-LD | OG | llms | robots | sitemap | MCP parity |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
    ...results.map(({ site, cells, status }) => {
      const order = ['title', 'description', 'jsonld', 'og', 'llms', 'robots', 'sitemap', 'mcp'];
      const values = order.map((key) => {
        const entry = cells[key] || { status: 'SKIP', cell: 'n/a' };
        return entry.status === 'FAIL' ? `**${safeCell(entry.cell)}**` : safeCell(entry.cell);
      });
      return `| \`${site.host}\` | ${MARK[status]} | ${values.join(' | ')} |`;
    }),
    '',
  ];

  if (failures.length > 0) {
    lines.push(`**Gate failed:** ${failures.length} hard failure(s).`);
    for (const failure of failures) lines.push(`- fail · \`${failure.host}\` · ${failure.check} — ${failure.detail}`);
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push(`**${warnings.length} soft gap(s)** — tracked debt, does not block:`);
    for (const warning of warnings) lines.push(`- warn · \`${warning.host}\` · ${warning.check} — ${warning.detail}`);
    lines.push('');
  }

  if (failures.length === 0 && warnings.length === 0) {
    lines.push('**Gate clean.** Every hard and soft check passed.', '');
  }

  return { text: `${lines.join('\n')}`, failures, warnings };
};

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const main = async () => {
  const startedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

  const settled = await Promise.allSettled(SITES.map((site) => checkSite(site)));
  const results = settled.map((outcome, index) => {
    if (outcome.status === 'fulfilled') return outcome.value;
    const site = SITES[index];
    return {
      site,
      cells: {},
      status: 'FAIL',
      findings: [{ host: site.host, check: 'site', status: 'FAIL', detail: `check crashed: ${outcome.reason?.message || outcome.reason}` }],
    };
  });

  const { text, failures } = render(results, startedAt);
  process.stdout.write(`${text}\n`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`, 'utf8');
    } catch {
      /* the stdout copy above remains the record */
    }
  }

  process.exit(failures.length > 0 ? 1 : 0);
};

main().catch((error) => {
  process.stderr.write(`site-surface-check failed unexpectedly: ${error?.stack || error}\n`);
  process.exit(1);
});
