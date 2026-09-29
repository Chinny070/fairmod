# FairMod — GenLayer Team Review

## Problem

FairMod, and independent minimal control contracts, reach protocol `FINALIZED` on StudioNet 61999 but GenVM execution returns:

```
Contract Error
invalid_contract
```

No application traceback is produced and the proposed contract is not queryable afterward (`gen_getContractSchema`/`gen_getContractCode` both return "not found" for the resulting address).

## Environment

- Network: StudioNet
- Chain ID: 61999
- RPC: `https://studio.genlayer.com/api`
- Runner: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
- Repository-local CLI: `genlayer` 0.39.1 (pinned in `frontend/package.json`, not the global install)
- `genvm-linter`: 0.11.0
- `genlayer-test`/`gltest`: 0.29.2

## Frozen FairMod

- Path: `contracts/fairmod.py`
- SHA-256: `417cf3de5fef4e6e3a28c0d63510771f18e923dcf42a1f94295a1dc7d3c72d36`
- Tests: 195 passing (`python -m pytest test/ -q`)
- Linter: PASS
- Schema: PASS (30 public methods — 14 view, 16 write)
- Direct/local (`gltest.direct`, in-memory, no WASM/Docker/hosted node): PASS

## Clean minimal probe

The smallest possible reproduction — one `gl.Contract` subclass, one deterministic `@gl.public.view`, no LLM, no web access, no nondeterminism, no FairMod application logic — built fresh during a dedicated toolchain cleanroom specifically to rule out local tooling contamination as the cause.

- Path: `diagnostics/studionet_61999_clean_probe.py`
- SHA-256: `493d0fc4a7ce8e64c54262cc21aea12d92ef8f730e29056f45c1ca40abfcaca8`
- Deployment transaction: `0xdbd7e25d27dbb80b95823a3d7c4bb31f91063d9f202452234ba02a8ab7bc01ab`
- Proposed contract address: `0xDEf36e64CC9E3FEaa20b55CaC9489900a1Fa7127`
- Result: `FINALIZED` (protocol status) / `execution_result: ERROR` / `Contract Error` / `invalid_contract`
- Independently reconfirmed via the Studio Explorer: `https://explorer-studio.genlayer.com/tx/0xdbd7e25d27dbb80b95823a3d7c4bb31f91063d9f202452234ba02a8ab7bc01ab`

Full transaction detail (leader/validator votes, consensus data, stdout/stderr) is recorded in `docs/STUDIONET_61999_CLEAN_PROBE_RESULT.md`.

## Earlier reproductions

This repository's own project history (`docs/STAGE_3_VERIFICATION.md`) records that the identical failure signature — protocol `FINALIZED`, GenVM `execution_result: ERROR`, `Contract Error: invalid_contract` — was also reproduced earlier with (1) FairMod's own deployment attempt and (2) a separate, earlier minimal control contract, both under the same pinned runner. Specific transaction hashes for those two earlier instances are not preserved in this repository's own recorded evidence, so they are not asserted here as specific checkable references — only the qualitative record above and the fully-detailed, independently-reconfirmed clean-probe transaction (`0xdbd7e25d...`) above are presented as verified evidence. All three occurrences share the identical failure signature.

## Cleanroom work already performed

Before the clean-probe reproduction above, the following was done specifically to rule out local tooling contamination as the cause (full detail in `docs/STUDIONET_61999_TOOLCHAIN_CLEANROOM.md`):

- Removed `genvm-linter 0.11.1rc2` (which had been auto-resolving GenVM v0.6 RC-generation artifacts) and its cached RC tarballs.
- Pinned a repository-local `genlayer` CLI at exactly 0.39.1, verified by direct execution, separate from the machine's global 0.39.2 install.
- Pinned `genvm-linter==0.11.0`.
- Retained `genlayer-test`/`gltest` at 0.29.2 (already correct).
- Confirmed `GENVM_VERSION` is not set anywhere in the environment and is not read by any code path in the installed test tooling.
- Confirmed Direct Mode's own local execution cache was already the correct, non-RC, stable generation, and already contained the exact pinned runner hash pre-extracted.
- Re-ran compile/lint/schema/Direct Mode against FairMod under the corrected toolchain — all passed, no incompatibility found.
- **The failure persisted identically** on a freshly deployed, from-scratch minimal probe under this corrected toolchain.

## What we need help determining

1. Why StudioNet validators return `invalid_contract` before application execution reaches the contract's own logic.
2. Whether the runner (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`) is successfully resolved by the validators that processed these transactions.
3. Whether the submitted deployment source/header is being rejected server-side for a reason not surfaced in the public transaction result.
4. Whether there is a StudioNet deployment/configuration requirement we are missing that isn't reflected in the CLI 0.39.1 / genvm-linter 0.11.0 / gltest 0.29.2 tooling path we used.
5. Whether GenLayer engineering can reproduce the clean probe above from this repository, and whether server-side logs for transaction `0xdbd7e25d27dbb80b95823a3d7c4bb31f91063d9f202452234ba02a8ab7bc01ab` show a more specific error than what the public transaction result exposes.

We are not asserting a root cause and are not claiming StudioNet is at fault — only reporting what was observed and independently reconfirmed.

## Reproduction commands

All commands below are read-only/local — none require a wallet or submit a transaction.

```bash
# Contract-side (Python)
pip install "genvm-linter==0.11.0" "genlayer-test==0.29.2"
python -m pytest test/ -q                          # expect: 195 passed
genvm-lint check contracts/fairmod.py --json        # expect: ok:true, methods:30
sha256sum contracts/fairmod.py                      # expect: 417cf3de5fef4e6e3a28c0d63510771f18e923dcf42a1f94295a1dc7d3c72d36
sha256sum diagnostics/studionet_61999_clean_probe.py  # expect: 493d0fc4a7ce8e64c54262cc21aea12d92ef8f730e29056f45c1ca40abfcaca8
genvm-lint check diagnostics/studionet_61999_clean_probe.py --json  # expect: ok:true, methods:1

# Frontend-side (Node/npm)
cd frontend
npm install
npm run typecheck && npm run lint && npm test && npm run build

# Repository-local GenLayer CLI (installed via frontend/package.json, exact 0.39.1)
cd frontend
npx genlayer --version                              # expect: 0.39.1
npx genlayer network info                            # read-only: prints the studionet chain config
```

The deployment command used to produce the clean-probe reproduction above (for reference only — **not to be re-run without new information, per our own internal policy of not repeatedly redeploying to reproduce an already-confirmed failure**):

```bash
cd frontend
npx genlayer deploy --contract diagnostics/studionet_61999_clean_probe.py
```

No private keys, wallet exports, seed phrases, or credentials are required for, or present in, any of the above.
