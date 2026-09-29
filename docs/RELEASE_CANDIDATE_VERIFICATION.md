# Stage 6 — Release Candidate Verification

See [STAGE_6_ADVERSARIAL_AUDIT.md](STAGE_6_ADVERSARIAL_AUDIT.md) for the full findings. This file holds the required category scoring and the final classification.

## Scoring

Scored only in 20/40/60/80/100% increments; 100% withheld everywhere hosted proof is absent, per instruction.

| Category | Score | Basis |
|---|---|---|
| Attack-surface mapping | 100% | All 30 methods traced to their actual enforced authority/guards, not docstrings |
| Authority / privilege escalation | 100% | No escalation path found across every attempted vector (§2) |
| Community isolation | 100% | Structurally namespaced on every subsystem; verified, not assumed (§3) |
| Constitution / rule integrity | 100% | No reactivation/retroactive-rewrite path exists (§4) |
| State machine correctness | 100% | Full reachable graph re-derived from code; every illegal transition tested/rejected; no locked state (§5) |
| Replay / idempotence | 100% | Every terminal-ish write re-checks state before mutating; counters proven non-double-counting (§6) |
| Evidence authority | 100% | Cross-case reference structurally impossible; mutation-after-freeze impossible (§7) |
| Web security (contract-layer) | 80% | Disclosed trust boundary intact; one narrow, disclosed, unfixed gap (IPv6-bracket literal) — not 100% while an accepted local gap remains |
| Changing-web (DIVERGENT) handling | 40% | Reachable only via mocked exception classification locally; real cross-validator divergence UNVERIFIED |
| Prompt-injection resistance | 100% | All four prompts structurally separate trusted/untrusted sections; enforcement backstopped by structured-output validation, not by the model's own good behavior |
| Structured-output validation | 100% | One real gap found and fixed this stage (converse rule-ID contradiction); no other gap found on re-audit |
| Equivalence-principle usage | 100% | All 5 call sites use `prompt_comparative` with a principle naming exact material-agreement terms; none downgraded to `strict_eq` |
| Independent validator acquisition | 60% | Closure structure proves independent re-execution is requested; real multi-validator execution UNVERIFIED without hosted proof |
| Timestamps / deadlines | 100% | No caller-supplied timestamp reaches any field; boundary semantics re-derived algebraically, no gap/overlap |
| Challenge integrity | 100% | Every attack in §15 rejected; original decision provably immutable |
| Finality / liveness | 100% | Every non-terminal state has a permissionless progression route |
| Receipt integrity | 100% | Receipt is a pure read composition with no second storage copy — cannot drift by construction |
| Precedent handling | 100% | Non-authoritative by construction; never consumed by adjudication (verified against actual prompt text) |
| Fairness Mirror handling | 100% | Write set structurally limited to 4 dedicated fields; one-run-per-case enforced |
| Counter conservation | 100% | All four invariants re-derived from code and hold |
| History / pagination | 100% | All boundary values tested; deterministic, non-leaking |
| Storage / resource bounds | 80% | Every field bounded; community/case *count* is uncapped by design (disclosed permissionless-product trade-off, not a defect) — 80% reflects that this is an accepted trust boundary, not a proven-safe bound |
| Failed-write atomicity | 40% | Contract-level ordering puts all guards before mutations; real GenVM transaction rollback UNVERIFIED locally |
| Schema / API surface | 100% | No accidental public exposure; no unnecessary method; unchanged public surface this stage |
| Test quality | 80% | Mutation-style check passed on the new guards; one real gap existed pre-stage (now closed) — 80% because a full mutation-testing pass over the entire 190-test suite was not exhaustively re-run this stage |
| Originality / product coherence | 100% | Every claimed capability has substantive, traced implementation |

## Final classification

**RELEASE CANDIDATE: YES.**

No known Critical or High-severity blocker remains locally. The one Medium finding (contradictory ALLOWED/OVERTURN-ALLOWED rule-ID citations) was demonstrated, fixed with the smallest possible patch, and regression-tested; the one Low finding (IPv6-bracket-literal gap in the disclosed, non-general-purpose SSRF blocklist) is explicitly accepted and documented rather than silently ignored. All local quality gates pass: `genvm-lint` clean, 192/192 tests passing, schema regenerated and unchanged (byte-identical to Stage 5's), public API stable at 30 methods.

This YES does **not** mean StudioNet deployment has been proven — `genlayerlabs/genvm-manager#50` remains open and unresolved, and every property in "Unverified hosted properties" above (independent multi-validator execution, real DIVERGENT handling, real transaction rollback, real cross-validator consensus on adjudication) remains exactly as unverified as it was at the end of Stage 5. RELEASE CANDIDATE here means: the contract, as a complete local artifact, has been adversarially re-examined end-to-end, found to have exactly one real defect (now fixed) and one disclosed accepted gap, and is not blocked from proceeding to frontend/hosted-verification work by any known local defect.
