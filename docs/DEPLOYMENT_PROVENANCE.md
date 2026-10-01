# Deployment & Source-Provenance (Stage 0 plan; current status below)

## Stage 6 update
> Historical Stage 6 provenance, preserved as written for that stage. It predates the header-boundary correction and subsequent StudioNet deployments; its “nothing has been deployed” statement is not current.

## Current deployment provenance (2026-10-01)

The current source is `contracts/fairmod.py`, SHA-256 `2ad077c7970b8ef09c3a1ba6ed5744e3c1ad4f68b56562c9f21f298de8e0c5be`, contract hardening commit `0cc4d30b7ce5ad309c6839850c7844f45eb39cfa`, in repository release `7d89fa0ea682183d1c8ea4db047f801c19ac09a6`. It is deployed at `0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f` by transaction `0x3bde02c3690c03175a7601622c8b0cd82851a24031d5fcb40e48a223de7647ad`. StudioNet Explorer showed FINALIZED / GenVM SUCCESS; the live code query matches the complete repository source after newline normalization, and the live schema exposes 30 methods (14 view, 16 write). The former `0x234…F450` deployment is superseded. Details and current lifecycle evidence: `docs/CANONICAL_DEPLOYMENT_VERIFICATION.md`.

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
