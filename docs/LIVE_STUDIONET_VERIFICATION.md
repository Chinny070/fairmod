# Live StudioNet Verification Log (Stage 0 — empty; no live actions performed)

This file will record, per Stage 7's required proofs, each live StudioNet action actually executed (transaction hash, block/read result, timestamp, what was verified) as they happen. Per the build brief: "Documentation is not proof. Mark anything not independently exercised as UNVERIFIED."

Status as of Stage 0 (2026-09-28): **no wallet connected, no transaction submitted, no network state modified.** All Stage 7 proof items (schema load, reads, community creation, constitution activation, case creation, evidence freeze, semantic adjudication consensus, authoritative reread, real web-render evidence case, malicious/unavailable evidence handling, challenge lifecycle, timeout/finality, finalized receipt, production frontend lifecycle) are UNVERIFIED — none attempted.

## StudioNet 61999 toolchain cleanroom — clean probe development/test deployment (2026-09-29)

One real, authorized development/test transaction was submitted using the disposable `my-studionet-wallet` account (`0xaffe15eec45b68835cc9e5b4ab85dd5deae8e70b`) to deploy `diagnostics/studionet_61999_clean_probe.py` (SHA-256 `493d0fc4a7ce8e64c54262cc21aea12d92ef8f730e29056f45c1ca40abfcaca8`) via the repository-local `genlayer` CLI `0.39.1`.

- **Transaction hash**: `0xdbd7e25d27dbb80b95823a3d7c4bb31f91063d9f202452234ba02a8ab7bc01ab`
- **Resulting contract address**: `0xDEf36e64CC9E3FEaa20b55CaC9489900a1Fa7127`
- **Protocol status**: FINALIZED (confirmed via CLI receipt and independently via `explorer-studio.genlayer.com`)
- **GenVM execution result**: ERROR — Result Code `Contract Error`, Error Message `invalid_contract`
- **Contract queryable**: NO — `schema`/`code` both return "Contract ... not found"

Full detail, comparison against the two earlier failed deployments, and toolchain-contamination cross-check in [docs/STUDIONET_61999_CLEAN_PROBE_RESULT.md](STUDIONET_61999_CLEAN_PROBE_RESULT.md). This is the first genuinely live StudioNet action recorded in this file. No canonical/final wallet was used; no FairMod deployment was attempted.

## StudioNet 61999 header-boundary fix — clean probe redeployment, BREAKTHROUGH (2026-09-29)

Following a hypothesis that the long introductory `#`-comment block between the `Depends` header and the first `import` (present in every one of the four prior `invalid_contract` reproductions) was material to the failure, that comment block was removed from `contracts/fairmod.py` and both diagnostic probe files (commit `49f65f6`, comment-only deletions — no logic/hash change). A freshly redeployed clean probe with the corrected header shape was submitted using the same disposable `my-studionet-wallet` account.

- **Transaction hash**: `0xa8d1b91da1af0e39e95cbe52d169f318d95985677664d368fd7d2e37cbc62bdb`
- **Resulting contract address**: `0x34de82ecfd04d1aF9284C79c033c7ecb8fE912f9`
- **Protocol status**: FINALIZED (confirmed via CLI receipt and independently via `explorer-studio.genlayer.com`)
- **GenVM execution result**: **SUCCESS** — Result Code `Return`, return value `null`
- **Contract queryable**: **YES** — `genlayer schema`/`genlayer code` both succeed and match the deployed source exactly
- **`get_probe()`**: returns exactly `FAIRMOD_61999_CLEANROOM_OK`

This is the first fully successful StudioNet 61999 deployment in this project's history. Full detail, including what this does and does not yet establish, and next steps, in [docs/STUDIONET_61999_HEADER_BOUNDARY_FIX_RESULT.md](STUDIONET_61999_HEADER_BOUNDARY_FIX_RESULT.md). FairMod itself has **not** been deployed — only the diagnostic probe. No canonical wallet was used.

## Stage 8C — Temporary FairMod deployment and full hosted E2E lifecycle (2026-09-30)

Following the header-boundary fix, FairMod itself (header-corrected, hash `e6fcc870cef9f70efeb7b148e2065aff297e850bafba18ad2537a9ae52970e0d`) was deployed as a **temporary test deployment** using the disposable `my-studionet-wallet` account — transaction `0x17343f3610fe94ffc22528b849a0326f27d94bec2d1544c1a2bb6c0b8f2def5f`, address `0xB29187225636f6C43C5D9231Ab4f9cfc00907609`, `execution_result: SUCCESS`, schema/code both queryable and correct.

A full application lifecycle was then exercised against this deployment: community creation, constitution draft/rule/activation, case creation with context, real TEXT/WEB_LINK/IMAGE evidence (including genuine validator-side `gl.nondet.web.get` and `gl.nondet.web.render(mode='screenshot')` + `gl.nondet.exec_prompt(images=[...])` acquisition against `https://example.com`), evidence freeze, real cross-validator semantic adjudication (verdict FLAGGED/HARASSMENT), a real application-level challenge and its independent resolution (outcome UPHOLD), receipts, precedent, transparency counters, pagination, and the Fairness Mirror (result CONSISTENT, verdict/finality fields structurally unchanged) — all reaching real consensus with `execution_result: SUCCESS`. The real frontend, pointed locally at this address, correctly rendered every piece of this state.

Full transaction-by-transaction evidence in [docs/STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md](STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md). This is a **temporary test deployment, not canonical** — no canonical wallet was used or accessed.

## Stage 9B — previous canonical deployment, superseded (2026-09-30)

The user manually deployed the frozen FairMod contract via the GenLayer Studio website. This session independently re-verified it:

- **Canonical contract address**: `0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450`
- **Deployment transaction**: `0x22ad7f2ad5415dc2592a2e062bcb062c4723aa378425b8cdb310a6c2826dad2c`
- **Protocol status**: FINALIZED — **GenVM execution result**: SUCCESS (Result Code: Return)
- Schema (30 methods), code (byte-identical to `contracts/fairmod.py`), and a basic read call all independently reconfirmed by this session, plus cross-checked on the real Studio Explorer

A small smoke test was then run against that address using the disposable wallet. This address is now superseded by the deployment recorded below; see [docs/STAGE_9B_CANONICAL_VERIFICATION.md](STAGE_9B_CANONICAL_VERIFICATION.md) for its historical evidence.

## Current canonical deployment and user-run lifecycle (2026-10-01)

The hardened contract is deployed at `0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f` by transaction `0x3bde02c3690c03175a7601622c8b0cd82851a24031d5fcb40e48a223de7647ad`. Deployment status FINALIZED; Explorer showed GenVM SUCCESS. The current repository source SHA-256 is `2ad077c7970b8ef09c3a1ba6ed5744e3c1ad4f68b56562c9f21f298de8e0c5be`; live code matches after CRLF/LF normalization; schema is 30 methods (14 views, 16 writes).

The user subsequently exercised the canonical app lifecycle: create community `c0`; add HARASSMENT rule; create case `c0#0`; add TEXT evidence `c0#0:e0`; freeze; adjudicate to FLAGGED/HARASSMENT; file and resolve a challenge as UPHOLD; run Fairness Mirror as CONSISTENT. Every listed operation reached FINALIZED / SUCCESS. A premature `finalize_case` attempt correctly failed because the 24-hour window was still open. Fresh read-only contract calls confirmed case and receipt state `FINAL`, verdict FLAGGED, challenge UPHOLD, final rule HARASSMENT, Mirror CONSISTENT, one finalized/flagged community case. Exact evidence: `docs/CANONICAL_DEPLOYMENT_VERIFICATION.md`.
