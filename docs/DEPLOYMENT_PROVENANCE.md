# Deployment & Source-Provenance Plan (Stage 0 — nothing deployed yet)

## Stage 6 update
The Stage 6 release-candidate source hash is `417cf3de5fef4e6e3a28c0d63510771f18e923dcf42a1f94295a1dc7d3c72d36` (changed from the Stage 5 hash `119309fe6c2b3d17c7349a2bc752431edc1f25aaa3dace79c9e77284aaea75ca` by exactly the two-guard structured-output hardening fix described in [docs/STAGE_6_ADVERSARIAL_AUDIT.md](STAGE_6_ADVERSARIAL_AUDIT.md); no other line changed). This is the candidate a future deployment stage would freeze under step 1 below — nothing in this update changes the fact that **nothing has been deployed**: the StudioNet `invalid_contract` execution-layer blocker ([genvm-manager#50](https://github.com/genlayerlabs/genvm-manager/issues/50)) remains open, reconfirmed this stage (0 comments), and this stage took no deployment/wallet/Depends action per standing instruction.

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
