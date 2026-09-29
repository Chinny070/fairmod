# FairMod Design System — "Broadsheet" (Civic Editorial / Underground Print)

## Stage 7.1 update — Refero Styles research record

The Stage 7 design-source link was inaccessible; a corrected source was supplied for Stage 7.1: **https://styles.refero.design/** (the "Refero Styles" DESIGN.md library). This section documents that research honestly.

**REFERO STYLES REVIEWED**: searched and inspected result cards for several queries run against the live site — "editorial magazine" (category chip), "warm cream paper canvas with serif display type" (→ matched **Popcorn**, opened and read in full), "hairline grid rules / archive / legal document", "newspaper serif black ink public record", and "warm cream paper serif editorial magazine" (these four follow-up queries returned only generic fallback category suggestions — e.g. "Coral & peach warmth", "Uppercase signage", "Black with one accent" — with no matching result card, so no additional DESIGN.md page could be opened and compared for them).

**SELECTED REFERO STYLE**: Popcorn

**SELECTED STYLE URL**: https://styles.refero.design/style/93fe74fd-bac8-4d13-9d5b-3b5e242f74e6

**WHY IT FITS FAIRMOD**: Popcorn's own summary describes itself as "warm broadsheet on cream paper — a near-monochrome editorial where a single serif headline does all the emotional work." That is close to verbatim what FairMod's civic-editorial identity needs: a cream/paper canvas, a high-contrast serif for display type (constitution headings, case-file titles), and a restrained, near-monochrome supporting palette that reads as a public record rather than a product. It was the only candidate found across the queries tried whose actual DESIGN.md content matched the "civic public-record" register this project needs, rather than a generic tech/consumer aesthetic.

**KEY DESIGN PRINCIPLES ADOPTED**:
- Cream canvas + warm graphite ink as the base palette (`--color-cream-canvas #f7f7f7`, `--color-warm-graphite #393737` in Popcorn's own tokens).
- A high-contrast serif for display/headline type only, paired with a plain humanist sans for all functional/body text — the same display/body split FairMod now uses (`Source Serif 4` display, `Inter` body, both Popcorn's own documented open-source substitutes for its proprietary Untitled Serif/Messina Sans).
- Aggressive negative letter-spacing on large display type (Popcorn: -0.03em at 84px) to keep serif headlines feeling like confident, tight editorial blocks rather than decorative flourishes — applied to FairMod's hero headline and case-file titles.
- A single soft elevation shadow (`rgba(0,0,0,0.05-0.06) 0 4px 20px`) used sparingly for raised surfaces (dialogs, receipt/case-content cards), not on every element.
- Near-monochrome discipline: color is used deliberately and sparingly, not as decoration.

**WHAT WAS ADAPTED RATHER THAN COPIED**:
- **Radii**: Popcorn is pill-shaped everywhere (100px radius on every button, nav, badge, icon circle) — a soft, consumer-app register. FairMod deliberately **rejected** this and kept low, formal radii (2–4px on controls, 8px on cards) appropriate to a rulebook/court record, not a consumer telecom app.
- **Color**: Popcorn is genuinely near-monochrome with almost no functional color. FairMod cannot be — verdict state (ALLOWED/FLAGGED/NEEDS_REVIEW/UNDETERMINED) must be visually distinguishable without relying on icon+label alone in every context, so FairMod keeps its own distinct green/red/amber/gray verdict colors (unchanged from Stage 7) layered on top of Popcorn's cream/graphite base, rather than adopting Popcorn's near-total desaturation.
- **Identity color**: Popcorn has no separate "brand" hue beyond graphite; FairMod keeps its own deep teal masthead ink (`--fm-masthead`) as its distinct outlet identity, since Popcorn's own palette has nothing analogous to adopt.
- **Components**: Popcorn's phone-mockup hero, conic-gradient halo, and pill CTA button are telecom-product-specific and were not carried over at all — FairMod's masthead/case-file/rulebook composition is its own.

**FAIRMOD-SPECIFIC DESIGN CHANGES** (beyond what Popcorn provides at all): editorial case-file header treatment (double-rule border, monospace "issue number" case ID), non-authoritative dashed-border treatment for precedent/Fairness Mirror sections, verdict badges that always pair an icon glyph with a text label, and the confirmation-dialog pattern for sensitive role/constitution-activation actions — none of these exist in Popcorn's own component list, since Popcorn is a marketing/product landing page system, not an application with stateful records.

Full token values: `frontend/src/styles/tokens.css` (updated this stage with inline provenance comments pointing back to this section).

## Palette — "Broadsheet" (updated Stage 7.1)

| Token | Light | Dark | Source |
|---|---|---|---|
| `--fm-paper` | `#f7f4ee` | `#1c1a16` | Popcorn Cream Canvas, adapted |
| `--fm-ink` | `#393737` | `#eae6dd` | Popcorn Warm Graphite, used directly (light mode) |
| `--fm-ink-faint` | `#888787` | `#918c80` | Popcorn Fog Gray, used directly (light mode) |
| `--fm-masthead` | `#1f3a3d` | `#6ea8ab` | FairMod-specific (Popcorn has no analogous brand hue) |
| `--fm-allowed` / `--fm-flagged` / `--fm-review` / `--fm-undetermined` | civic ledger green / stamp red / amber / gray | (dark variants) | FairMod-specific — Popcorn's near-monochrome system has no functional status colors to adopt |
| `--fm-shadow-lg` | `rgba(0,0,0,0.06) 0 4px 20px` | `rgba(0,0,0,0.3) 0 4px 20px` | Popcorn's own soft elevation shadow, used directly |

## Typography (updated Stage 7.1)

`Source Serif 4` (Popcorn's own documented substitute for Untitled Serif) for display/headline type only; `Inter` (Popcorn's own documented substitute for Messina Sans) for all body/functional text — a real change from Stage 7's single-serif-everywhere system, which read as more uniform than editorial. `IBM Plex Mono` remains reserved for IDs/hashes/fingerprints/addresses (FairMod-specific, no Popcorn analogue).

## Visual completion status (Stage 7.1)

Editorial hierarchy strengthened: case-file "issue number" treatment (monospace, uppercase case ID above a double-rule divider), section dividers between every case-file section, a raised soft-shadow content card for reported content, confirmation dialogs for role/activation changes styled as raised cards. Marginalia/illustrated procedural stamps were still not produced — palette, typography, spacing, and compositional rules are real and applied throughout; hand-illustrated ornamentation remains a disclosed, not-yet-built item, not fabricated or claimed complete.
