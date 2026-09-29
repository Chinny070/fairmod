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
