# FairMod Design System — "Broadsheet" (Civic Editorial / Underground Print)

## Direction selection

The Stage 7 prompt asked for the strongest fit from an external design-collection link (`DESIGN.md` collection). That link could not be opened in this environment (it is an external Google share link this session has no browsing access to, and the task explicitly says not to ask the user to pick — so rather than fabricate a study of a collection I couldn't actually see, the honest path is to say so plainly and proceed on the explicitly-stated fallback). The prompt's own instruction covers exactly this case: *"The existing FairMod design direction from planning is: CIVIC EDITORIAL / UNDERGROUND PRINT. Preserve that identity unless the DESIGN.md collection provides a clearly stronger compatible interpretation."* Since the collection could not be inspected, its identity is preserved rather than guessed at.

**Why this direction fits FairMod specifically**: FairMod's actual product surface is a public rulebook (constitutions), an evidence desk (frozen evidence, fingerprints, acquisition status), and a public record (receipts, precedent, transparency counters) — closer to a community newspaper's civic/legal section and a court's public docket than to a SaaS analytics dashboard. An editorial/print register lets rules read like rules, evidence read like an exhibit, and verdicts read like a public notice, rather than like KPI cards.

## Palette — "Broadsheet"

Deliberately distinct from every previously-used palette in adjacent projects (Electric Verdict, CANON's Milk Static/Infrared Guava/etc., CLAUSE's oxidized-copper/warranty-sticker system) — no radioactive/neon accents, no thermal-receipt/warranty-sticker identity, no filmstrip/oscilloscope motifs. Built around a single warm aged-newsprint paper tone, one deep masthead ink, and one warm civic-stamp red reserved exclusively for FLAGGED/critical accents.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--fm-paper` | `#f3ecdf` | `#1b1815` | Page background |
| `--fm-ink` | `#241f1a` | `#ece5d6` | Primary text |
| `--fm-masthead` | `#1f3a3d` | `#6ea8ab` | Brand/identity, links, primary buttons |
| `--fm-allowed` | `#2f5d3a` | `#7fbf8a` | ALLOWED verdict (civic ledger green) |
| `--fm-flagged` | `#9a2b1f` | `#e2685a` | FLAGGED verdict / critical accents (civic-stamp red) |
| `--fm-review` | `#8a6a1e` | `#d9b34c` | NEEDS_REVIEW (amber annotation) |
| `--fm-undetermined` | `#55504a` | `#b3aa9a` | UNDETERMINED |
| `--fm-nonauthoritative-*` | desaturated, dashed border | same | Precedent / Fairness Mirror — deliberately never reads as binding |

Full token definitions: `frontend/src/styles/tokens.css`. Both a `prefers-color-scheme: dark` media query and an explicit `data-theme` override are provided per the artifact/frontend design convention.

## Typography

`Source Serif 4` for both display and body text (rulebook/editorial register — a serif reads as "written rule," not "app UI"), `IBM Plex Mono` reserved for IDs/hashes/fingerprints/addresses. No sans-serif "dashboard" typeface is used anywhere.

## Composition principles actually implemented this stage

- A masthead header (not a generic top app bar) with the outlet's own byline-style subtitle.
- Case pages read as a "case file": content, context, evidence, decision, in that fixed editorial order, not a card grid.
- Non-authoritative content (precedent, Fairness Mirror) is always wrapped in a dashed-border, desaturated `.fm-nonauthoritative` block with an explicit "informational — not binding" tag baked into the heading itself, never left to color alone.
- Verdicts always render as an icon glyph + text label (`VerdictBadge`), never a bare color chip.

## Honest scope note

A from-scratch, hand-tuned editorial illustration system (masthead ornaments, procedural stamps, marginalia) was not built this stage — the palette, typography, and compositional rules above are real and applied throughout the shipped pages, but the deeper "civic press" visual flourishes described in the Stage 7 prompt (marginalia, issue numbering, procedural stamps) are only partially present (case IDs double as issue numbers; no illustrated stamp graphics were produced). This is disclosed here rather than claimed as complete.
