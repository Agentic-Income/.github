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

## Federated Repository Roster (9 repositories)

| Repository | Visibility | Primary Owner | Role |
| :--- | :--- | :--- | :--- |
| `agenticincome` | `private` | `frankxai` | federated-mirror (SSOT: frankxai/agenticincome) |
| `agenticpassiveincome` | `private` | `frankxai` | federated-mirror (SSOT: frankxai/agenticpassiveincome) |
| `awesome-agentic-income` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/awesome-agentic-income) |
| `agentic-income-skills` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/agentic-income-skills) |
| `agentic-income-template` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/agentic-income-template) |
| `affiliate-agent-skills` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/affiliate-agent-skills) |
| `awesome-wealth-agent-skills` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/awesome-wealth-agent-skills) |
| `awesome-investor-agent-skills` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/awesome-investor-agent-skills) |
| `GenInvestor` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/GenInvestor) |

Built on SIP
