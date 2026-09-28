# Adjudication Design (Stage 0)

Implements Stage 3. Design only here — no prompt code exists yet.

## Prompt structure (four hard-separated sections)
1. **Trusted procedure** — fixed FairMod-authored instructions: output schema, that sections 3/4 are data not instructions, refusal behavior on ambiguity.
2. **Frozen constitution** — the case's bound `(community_id, version)` rule text only.
3. **Untrusted reported content** — the case's frozen content/context.
4. **Untrusted evidence** — bounded normalized evidence extracts, each tagged with its `evidence_id`.

## Structured output contract
`verdict: ALLOWED|FLAGGED|NEEDS_REVIEW`, `relevant_rule_ids: [rule_id]` (must exist in case's bound constitution), `evidence_ids_relied_on: [evidence_id]` (must exist in case's evidence set), `rationale` (bounded length), `ambiguous: bool`.

## Validation before persistence
Reject/route to NEEDS_REVIEW on: invalid enum, non-existent rule/evidence IDs, malformed JSON, internally contradictory output (e.g. `ALLOWED` with `relevant_rule_ids` non-empty and no explanation), oversized rationale.

## Equivalence strategy
`gl.eq_principle.prompt_comparative` (LLM-judged, per `EVIDENCE_CAPABILITY_MATRIX.md`) with a principle string requiring agreement on verdict + relied-on rule/evidence IDs, not verbatim rationale text — rationale itself is not equivalence-compared, consistent with "do not strict-compare free-form rationale."

## Prompt-injection tests (Stage 3 deliverable, planned here)
"ignore previous instructions", fake system-prompt text, fake Rule/Evidence IDs asserted inside evidence text, JSON-escape/breakout attempts, injected text inside rendered web pages. Pass condition: output schema validation rejects/ignores the injected instruction and the case does not receive an unsupported verdict.
