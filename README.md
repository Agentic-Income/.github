# Agentic Income — Organization governance (`.github`)

This repository defines organization-wide community health files, agent operating contracts, issue and pull request templates, and reusable GitHub Actions workflows for [**Agentic Income**](https://github.com/Agentic-Income).

## Contents

- [`profile/README.md`](./profile/README.md) — Public organization profile rendered on `https://github.com/Agentic-Income`.
- [`AGENTS.md`](./AGENTS.md) — Organization-wide operating contract for coding agents (Claude Code, Codex, Grok, Antigravity, Hermes, OpenCode).
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Branch naming, draft-PR workflow, and verification requirements.
- [`SECURITY.md`](./SECURITY.md) — Secret hygiene and vulnerability reporting policy.
- [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md) — Standardized pull request receipt with `Intent:` and Maker-Checker fields.
- [`.github/workflows/reusable-ci.yml`](./.github/workflows/reusable-ci.yml) — Draft-gated reusable CI workflow with concurrency cancellation and timeout guards.
- [`VISUAL-SYSTEM.md`](./VISUAL-SYSTEM.md) — Canonical visual language: tokens, typography, format grid, motion, accessibility, and file conventions for every asset.
- [`scripts/org-surface-check.mjs`](./scripts/org-surface-check.mjs) — Dependency-free gate over the public surface: profile, embedded assets, repository metadata, `llms.txt`, and the live MCP contract.
- [`.github/workflows/org-surface-check.yml`](./.github/workflows/org-surface-check.yml) — Runs the surface gate on pull requests, monthly, and on demand.
- [`scripts/site-surface-check.mjs`](./scripts/site-surface-check.mjs) — Dependency-free gate over the three live product sites: homepage contract, structured data, discovery files, social card, and MCP manifest parity.
- [`.github/workflows/site-surface-check.yml`](./.github/workflows/site-surface-check.yml) — Runs the live site gate on pull requests to the gate itself, monthly, and on demand.
