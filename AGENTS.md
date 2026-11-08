# Agentic Income — Agent Operating Contract

Scope: All repositories under the **Agentic-Income** GitHub Organization (https://agenticincome.ai).
Brand register: `agentic-income`

## Responsible Agent Team & Governance

| Role | Assigned Owner |
| :--- | :--- |
| **Human Codeowner** | `@frankxai` |
| **Organization Steward** | `steward-wealth` |
| **Executive Seat** | CFO (Capital, Pricing & FinOps) |
| **Universal IS** | Wealth IS,Business IS |
| **Council Lead** | starlight-business,starlight-navigator,starlight-sentinel |
| **Primary Harnesses** | `Claude Code`, `Codex`, `Hermes`, `Grok` |

## Core Guardrails

1. **Think before coding.** State assumptions and surface tradeoffs. Verify file contents and branch state before writing.
2. **Surgical changes.** Touch only the files required for the active slice. Never overwrite or reset another agent's uncommitted worktree.
3. **Branch and worktree discipline.** Never push directly to `main`. Work on `agent/<harness>/<scope>` in a dedicated worktree and open a **draft** pull request first.
4. **Maker != Checker.** The harness that authors a pull request never approves or merges its own pull request.
5. **CI budget discipline.** Keep pull requests in draft until local verification (`lint`, `typecheck`, `test`, `build`) passes. Mark ready for review once.
6. **Non-waivable safety.**
   - Never commit secrets, API keys, or `.env` files.
   - Preserve repository visibility parity: never copy or mirror private repository contents into a public repository.
   - Money fails closed; no autonomous spend or paid API provisioning without explicit human approval.
   - In health and mind domains, model observations only; never diagnose or make clinical claims.

## Repository architecture (14 repositories)

The organisation has 10 active and 4 archived repositories. Active repositories fall into three classes. Human codeownership stays with `@frankxai`.

### Transferred repositories (4)

These repositories moved from `frankxai` to `Agentic-Income`; the old `frankxai/<repo>` paths redirect here. The organisation copy is the source of truth.

| Repository | Visibility | Role |
| :--- | :--- | :--- |
| `awesome-agentic-income` | `public` | Transferred; source of truth |
| `agentic-income-template` | `public` | Transferred; source of truth |
| `awesome-wealth-agent-skills` | `public` | Transferred; source of truth |
| `awesome-investor-agent-skills` | `public` | Transferred; source of truth |

### Federated mirrors (5)

The source of truth remains in `frankxai`. Do not treat the organisation copy as canonical.

| Repository | Visibility | Source of truth |
| :--- | :--- | :--- |
| `agenticincome` | `private` | `frankxai/agenticincome` |
| `agenticpassiveincome` | `private` | `frankxai/agenticpassiveincome` |
| `agentic-income-skills` | `public` | `frankxai/agentic-income-skills` |
| `affiliate-agent-skills` | `public` | `frankxai/affiliate-agent-skills` |
| `GenInvestor` | `public` | `frankxai/GenInvestor` |

**Mirror status verified 2026-11-08.** Four mirrors match their canonical `frankxai` `main` SHAs (`agenticpassiveincome` at `45158c3`, `agentic-income-skills` at `1860e8e`, `affiliate-agent-skills` at `d6516ac`, and `GenInvestor` at `444181fc`). `agenticincome` (`4efd580` -> `309f8e4`) tracks canonical SSoT via fast-forward sync (`Agentic-Income/agenticincome#13`). Keep org mirrors read-only (`frankxai/agentic-ops-hub#364`); do not edit them as part of `.github` governance changes.

### Governance

| Repository | Visibility | Role |
| :--- | :--- | :--- |
| `.github` | `public` | Organisation profile, community health files, agent contract, and reusable CI |

### Archived repositories (4)

Retired under the `20261018` naming pass and kept read-only. New work belongs in the active repository with the same base name.

| Archived repository | Superseded by |
| :--- | :--- |
| `agentic-income-template-retired-20261018` | `agentic-income-template` |
| `awesome-agentic-income-retired-20261018` | `awesome-agentic-income` |
| `awesome-investor-agent-skills-retired-20261018` | `awesome-investor-agent-skills` |
| `awesome-wealth-agent-skills-retired-20261018` | `awesome-wealth-agent-skills` |

Built on SIP
