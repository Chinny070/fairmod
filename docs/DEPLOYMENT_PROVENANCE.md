# Deployment & Source-Provenance Plan (Stage 0 — nothing deployed yet)

Sequence to be followed at release time (Stage 9), recorded here as the committed plan:
1. Freeze the exact source candidate; record its SHA-256.
2. Record toolchain versions used (this session's baseline: Python 3.12.10, Node v24.14.0, npm 11.9.0, `genlayer` CLI 0.39.2, `genlayer-js@1.1.8`).
3. `genvm-lint check` passes on the frozen candidate.
4. Direct tests pass; integration tests run for consensus/web paths.
5. Confirm target network is `studionet`/`61999` before deploying — no silent network switch.
6. Deploy the exact frozen source; record the deployment transaction hash and resulting contract address.
7. Independently inspect the deployed contract's schema/source where GenVM tooling supports it, and confirm it matches the frozen candidate (not just "trust the deploy log").
8. Configure the production frontend's canonical config (see `FRONTEND_INTEGRATION.md`) to that exact address — no duplicate/stale address elsewhere in the frontend.
9. Rerun the full lifecycle against the live deployment and record transaction evidence.
10. Any post-freeze contract change invalidates the recorded hash and restarts this sequence.

Nothing in this file is a claim that any of the above has happened — it is the procedure Stage 9 must follow and that Stage 8's audit will check was actually followed against real deployment artifacts, not documentation claims.
