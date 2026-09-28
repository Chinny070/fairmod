# Adjudication Design (Stage 0; IMPLEMENTED in Stage 3)

## Stage 3 implementation status
Implemented in `contracts/fairmod.py` (`adjudicate_case`, `_validate_candidate`, `_frozen_rule_definitions_text`, `_frozen_evidence_text`). 28 tests passing (mocked LLM via `gltest.direct`). Full detail in [docs/STAGE_3_VERIFICATION.md](STAGE_3_VERIFICATION.md), including the exact bounds, equivalence principle text, and honest UNVERIFIED items (leader/validator judge step, real hosted proof — blocked by [genvm-manager#50](https://github.com/genlayerlabs/genvm-manager/issues/50)).


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
`gl.eq_principle.prompt_comparative(fn, principle)` (source-verified in `GENVM_API_VERIFICATION.md`) with a principle string requiring agreement on verdict + relied-on rule/evidence IDs, not verbatim rationale text — rationale itself is not equivalence-compared, consistent with "do not strict-compare free-form rationale." Note the confirmed mechanics: each validator re-runs the adjudication closure itself and the judgment compares `leader_answer` vs `validator_answer` against `principle`, so this also satisfies "no single LLM/browser fetch followed by blind acceptance."

## Prompt-injection tests (Stage 3 deliverable, planned here)
"ignore previous instructions", fake system-prompt text, fake Rule/Evidence IDs asserted inside evidence text, JSON-escape/breakout attempts, injected text inside rendered web pages. Pass condition: output schema validation rejects/ignores the injected instruction and the case does not receive an unsupported verdict.
