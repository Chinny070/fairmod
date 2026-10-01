# Test Strategy (Stage 0 plan; Stage 1/2 actually executed — see below)

## Current release regression (2026-10-01)

`python -m pytest test/`: **200 collected, 200 passed, 0 failed, 0 skipped, 0 errors** (one Windows pytest-cache permission warning; tests all completed). Current canonical deployment and source evidence: `docs/CANONICAL_DEPLOYMENT_VERIFICATION.md`.

## Actual results (Stage 1 + Stage 2 + Stage 3 + Stage 4 + Stage 5 + Stage 6)
192/192 tests passing (190 Stage 1-5 regression, unchanged + 2 new Stage 6 regression tests demonstrating and closing the one defect found by the Stage 6 adversarial audit — see [docs/STAGE_6_ADVERSARIAL_AUDIT.md](STAGE_6_ADVERSARIAL_AUDIT.md)). `genvm-lint` clean, schema unchanged (30 methods, byte-identical `fairmod_schema.json`). Hosted StudioNet proof remains blocked by genlayerlabs/genvm-manager#50 (reconfirmed still open, 0 comments, this stage).

## Earlier results (Stage 1 + Stage 2 + Stage 3 + Stage 4 + Stage 5)
190/190 tests passing (153 Stage 1-4 regression, unchanged + 37 Stage 5 receipts/history/precedent/Fairness Mirror/counters/scale tests). See docs/STAGE_5_VERIFICATION.md. Hosted StudioNet proof remains blocked by genlayerlabs/genvm-manager#50 (confirmed still open, 0 comments, this stage).

## Earlier results (Stage 1 + Stage 2 + Stage 3 + Stage 4)
153/153 tests passing (121 Stage 1/2/3 regression, one legitimately updated for Stage 4's new `finalize_case` method — see docs/STAGE_4_VERIFICATION.md — + 32 Stage 4 challenge/deadline/finality/liveness tests). Hosted StudioNet proof remains blocked by genlayerlabs/genvm-manager#50.

## Earlier results (Stage 1 + Stage 2 + Stage 3)
121/121 tests passing (93 Stage 1/2 regression + 28 Stage 3 semantic adjudication, mocked LLM via `gltest.direct`). See docs/STAGE_3_VERIFICATION.md. Hosted StudioNet proof remains blocked network-side by genlayerlabs/genvm-manager#50 — not attempted.

## Earlier results (Stage 1 + Stage 2)
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
