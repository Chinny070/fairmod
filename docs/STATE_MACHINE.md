# Case State Machine (Stage 0 design; DECIDED/NEEDS_REVIEW IMPLEMENTED in Stage 3)

## Stage 5 update
No new case states — Stage 5 adds only read/composition methods and one new non-authoritative write (`run_fairness_mirror`, which never transitions `case.state`). See [docs/STAGE_5_VERIFICATION.md](STAGE_5_VERIFICATION.md).

## Stage 4 update
`DECIDED -> CHALLENGED -> FINAL` and `DECIDED/NEEDS_REVIEW -> FINAL` (timeout) now implemented. `DECIDED` doubles as "inside its own challenge window" (a `challenge_deadline` field, not a separate state) so `adjudicate_case`'s Stage-3-tested return value never changed. No `REVIEWED` state — `resolve_challenge` moves `CHALLENGED -> FINAL` atomically. See [docs/STAGE_4_VERIFICATION.md](STAGE_4_VERIFICATION.md).

## Stage 3 update
`EVIDENCE_FROZEN -> DECIDED` (verdict ALLOWED/FLAGGED) and `EVIDENCE_FROZEN -> NEEDS_REVIEW` are now implemented via `adjudicate_case`, exactly matching this design's original transition table. Both are terminal-for-now: no method reaches `CHALLENGE_WINDOW`/`CHALLENGED`/`CHALLENGE_DECIDED`/`FINAL` yet (Stage 4). Replay-safe: adjudicating an already-`DECIDED`/`NEEDS_REVIEW` case is a no-op returning the existing status. See [docs/STAGE_3_VERIFICATION.md](STAGE_3_VERIFICATION.md).


## States
`OPEN`, `EVIDENCE_FROZEN`, `ADJUDICATING`, `DECIDED`, `NEEDS_REVIEW`, `CHALLENGE_WINDOW`, `CHALLENGED`, `CHALLENGE_DECIDED`, `FINAL`.

## Transition table

| From | To | Trigger | Authorized caller | Guard conditions | Timestamp recorded |
|---|---|---|---|---|---|
| (none) | OPEN | `create_case` | any address | community exists, community has an active constitution, bounded content/context length | `created_at` |
| OPEN | OPEN | `submit_evidence` | reporter or authorized submitter per constitution | case still OPEN, evidence count/size under bound, evidence type currently enabled (TEXT/WEB_LINK) | `submitted_at` per evidence row |
| OPEN | EVIDENCE_FROZEN | `freeze_case` | protocol-internal, called automatically once minimum evidence/timeout condition met, or explicitly by reporter/moderator per constitution policy | case is OPEN, at least the constitution-required minimum evidence state satisfied | `frozen_at`; snapshots constitution version + evidence set as immutable from this point |
| EVIDENCE_FROZEN | ADJUDICATING | `request_adjudication` | protocol-internal, triggered right after freeze (single transition, no separate human call) | case is EVIDENCE_FROZEN, not already adjudicating (idempotence guard) | `adjudication_started_at` |
| ADJUDICATING | DECIDED | consensus callback delivers valid structured verdict | GenLayer consensus only (internal write, no public entrypoint sets verdict) | verdict enum valid, Rule/Evidence IDs exist and belong to this case, no contradictory fields | `decided_at` |
| ADJUDICATING | NEEDS_REVIEW | consensus callback delivers ambiguous/malformed output, OR retrieval failure on required evidence, OR adjudication timeout elapsed | GenLayer consensus / protocol-internal timeout | malformed output fails closed here rather than being retried indefinitely | `needs_review_at`, `human_review_deadline` |
| NEEDS_REVIEW | DECIDED | authorized moderator resolves with an explicit, separately-attributed human decision | moderator with community role | resolution is recorded as a human action, never mislabeled as consensus | `human_resolved_at` |
| NEEDS_REVIEW | FINAL (as undetermined) | `human_review_deadline` elapses with no resolution | protocol-internal timeout | deterministic liveness exit — case does not hang forever | `finalized_at`, `outcome = UNDETERMINED` |
| DECIDED | CHALLENGE_WINDOW | automatic, immediately after DECIDED | protocol-internal | none beyond DECIDED | `challenge_window_opens_at`, `challenge_deadline` (bounded min/max per protocol config) |
| CHALLENGE_WINDOW | CHALLENGED | `file_challenge` | eligible challenger per constitution (e.g. case party) | before `challenge_deadline`, case has no prior challenge (bounded to one path unless spec changes), bounded grounds text | `challenged_at` |
| CHALLENGE_WINDOW | FINAL | `challenge_deadline` elapses with no challenge | protocol-internal timeout | original DECIDED outcome becomes final unchanged | `finalized_at` |
| CHALLENGED | CHALLENGE_DECIDED | targeted appellate review reaches consensus/human resolution | GenLayer consensus (and/or moderator per constitution) | original decision preserved separately from challenge result — never overwritten in place | `challenge_decided_at` |
| CHALLENGE_DECIDED | FINAL | automatic | protocol-internal | none | `finalized_at` |
| FINAL | FINAL | any further write attempt | n/a | rejected — finalized cases are immutable; no transition leaves FINAL | n/a |

## Replay/idempotence rules
- Every trigger checks the case's current state before acting; a duplicate call after a transition already happened is a no-op/explicit rejection, never a repeated side effect (guards against duplicate adjudication, duplicate finalization, double challenge filing).
- `case_id`/`evidence_id`/challenge references are protocol-assigned, so a call cannot be replayed against a different case by resubmitting the same payload.

## Liveness guarantee
Every non-terminal state has exactly one deterministic, time-bounded exit that does not require further human action: `ADJUDICATING` times out to `NEEDS_REVIEW`; `NEEDS_REVIEW` times out to `FINAL/UNDETERMINED`; `CHALLENGE_WINDOW` times out to `FINAL`. No state can wait forever.

## Open Stage 1 questions (flagged, not answered here)
- Exact numeric bounds for challenge window (spec suggests 24h default, protocol min/max not yet chosen) and human-review deadline — to be fixed as constants during Stage 1 with rationale documented in `CHALLENGES_AND_FINALITY.md`.
- Exact deterministic-time API (`gl.message`/block time equivalent) must be confirmed from the installed `genlayer` package before Stage 1 writes any timestamp code — see `EVIDENCE_CAPABILITY_MATRIX.md` toolchain note.
