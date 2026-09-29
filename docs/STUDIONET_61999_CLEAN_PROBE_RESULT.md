# StudioNet 61999 Clean Probe — Development/Test Deployment Result

**BRANCH B — clean probe reproduced the same failure. STOPPED per instruction. FairMod was not touched, the Depends header was not touched, tooling generation was not switched, and no repeated redeploy was attempted.**

## What was deployed

`diagnostics/studionet_61999_clean_probe.py` (SHA-256 `493d0fc4a7ce8e64c54262cc21aea12d92ef8f730e29056f45c1ca40abfcaca8`), via the repository-local `genlayer` CLI `0.39.1` (`./node_modules/.bin/genlayer deploy --contract diagnostics/studionet_61999_clean_probe.py`), using the disposable/test account `my-studionet-wallet` (`0xaffe15eec45b68835cc9e5b4ab85dd5deae8e70b`, confirmed unlocked, balance 234.35 GEN before deployment), on `studionet` (chain id `61999`, RPC `https://studio.genlayer.com/api`, confirmed via `genlayer network info` immediately before deploying). All 7 pre-deployment reconfirmation checks passed (CLI version, network, chain ID, RPC, active account, clean-probe hash, FairMod hash) before the deploy command was issued.

## Result

| Field | Value |
|---|---|
| Transaction Hash | `0xdbd7e25d27dbb80b95823a3d7c4bb31f91063d9f202452234ba02a8ab7bc01ab` |
| Resulting Contract Address | `0xDEf36e64CC9E3FEaa20b55CaC9489900a1Fa7127` |
| Transaction status (protocol) | `FINALIZED` (`status: 7`, `status_name: 'FINALIZED'`) — confirmed both via CLI `receipt` and independently via the real Studio Explorer (`https://explorer-studio.genlayer.com/tx/0xdbd7e25...`) |
| Consensus result | `ACCEPTED` / `MAJORITY_AGREE` — 5 initial validators, votes `[AGREE, IDLE, IDLE, AGREE, AGREE]` |
| **Execution Result** | **`ERROR`** (leader and both reporting validators) |
| **Result Code** | **`Contract Error`** |
| **Error Message** | **`invalid_contract`** |
| Stdout / Stderr | both empty on every reporting node |
| CLI's own summary line | `✔ Contract deployed successfully.` — **misleading**: this reflects only that a deploy transaction was accepted/finalized at the protocol layer, not that GenVM execution succeeded. Taken at face value, this message would have caused a false-positive "it works" conclusion; the actual `execution_result`/`Result Code`/`Error Message` fields inside the same receipt (and confirmed independently via the Explorer) tell the true story. |
| Independent contract-existence check | `genlayer schema 0xDEf36e64CC9E3FEaa20b55CaC9489900a1Fa7127` → `GenLayer RPC error (gen_getContractSchema): Contract ... not found`. `genlayer code ...` → same `Contract ... not found`. The contract is **not queryable** — it does not exist as a callable contract despite the transaction being protocol-FINALIZED. |
| `get_probe()` call | **Not attempted** — a contract that does not exist per `schema`/`code` cannot be meaningfully called; attempting it would not add information and risks being misread as "another deployment attempt." |
| Execution trace (`genlayer trace <txId>`) | Unavailable — `gen_dbg_traceTransaction` RPC method not found on this StudioNet endpoint (a CLI/RPC capability gap, not something this task can resolve) |

Independently verified on the real Studio Explorer (`explorer-studio.genlayer.com`, not the dead `genlayer-explorer.vercel.app` mirror shown in `genlayer network info`'s `explorer` field): same hash, same `FINALIZED` status, same `Execution Result: ERROR` / `Result Code: Contract Error` / `Error Message: invalid_contract`, empty stdout/stderr — a full, independent second read of the identical outcome, not merely re-printing the CLI's own claim.

## Comparison with the two previous failed deployments

Both earlier attempts (recorded in this project's own history, prior to this cleanroom) — the FairMod contract itself, and Stage 2H-D's original minimal control contract (`diagnostics/studionet_runtime_probe.py`), both deployed with the identical pinned runner (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`) — reached the exact same signature: transaction **FINALIZED** at the protocol/consensus layer, but GenVM **execution_result: ERROR**, **Result Code: Contract Error**, **Error Message: invalid_contract**.

This third attempt — a brand-new, from-scratch, deliberately minimal contract (not a reuse of the earlier control contract), deployed only after:
- uninstalling `genvm-linter 0.11.1rc2` and its cached v0.6.0-rc1/rc5/rc6 GenVM artifacts entirely,
- installing the exact `genvm-linter==0.11.0` requested,
- confirming `genlayer-test`/`gltest` already at `0.29.2`,
- pinning and proving a repository-local `genlayer` CLI at exactly `0.39.1` (distinct from the global `0.39.2`),
- confirming no `GENVM_VERSION` or similar environment variable was ever set or read,
- confirming Direct Mode's own local execution cache was already the correct, uncontaminated stable `v0.2.16` generation containing the exact pinned runner hash pre-extracted,

**reproduced the identical failure signature: FINALIZED / ERROR / Contract Error / invalid_contract.**

**CONCLUSION: The corrected 0.39.1 CLI / genvm-linter 0.11.0 cleanroom toolchain did NOT change the outcome. The StudioNet 61999 `invalid_contract` execution failure is reproduced identically under a verified-clean, non-RC-contaminated local toolchain, using a fresh minimal contract with zero relationship to FairMod's own code.** This is now the third independent reproduction (FairMod, the original Stage 2H-D control contract, and this cleanroom's from-scratch probe), each with a different contract body but the identical pinned Depends hash, and all three show the same signature. This strengthens rather than weakens the case that the failure is StudioNet/GenVM-manager-side (server-side execution-environment resolution of this exact runner hash on the live chain), not a property of any of the three contract bodies, and not explained by local tooling-generation contamination — which has now been eliminated as a variable and the failure persisted regardless.

## What was explicitly NOT done, per instruction

- FairMod (`contracts/fairmod.py`) was not touched. Hash reconfirmed identical: `417cf3de5fef4e6e3a28c0d63510771f18e923dcf42a1f94295a1dc7d3c72d36`.
- The `# { "Depends": ... }` header was not changed, anywhere.
- No tooling-generation switch was made (no v0.6 RC reintroduced, no "latest" auto-resolution invoked).
- No repeated redeployment was attempted after the failure was observed — exactly one deploy transaction was submitted.
- FairMod itself was not deployed.
- The canonical/final deployment wallet was not used, accessed, or referenced. No private key, seed phrase, or credential was exported or displayed. Only the disposable `my-studionet-wallet` test account (explicitly confirmed with you beforehand) sent this one transaction.
- `genlayerlabs/genvm-manager#50` was not updated with this reproduction — that is deferred to your explicit go-ahead, per "We can then update ... issue #50" being stated as a subsequent step, not an instruction to act now.

## Next action

Awaiting your decision on how to proceed: whether to (a) report this clean reproduction to `genlayerlabs/genvm-manager#50` now, (b) attempt further isolation (e.g. a second, differently-shaped minimal probe, or contacting the GenLayer team directly with this exact evidence bundle), or (c) hold further StudioNet attempts pending their response. No further deployment action will be taken without your explicit direction.
