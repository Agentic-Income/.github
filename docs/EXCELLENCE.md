# Excellence verification

How the Agentic Income surfaces are kept honest, what each check proves, and what is still unchecked. Scores below were measured on **2026-11-13** by running each gate against the live public endpoints. Re-measure before quoting them.

## The gates

| Gate | Checks | Measured 2026-11-13 | Proves | Does not prove |
| :--- | ---: | :--- | :--- | :--- |
| [Organization Surface Check](../.github/workflows/org-surface-check.yml) | 26 | 26 pass, 0 warn, 0 fail | The profile renders its assets, every public repo has a description, at least 3 topics and a homepage, `llms.txt` exists everywhere, MCP manifest and `tools/list` agree on names | That the repos are good, or that README images and links resolve |
| [Live Site Surface Check](../.github/workflows/site-surface-check.yml) | 29 | 29 pass, 0 warn, 0 fail | The three live sites return 200 with a title, description, parseable JSON-LD, social card, `llms.txt`, `robots.txt`, `sitemap.xml`, and MCP parity where claimed | Speed, accessibility, or visual quality |
| [MCP Contract Check](../.github/workflows/mcp-contract-check.yml) | 12 self-test cases plus a live diff | Snapshot of 16 tools, live identical | A tool's inputs have not changed in a way that breaks a caller: removed tool, removed or retyped property, new required input, lost enum value | That a tool's output is correct, or that descriptions read well to an agent |
| [Content Truth Check](../.github/workflows/content-truth-check.yml) | 20 self-test fixtures plus a live scan | 0 hard, 3 soft across 18 sources | No sentence promises income, returns or results, and no unsubstantiated social-proof count, in repo copy and the live homepages | That a number is true, only that one is not obviously unsourced |

Together that is 55 measured checks in the two original gates, plus two gates that fail on drift instead of on absence. All four are dependency-free Node, read public endpoints anonymously, and never edit anything. Hard failures exit 1; soft gaps warn and exit 0. All four run on a monthly schedule, on manual dispatch, and on pull requests that touch them.

**Status of the two new gates:** the MCP Contract Check and Content Truth Check were written and verified locally on 2026-11-13 (self-tests, a live run, and a deliberately broken input that each correctly rejected). They have not yet run in GitHub Actions. Treat their first CI run as the real acceptance test.

## What the content gate found today

- **Hard failures: 0.** No income promise or unsubstantiated social proof in 18 sources.
- **Soft, needs a decision:** `www.agenticpassiveincome.com` states "Roughly $50M cumulative volume, ~165M transactions, ~69k active agents, median $0.028 per call" with no source visible next to it. If a source exists on the page, link it in the same sentence; if not, the figure breaks the "every number sourced" promise.
- **Soft, probably fine:** two product prices (`$67`, `Private Intel $19/mo`) on `www.agenticincome.ai`. A price is a statement of what something costs, not a claim; add a source marker only if you want the warning gone.

## What is not gated yet

1. **Experience:** no Lighthouse or Core Web Vitals, no axe accessibility run, no screenshot check at 1440 and 390 px, no no-JS or reduced-motion check. This needs a browser and a dependency, so it belongs in a job of its own rather than in these dependency-free gates.
2. **README depth:** the org gate reads repository metadata and `llms.txt`, not every README image and link.
3. **Output correctness:** nothing yet exercises what the MCP tools return, only their declared inputs.

## Governance gap (measured, not a recommendation to merge faster)

A gate is only as strong as the merge policy behind it. On 2026-11-13:

- `.github` `main` is **not protected**, and the organization has **0 rulesets**.
- Of the six `.github` pull requests checked (#2, #4, #5, #6, #7, #8), **all six were authored and merged by the same account**, and four had **no review at all**.
- The organization does not require two-factor authentication (`two_factor_requirement_enabled: false` as the API reported it; confirm in the organization settings).

None of this was changed. These are organization settings and the decision is the owner's. The smallest useful change is one ruleset on `main` of the active public repositories: require a pull request, require these gates to pass, and require one approval from someone other than the author.

## Monthly Excellence Review

One page, one owner, once a month: the four gate results, the scores, what moved, and the single decision that would raise the bar next. This document is the template. Update the measured column from a fresh run, not from memory.

## Provenance

Authored 2026-11-13. Owned by @frankxai. Gates: `scripts/org-surface-check.mjs`, `scripts/site-surface-check.mjs`, `scripts/mcp-contract-check.mjs`, `scripts/content-truth-check.mjs`. MCP snapshot: `contracts/agenticincome-mcp.snapshot.json`; accept an intended contract change with `node scripts/mcp-contract-check.mjs --write` in the same reviewed pull request.
