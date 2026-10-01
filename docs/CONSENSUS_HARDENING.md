# FairMod consensus hardening

## Scope

This is a targeted hardening pass for the existing `adjudicate_case` nondeterministic consensus boundary. It does not change FairMod's public schema, storage, role model, evidence model, state machine, prompts for adjudication, or decision outcomes.

The hardened source SHA-256 is `2ad077c7970b8ef09c3a1ba6ed5744e3c1ad4f68b56562c9f21f298de8e0c5be`. It was prepared from repository commit `dd87506122a54078c7105208d85c7ec73105361b`; the hardening commit is recorded in the repository history with this document.

## Actual execution path

`adjudicate_case` builds its prompt only from the case's frozen constitution, content, context, and evidence. Its `_fn` closure executes `gl.nondet.exec_prompt`, then validates and bounds the structured result before it can be considered for persistence.

The pinned GenLayer standard-library implementation of `gl.eq_principle.prompt_comparative` invokes `_fn` separately on the leader and each validator. The validator path receives both serialized results as `leader_answer` and `validator_answer` in the `EqComparative` template alongside the FairMod principle. A validator therefore does not accept a leader-provided verdict without independently producing its own candidate.

## Binding and non-binding fields

| Candidate field | Independently recomputed | Consensus treatment | Persisted moderation meaning |
| --- | --- | --- | --- |
| `ok` / `reason` | Yes | Valid and invalid candidates cannot agree; invalid candidates must share the reason | Routes uncertainty to `NEEDS_REVIEW` |
| `verdict` | Yes | Exact match required | Binding |
| `violated_rule_ids` | Yes | Exact set match required; order is non-binding | Binding |
| `evidence_used` | Yes | Exact set match required; partial overlap is rejected | Binding provenance |
| `material_facts` | Yes | Must be non-contradictory on decision-driving facts; equivalent phrasing may vary | Binding interpretive record |
| `explanation` | Yes | Non-binding prose; wording may vary | Human-readable rationale only |

The result returned from a successful equivalence operation is still validated before persistence. A failure in the nondeterministic/equivalence call follows the existing `NEEDS_REVIEW_NONDET_FAILURE` path rather than silently recording a `DECIDED` outcome.

## Verification boundary

`gltest.direct` validates FairMod's closure, prompt construction, structured-output validation, state transition, and the exact binding policy supplied to GenLayer. It cannot emulate the hosted `EqComparative` judge with independently supplied leader and validator responses. Consequently, the local regressions prove that the contract submits the strengthened policy, not that a particular hosted validator pair has disagreed. Hosted multi-validator disagreement behavior must be evidenced separately on StudioNet; it is not inferred from local mocks.
