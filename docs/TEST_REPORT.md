# Test Strategy (Stage 0 plan; Stage 1/2 actually executed — see below)

## Actual results (Stage 1 + Stage 2)
93/93 tests passing via `gltest.direct` (pure in-memory, no Docker/localnet — see docs/STAGE_1_VERIFICATION.md for why the localnet path is environment-blocked and how `gltest.direct` was found and used instead). 49 Stage 1 (community/roles/constitutions/cases/context/evidence-records/freeze/state-machine/timestamps) + 44 Stage 2 (URL validation/DOCUMENT routing/fingerprints/acquisition state transitions/prompt-injection/visual evidence/replay/retry/authority). Command: `python -m pytest test/ -q`. Full detail in docs/STAGE_1_VERIFICATION.md and docs/STAGE_2_VERIFICATION.md — this file's original plan below is retained for what Stage 7 hosted proof still owes.

---


## Direct tests (deterministic, mocked nondeterminism) — Stage 1–5
Every legal and illegal state transition in `STATE_MACHINE.md`; every threat row in `THREAT_MODEL.md` with a "Stage 1/4/5" tag; bounds violations (oversized text, too many rules/evidence rows); role-check rejections; replay/idempotence.

## Integration tests (mocked web, real contract logic) — Stage 2
Valid WEB_LINK evidence, unavailable page, malformed URL, unsupported scheme, oversized rendered content, prompt injection inside rendered content, cross-case evidence rejection.

## Hosted StudioNet proof — Stage 7 (not before)
Schema loads, community/constitution/case lifecycle, real semantic adjudication reaching consensus, authoritative reread matches decision, one real `gl.nondet.web.render` evidence case succeeding, one deliberately unavailable/malformed evidence case failing safely, challenge lifecycle, timeout/finality, finalized receipt, production frontend executing the full lifecycle end to end.

## Explicit rule
Mocked tests are never reported as proof of live web/consensus behavior; this file will record actual pass/fail output once tests exist (Stage 1 onward) — right now it contains only the plan.
