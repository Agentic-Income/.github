# Agentic Income | Organization Profile Intelligence Review

**Review date:** 2026-11-11  
**Verified:** 2026-11-12  
**Scope:** Public GitHub organization profile, editorial hierarchy, SVG assets, and evidence discipline  
**Delivery:** Draft PR; no direct main-branch changes, no production deployment, no spending

## Executive judgment

**The original profile proved technical activity but undercommunicated the economic intelligence proposition.** The revision shifts the front door from a repository directory to a product-level decision narrative: research → model → verify → build → measure, anchored in owner control.

| Dimension | Previous pattern | Proposed improvement | Validation |
| :--- | :--- | :--- | :--- |
| Value proposition | Broad open-systems tagline | Explicit economic intelligence narrative | Editorial review |
| Navigation | Repository inventory as primary CTA | Five audience-driven entry points | Link and destination audit |
| Visual identity | One dark constellation banner | Editorial masthead + four original infographics | Render at GitHub desktop/mobile |
| Product architecture | Long MCP tool list | Architectural overview plus endpoint | Live discovery check |
| Economic credibility | Textual mention of margin tools | Explicit arithmetic and source gates | Verify every model definition |
| Readiness | Static 13/16 counts | Capability descriptions with version caveat | Compare to deployment manifest |
| Governance | Buried standards | Evidence standard shown prominently | Claims audit + CODEOWNER review |

## Art direction

**Visual thesis:** financial intelligence without finance clichés; technical depth without generic AI imagery.

- Ink navy / graphite, limited warm gold highlights, secondary mineral cyan, high-contrast ivory.
- Restrained architectural grids, luminous orbit diagrams, precise rules, typographic scale, editorial composition.
- No crypto coins, banknotes, fake dashboards, AI robot avatars, misleading revenue curves or decorative data.
- Each diagram must teach one idea, not repeat the headline.

### Asset taxonomy

1. `assets/org-banner.svg` — broad brand statement and visual anchor (1600 × 460).
2. `assets/operating-loop.svg` — conceptual five-stage economic operating loop.
3. `assets/economic-engine.svg` — unit margin and decision-control gates.
4. `assets/system-architecture.svg` — discover, design, govern structure.
5. `assets/evidence-standard.svg` — source-readiness classification.

## Business and audience rationale

- **Agent builders:** shortcut from identity to documented MCP and portable skills.
- **Product operators:** understand economic reasoning before automation.
- **Researchers / investors:** find evidence-led catalogs and traceable claims.
- **Potential partners:** see a technically substantive business with boundaries.

**North-star signals to instrument outside the README:** profile → MCP documentation click-through; profile → skills usage; profile → starter clone; sourced partner-program engagement; qualified inquiry rate. No invented baselines or expected uplift.

## Findings and residual risks

| Severity | Finding | Disposition |
| :--- | :--- | :--- |
| High | Pre-existing '13 tools live / 16 source' assertion can become stale | Re-derived and dated 2026-11-12: 13 live, 16 in source, three Economy Vault tools named as pending; discovery instruction retained |
| High | MCP tool names and prices may differ from deployed release | No new live capability claims; validate before merging |
| Medium | The earlier README prominently included private project metadata | Removed private repository inventory from public landing page |
| Medium | Old content has apparent connector-text mojibake | New README uses UTF-8-native replacement |
| Medium | SVGs might display differently under GitHub's sanitizer and responsive layouts | Screenshot checks needed; do not mark ready prematurely |
| Medium | README image URLs were pinned to the PR-branch commit `4fb5563` for visual inspection | Resolved: switched to stable `main` references at merge; a squash merge would not keep the PR-branch commit reachable |
| Medium | Canonical vs mirrored skills previously obscure | Public mirror and source-of-truth distinction now explicit |
| Low | Some externally linked resources may move or redirect | Independent link check recommended |

## Validation matrix

- [x] Scope restricted to `Agentic-Income/.github`
- [x] Dedicated `agent/codex/*` branch
- [x] Draft-first workflow
- [x] No private source code copied or secrets introduced
- [x] All infographic captions avoid invented revenue metrics
- [x] New static visuals contain descriptive SVG accessibility labels
- [x] GitHub-rendered visual screenshots at desktop and mobile widths (all five assets, headless Chrome, 2026-11-12)
- [x] Live MCP discovery / CLI executable validation (`initialize` answered 200; 13 live tools enumerated)
- [x] Repository URL and external link HTTP validation (24 URLs, all 2xx)
- [x] Separate-harness independent design and technical review (opencode/DeepSeek; authoring harness was Codex)
- [x] Human codeowner signoff (`@frankxai`, 2026-11-12)

## Verification receipt (2026-11-12)

- **Live MCP:** `initialize` over streamable HTTP returned 200 from `https://www.agenticincome.ai/api/mcp`; `/.well-known/mcp.json` lists **13** tools. `public/.well-known/mcp.json` on `frankxai/agenticincome@main` lists **16**. Pending promotion: `search_digital_economies`, `list_supply_costs`, `calculate_unit_margin` (Economy Vault). The production release is tracked privately in `frankxai/agenticincome#136`, still open on the review date.
- **Links:** all 24 unique URLs in `profile/README.md` returned 2xx. The MCP endpoint was validated with a POST `initialize` because it does not answer `HEAD`.
- **Render:** every asset rendered at native size in headless Chrome with no clipping, overflow or missing glyphs. Palette, grid and footer convention are shared across all five.
- **Assets:** the five images served at commit `4fb5563` are byte-identical to the committed files; the README now references `main` so a squash merge cannot strand the images.
- **Command:** `npx skills add frankxai/agentic-income-skills --skill agentic-income` matches the published `skills` CLI (1.8.1) syntax, and `skills/agentic-income/SKILL.md` exists in that repository.

## Next acceptance gate

Independent reviewer should inspect **every SVG render** for legibility, clipping, iconographic meaning, whitespace and hierarchy, then reconcile every external endpoint and product availability claim against the live system. Only after all gates pass should the PR leave draft.

## Governance

`steward-wealth` owns organization stewardship. Product/commercial judgment stays under the established CFO/business council. No new persistent agent identity is introduced. Maker and checker are separate; `@frankxai` is final human CODEOWNER.

*This report documents the proposed change, not measured commercial performance.*
