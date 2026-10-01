# Adjudication Design (Stage 0; IMPLEMENTED in Stage 3)

## Stage 5 update
Fairness Mirror (`run_fairness_mirror`) is a THIRD, distinct semantic-reasoning entrypoint alongside `adjudicate_case`/`resolve_challenge` — structurally guaranteed non-authoritative (writes only to dedicated `fairness_mirror_*` fields, never to any verdict field). Precedent (`get_case_precedents`) is a pure deterministic read with no nondeterministic reasoning at all, and is never consulted by any adjudication prompt — verified by capturing the actual adjudication prompt string. See [docs/STAGE_5_VERIFICATION.md](STAGE_5_VERIFICATION.md).

## Stage 4 update
Challenge resolution (`resolve_challenge`) asks a structurally different question than the original adjudication — see [docs/STAGE_4_VERIFICATION.md](STAGE_4_VERIFICATION.md#challenge-is-not-a-second-vote-closure-section-8). The original decision is untrusted case state, not a command to preserve; overturned Rule IDs are validated against the SAME frozen constitution version as the original decision.

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
`gl.eq_principle.prompt_comparative(fn, principle)` (source-verified in `GENVM_API_VERIFICATION.md`) is used without a strict comparison of prose. Each validator re-runs the adjudication closure itself; the GenLayer SDK gives `EqComparative` both complete validated candidate objects as `leader_answer` and `validator_answer`.

The binding comparison policy is explicit: the candidates must agree on `ok`/failure reason, verdict, the exact set of violated Rule IDs, and the exact set of evidence IDs used. `material_facts` must not contradict on decision-driving facts. `explanation` is intentionally non-binding, and differently worded/non-contradictory descriptions of the same material facts may agree. Thus a verdict-only match, a `FLAGGED` decision under different Rule IDs, or partial overlap in evidence IDs is not sufficient to finalize a `DECIDED` result. If the nondeterministic/equivalence path fails, the contract routes the case to its existing `NEEDS_REVIEW` uncertainty path; exact hosted behavior for a validator disagreement remains a runtime property and is separately documented as requiring hosted proof.

## Prompt-injection tests (Stage 3 deliverable, planned here)
"ignore previous instructions", fake system-prompt text, fake Rule/Evidence IDs asserted inside evidence text, JSON-escape/breakout attempts, injected text inside rendered web pages. Pass condition: output schema validation rejects/ignores the injected instruction and the case does not receive an unsupported verdict.
