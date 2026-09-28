# Constitution & Rules Design (Stage 0)

## Rule shape
Each Rule: `rule_id` (stable, protocol-assigned, never reused), `title` (bounded, e.g. <= 80 chars), `semantic_definition` (bounded, e.g. <= 1000 chars — this is what the LLM reasons over, not a keyword list), `severity/category` enum, `exceptions` (bounded list of short strings), `context_requirements` (whether parent/thread context may be considered), `evidence_policy` (which evidence types this rule permits, e.g. a no-malicious-links rule permits WEB_LINK), `intended_consequence` (informational only — enforcement stays outside FairMod's scope beyond ALLOWED/FLAGGED/NEEDS_REVIEW).

## Starter templates (drafts only until activated)
General community, DAO, gaming, marketplace/forum — each a bounded set of rules (no spam, no harassment, no impersonation, no malicious links, plus category-specific ones e.g. "no fake giveaway links" for gaming). Templates ship as data, not code paths — activating one is just calling `activate_constitution` with that template's rule set.

## Versioning mechanics
`draft_constitution(community_id, rules[])` -> stored as a draft, mutable. `activate_constitution(community_id, draft_id)` -> assigns next version number for that community, computes and stores an immutable content commitment (hash of the serialized rule set) and activation timestamp, and becomes the community's `active_constitution_version`. Prior versions are retained forever, retirement timestamp set to the new version's activation timestamp. A case created while version N is active binds to N permanently regardless of later versions.

## Stable Rule IDs across versions
Rule IDs are protocol-assigned per version (`(community_id, version, rule_id)`); a rule carried forward unchanged into v(n+1) gets a fresh ID scoped to that version rather than being "the same" ID reused — this avoids ambiguity about which version's exact wording a historical case relied on, at the cost of the frontend needing to show "this rule also existed as vN rule X" as a display-layer link rather than an identity claim. (Alternative — a cross-version stable logical rule key plus per-version snapshot — is a Stage 1 design choice to finalize with the user before storage schema is coded.)

## Bounds (defaults, to be confirmed numerically in Stage 1)
Max rules per constitution, max title/definition/exception lengths, max constitutions per community history (unbounded storage growth risk flagged — Stage 1 must confirm GenLayer storage cost model before picking a cap).
