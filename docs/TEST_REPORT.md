# Test Strategy (Stage 0 plan — no tests exist yet, no code exists yet)

## Direct tests (deterministic, mocked nondeterminism) — Stage 1–5
Every legal and illegal state transition in `STATE_MACHINE.md`; every threat row in `THREAT_MODEL.md` with a "Stage 1/4/5" tag; bounds violations (oversized text, too many rules/evidence rows); role-check rejections; replay/idempotence.

## Integration tests (mocked web, real contract logic) — Stage 2
Valid WEB_LINK evidence, unavailable page, malformed URL, unsupported scheme, oversized rendered content, prompt injection inside rendered content, cross-case evidence rejection.

## Hosted StudioNet proof — Stage 7 (not before)
Schema loads, community/constitution/case lifecycle, real semantic adjudication reaching consensus, authoritative reread matches decision, one real `gl.nondet.web.render` evidence case succeeding, one deliberately unavailable/malformed evidence case failing safely, challenge lifecycle, timeout/finality, finalized receipt, production frontend executing the full lifecycle end to end.

## Explicit rule
Mocked tests are never reported as proof of live web/consensus behavior; this file will record actual pass/fail output once tests exist (Stage 1 onward) — right now it contains only the plan.
