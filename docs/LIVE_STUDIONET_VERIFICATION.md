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
