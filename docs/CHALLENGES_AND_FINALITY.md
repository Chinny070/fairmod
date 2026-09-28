# Challenges & Finality Design (Stage 0)

Implements Stage 4. See `STATE_MACHINE.md` for the full transition table this elaborates.

## Challenge model
Application-level only — explicitly distinct from any GenLayer protocol-level appeal/finality mechanism. One bounded challenge path per case (per product spec, "no infinite appeal loops"; a future spec change would need explicit approval to allow more). Eligible challenger, bounded grounds text, deterministic deadline computed from `decided_at` + community's configured window, itself clamped to a protocol-enforced [min, max] regardless of what a community configures (default suggested 24h per spec).

## Original-decision preservation
`CHALLENGED` never overwrites the DECIDED record; the challenge result is a separate `challenge_decision` field. Both are visible in the final Moderation Receipt.

## Timeout/liveness
`CHALLENGE_WINDOW` -> `FINAL` automatically if no challenge filed by deadline. `NEEDS_REVIEW` -> `FINAL/UNDETERMINED` automatically if no human resolution by its deadline. Neither requires a human transaction to unstick.

## Human-review deadline
Separate configurable-but-bounded window from the challenge window; set when a case enters `NEEDS_REVIEW`.

## Test plan (executed in Stage 4, listed here for design completeness)
Valid challenge, invalid/wrong-case challenge, duplicate challenge, late challenge, no-challenge timeout path, human-review timeout path, attempted mutation of an already-FINAL case (must reject).
