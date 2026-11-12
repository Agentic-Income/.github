# Visual System — Agentic Income

The canonical visual language for every surface under the `Agentic-Income` organization: the profile masthead, the strategic diagrams, social cards, and any future asset in `assets/`.

This document is **normative**. It describes what the shipped assets actually do, and it names the steps that are reserved for future use. Where a shipped asset deviates, the deviation is recorded in [Compliance snapshot](#compliance-snapshot) rather than hidden.

| | |
| :--- | :--- |
| **Status** | Adopted. Applies to new assets immediately. |
| **Measured** | 2026-11-13, against the six SVGs in `assets/` at `main`. |
| **Scope** | `Agentic-Income/.github` (this repository). Other org repositories adopt by reference. |
| **Owner** | Human codeowner `@frankxai`. Design changes ship as a pull request, never as a direct push. |

---

## 1. Principles

1. **Evidence-first.** A figure exists to make a decision easier. If it cannot be defended in a caption, it does not belong in the picture. No invented returns, no implied checkout availability, no undisclosed affiliate economics.
2. **Dark observatory.** The reader looks *into* the system, not at a dashboard. Deep ground, faint structure, one luminous focal point. Restraint reads as confidence.
3. **Liquid-glass panels.** Depth comes from layered translucency and hairline strokes — never from drop shadows, bevels, or skeuomorphic chrome.
4. **Gradient mesh, not gradient decoration.** Gradients carry light direction and hierarchy. A gradient that only makes something "look premium" is removed.
5. **Shader-like depth.** Orbital rings, grid substrate, and soft bloom imply a system with volume. Illusion of depth is permitted; illusion of data is not.
6. **No decorative noise.** Every mark earns its pixels. If removing an element loses no meaning, it was noise.
7. **No fake data.** Never render a number, percentage, growth curve, or logo that is not sourced and dated. Placeholder axes with fabricated values are banned outright.

**The test before shipping:** *what decision does this figure make easier, and what would a skeptical reader ask?* If the caption cannot answer both, the asset is not ready.

---

## 2. Color tokens

Four ramps. `core` is the value in production; `deep`/`high` are reserved steps in the same ramp, available to new work without re-exporting anything.

### Ground

| Token | Hex | Use | In shipped assets |
| :--- | :--- | :--- | :--- |
| `ground/deep` | `#02040A` | Reserved. Full-bleed black for pages that sit on pure black. | 0 |
| `ground/base` | `#070B12` | **Core.** Terminal stop of the ground gradient. | 5 |
| `ground/lift` | `#0A101C` | Mid stop. Panel interiors on large canvases. | 5 |
| `ground/high` | `#111B2C` | Opening stop of the gradient — where light enters. | 5 |

### Gold — authority, decision, human judgment

| Token | Hex | Use | In shipped assets |
| :--- | :--- | :--- | :--- |
| `gold/high` | `#E8B45A` | Reserved. Secondary gold on busy grounds. | 0 |
| `gold/core` | `#F5B544` | **Core.** Focal path, primary emphasis, active gate. | 50 |
| `gold/light` | `#FFE1A3` | Gradient head only. Never body text. | 5 |
| `gold/dark` | `#B97625` | Gradient tail, inactive counterpart. | 5 |

### Cyan — system, evidence, machine

| Token | Hex | Use | In shipped assets |
| :--- | :--- | :--- | :--- |
| `cyan/high` | `#6FE3F5` | Reserved. Cyan on the darkest ground. | 0 |
| `cyan/core` | `#3FD0DE` | **Core.** Secondary path, connection, verified state. | 5 |
| `cyan/light` | `#B7F5F8` | Gradient head only. | 5 |

### Ink

| Token | Hex | Role | Contrast on `ground/base` |
| :--- | :--- | :--- | :--- |
| `ink/primary` | `#EDF3F8` | Headlines, key labels | 17.62:1 |
| `ink/secondary` | `#C5D2E0` | Body, subhead | 12.83:1 |
| `ink/mist` | `#A7B9CB` | Caption, footer, meta | 9.80:1 |
| `ink/muted` | `#8DA0B7` | Non-essential structure labels | 7.36:1 |

Ratio = WCAG 2.x relative luminance against `#070B12`, computed not estimated. Every ink passes AA (4.5:1) for normal text; all pass AAA on the core ground.

**Pairing rule.** Gold means *human decision and consequence*. Cyan means *machine path and verified state*. A figure that uses gold for a data series has broken the semantic contract.

---

## 3. Depth, glass, and stroke

Panels are built from three layers, applied in this order:

| Layer | Treatment | Value |
| :--- | :--- | :--- |
| Panel fill | Neutral wash at low alpha | `fill-opacity` 0.08 (rest) / 0.12 (raised, active) / 0.45 (solid accent chip) |
| Panel edge | Hairline stroke, never a shadow | `stroke-opacity` 0.15, `stroke-width` 1 |
| Substrate | Grid or dot field behind panels | `stroke-opacity` 0.055, 32 px pitch, `#A2B7CA` |

**Blur is rationed.** Only `assets/org-mark.svg` uses a Gaussian blur (`stdDeviation="7"`, `#glow`). It is permitted for the mark's bloom and nothing else. Panels do not use blur: layered alpha plus a hairline reads as glass, survives rasterisation, and never fails to render.

**Stroke weights.**

| Weight | Meaning |
| :--- | :--- |
| 1 | Structure: panel edge, grid, divider, orbital ring |
| 1.5 | Rule or underline that separates content bands |
| 2 | Primary path — the argument the figure is making |
| 2.5 | Emphasis beat inside a primary path |
| 20 | Reserved: bloom stroke under the focal nexus only |

**Accent opacity.** Active geometry sits at 0.45, secondary at 0.30, orbital/background rings at 0.18–0.20. Nothing structural exceeds 0.5 except text and the focal point.

---

## 4. Gradients

- **Ground gradients** run 135° (top-left → bottom-right): `ground/high` → `ground/lift` → `ground/base`. Light enters at the top-left.
- **Accent gradients** run along the axis of travel — horizontally for progress and flows, never diagonally across text.
- **Radial light** is reserved for the focal nexus. One per composition.
- No gradient may cross a text baseline. If legibility requires a scrim, the layout is wrong.

---

## 5. Typography

| Property | Value |
| :--- | :--- |
| Family | `Inter, Segoe UI, Arial, sans-serif` for SVG. `Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif` for HTML. |
| Case | Sentence case for headings and body. Uppercase only for eyebrow labels, set with `letter-spacing` 2.2–5. |
| Weights | 400 body, 700 labels and eyebrow, 800 display |
| Scale | 64 display · 38 section · 25 lead · 19 body · 15 small · 12 label |

**No external fonts and no webfont requests.** The stack resolves to Inter where installed and to the system UI face everywhere else. An asset must never depend on a network font fetch to render correctly.

**One idea per panel.** One claim, one headline, at most one supporting line. If a panel needs a paragraph, it is a document, not a diagram.

---

## 6. Format grid

| Format | Canvas | Ratio | Where it is used |
| :--- | :--- | :--- | :--- |
| Masthead banner | `1600 × 400` | 4:1 | `profile/README.md` hero |
| Wide diagram | `1440 × 460–570` | ~2.6–3.1:1 | Strategic figures inside the profile |
| Social card | `1280 × 640` | 2:1 | `assets/social/*.png`, Open Graph, posts |
| Standard infographic | `1200 × 900` | 4:3 | Portrait or square-crop-tolerant figures |
| Square mark | `512 × 512` | 1:1 | Avatar, favicon source |

**Safe margins.**

- Horizontal inset: **5% of canvas width**, floor **48 px**. Masthead 80 px; wide diagrams may sit at the 48 px floor.
- Vertical inset: 5% top, **8% reserved at the bottom** for rule, caption, or footer meta.
- Nothing load-bearing enters the outer 48 px. Social cards lose edges to platform crops; keep critical content inside the central 80%.

**Canvas rules.** Always set explicit `width`, `height`, and `viewBox`. Cap width at 1600 px — GitHub renders the README at container width and larger canvases only add bytes. Every asset is self-contained: no `<image>` references, no external CSS, no network calls.

---

## 7. Captions and alternative text

**Alt text** describes the decision the figure supports, not its pixels.

- Under 125 characters. No "image of", no "this graphic shows", no colour inventory.
- Named entities and the claim only: *"Operating loop: research, model, verify, build, measure."*
- Every SVG carries `role="img"` and `aria-labelledby` pointing at a `<title>` and `<desc>`.
- The `<desc>` may run longer and should state what the figure does **not** claim.

**Caption** is mandatory wherever a figure could be read as a factual claim about returns, costs, or availability. Pair it with the standing disclaimer pattern:

> **A decision framework, not an earnings promise.** The illustration depicts the operating philosophy; it does not claim that every stage is autonomously implemented or revenue-generating.

**No text baked into raster-only assets.** Text lives in SVG `<text>` or in Markdown. A PNG may not be the only carrier of a sentence a reader needs. Social cards are the sole exception, and every card ships with the same words as alt text and as the post body.

---

## 8. Motion

Shipped assets are static. That is the default and the strongest position.

When motion is justified:

1. **Reduced motion is mandatory.** Honour `prefers-reduced-motion: reduce` with the static end-state — not a slower animation.
2. **No autoplay text.** Text never animates, types on, fades in per character, or counts up.
3. **No infinite loops.** Motion resolves and stops. Ambient drift is noise.
4. **Shader only when it carries meaning.** A gradient or particle field may animate to encode a *state transition* — a gate opening, a path completing. If the motion would read the same at any other moment, it is decoration and is cut.
5. **Static equivalent required.** Every animated asset ships a static frame that communicates the same claim, because GitHub, email clients, and print will show that frame.

---

## 9. Accessibility

| Requirement | Target |
| :--- | :--- |
| Contrast, body text | ≥ 4.5:1 against its actual ground |
| Contrast, large text (≥24 px, or ≥19 px bold) | ≥ 3:1 |
| Contrast, non-text structure | ≥ 3:1 for anything a reader must perceive to follow the figure |
| Colour as sole carrier | Forbidden — pair every colour distinction with shape, label, or position |
| Structure | `role="img"` + `<title>` + `<desc>` on every SVG |
| Text | Selectable, live text wherever the format allows it |
| Flashing | None. No asset flashes above 3 Hz |

Gold-on-ground reaches 10.86:1 and is safe for short emphasis; it is still not a body-text colour, because saturation at small sizes tires the reader before contrast does.

---

## 10. File conventions

```
assets/
  org-banner.svg            # profile masthead
  org-mark.svg              # 512×512 square mark
  economic-engine.svg       # wide diagram, topic-named
  evidence-standard.svg
  operating-loop.svg
  system-architecture.svg
  social/
    1280x640-<topic>.png    # social cards
```

- **Location.** SVGs directly in `assets/`. Raster exports in `assets/social/`.
- **Naming.** kebab-case, named for the *topic* the figure argues — never for a version, a date, or a harness. `evidence-standard.svg`, not `evidence-v3-final.svg`.
- **One asset, one claim.** A file that argues two things gets split.
- **Provenance note.** Every new asset records, in the pull request and in a comment at the top of the file: authoring harness, date, the source of any figure rendered, and the sentence *"Illustrative, not a data claim"* when no source exists. Unsourced numbers do not ship — see principle 7.
- **Reference, don't duplicate.** README embeds point at `raw.githubusercontent.com/Agentic-Income/.github/main/assets/<file>`. Never commit a copy for a second surface; link the canonical file.
- **Do not** add badges, sponsor logos, screenshots of dashboards, or partner marks without written permission. Do not add a second visual language for a single asset.

---

## 11. Compliance snapshot

Measured 2026-11-13. Deviations are grandfathered: no asset is re-exported solely to satisfy this table. It updates on the next material change to the asset.

| Asset | Canvas | `role`/`title`/`desc` | Text | Motion | Deviation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `org-banner.svg` | 1600×460 | ✓ / ✓ / ✓ | live | static | Height 460 vs 400 canonical; 80 px inset conforms |
| `economic-engine.svg` | 1440×550 | ✓ / ✓ / ✓ | live | static | 48 px inset (floor) |
| `evidence-standard.svg` | 1440×460 | ✓ / ✓ / ✓ | live | static | 48 px inset (floor) |
| `operating-loop.svg` | 1440×480 | ✓ / ✓ / ✓ | live | static | 48 px inset (floor) |
| `system-architecture.svg` | 1440×570 | ✓ / ✓ / ✓ | live | static | 48 px inset (floor) |
| `org-mark.svg` | 512×512 | ✓ / ✓ / ✓ | live | static | Sole permitted Gaussian blur |

**Known gaps.** No `assets/social/` cards exist yet, so no 1280×640 surface is in circulation. Reserved ramp steps (`ground/deep`, `gold/high`, `cyan/high`) are defined but unused; a new asset may adopt them, and doing so is not a violation.

---

## 12. Change control

1. New assets must satisfy this document at review time. The reviewer checks the figure against the principles, not against taste.
2. Existing assets migrate on their next material change — not in a dedicated re-export sweep.
3. A change to a token, a ramp step, or a format is a change to this file first, in the same pull request as the asset that needs it.
4. The profile copy and the assets are reviewed by different eyes than the ones that authored them (maker ≠ checker, per `AGENTS.md`).

---

<sub>Agentic Income · Visual System · Adopted 2026-11-13 · Owner-controlled, evidence-led</sub>
