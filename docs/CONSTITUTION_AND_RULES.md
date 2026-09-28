# Constitution & Rules Design (Stage 0)

## Rule shape
Each Rule: `rule_id` (stable, protocol-assigned, never reused), `title` (bounded, e.g. <= 80 chars), `semantic_definition` (bounded, e.g. <= 1000 chars — this is what the LLM reasons over, not a keyword list), `severity/category` enum, `exceptions` (bounded list of short strings), `context_requirements` (whether parent/thread context may be considered), `evidence_policy` (which evidence types this rule permits, e.g. a no-malicious-links rule permits WEB_LINK), `intended_consequence` (informational only — enforcement stays outside FairMod's scope beyond ALLOWED/FLAGGED/NEEDS_REVIEW).

## Starter templates (drafts only until activated)
General community, DAO, gaming, marketplace/forum — each a bounded set of rules (no spam, no harassment, no impersonation, no malicious links, plus category-specific ones e.g. "no fake giveaway links" for gaming). Templates ship as data, not code paths — activating one is just calling `activate_constitution` with that template's rule set.

## Versioning mechanics
`draft_constitution(community_id, rules[])` -> stored as a draft, mutable. `activate_constitution(community_id, draft_id)` -> assigns next version number for that community, computes and stores an immutable content commitment (hash of the serialized rule set) and activation timestamp, and becomes the community's `active_constitution_version`. Prior versions are retained forever, retirement timestamp set to the new version's activation timestamp. A case created while version N is active binds to N permanently regardless of later versions.

## Stable Rule IDs across versions — USER DECISION (finalized)
Rule IDs are **stable logical keys across constitution versions**, not per-version-scoped IDs. E.g. `HARASSMENT`, `IMPERSONATION`, `SPAM`, `MALICIOUS_LINK` are fixed logical identifiers within a community that persist across constitution versions. Each activated constitution version stores its own immutable revision/definition text for that logical rule ID — the ID stays constant, only the definition attached to it can change between versions.

Storage consequence: a case must bind **both** `constitution_version` and the set of `rule_id`s it relies on. Adjudication always resolves `(community_id, constitution_version, rule_id) -> definition` — i.e. the lookup key includes the frozen version, so a later constitution version editing `HARASSMENT`'s wording never changes what an older, already-decided case is understood to have meant. A newer constitution may drop a logical rule ID (no longer part of the active set) or add a new one; historical cases keep referencing exactly the frozen version's rule set regardless.

Conceptually: `rules: TreeMap[(community_id, version) -> TreeMap[rule_id -> RuleDefinition]]`, where `rule_id` is a stable string key chosen at rule-authoring time (not protocol-assigned like `case_id`/`evidence_id`), scoped uniquely within its community. Precedent Explorer (Stage 5) can therefore group historical cases by logical `rule_id` across versions ("show me every HARASSMENT case regardless of which constitution version decided it") while each individual case's Moderation Receipt still shows the exact frozen definition text it was actually judged under.

## Bounds (defaults, to be confirmed numerically in Stage 1)
Max rules per constitution, max title/definition/exception lengths, max constitutions per community history (unbounded storage growth risk flagged — Stage 1 must confirm GenLayer storage cost model before picking a cap).
