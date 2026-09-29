# StudioNet 61999 Toolchain Cleanroom Correction

Performed after the accepted Stage 6 release candidate (commit `8a871df`, source hash `417cf3de5fef4e6e3a28c0d63510771f18e923dcf42a1f94295a1dc7d3c72d36`). This is a **toolchain-hygiene task**, not a new contract stage — no line of `contracts/fairmod.py` was touched, and its hash is confirmed identical before and after this work (see Verification below).

## Background: the mixed-tooling problem

Previous work on this repository installed `genvm-linter` at version `0.11.1rc2` — a package belonging to a newer, still-prerelease GenVM v0.6 generation. This tool's own `download_artifacts()` helper (used throughout Stage 0/1 for API source-verification, per `docs/GENVM_API_VERIFICATION.md`/`docs/EVIDENCE_CAPABILITY_MATRIX.md`) had no way to pin a specific stable GenVM release from the CLI, and defaulted to resolving "latest," which at the time was `v0.6.0-rc6` (with `rc1`/`rc5` also cached locally from earlier runs).

We previously attempted a StudioNet 61999 deployment of the exact pinned runner (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`) and of a trivial control contract using the same runner, and both reproduced:

```
Execution Result: ERROR
Contract Error: invalid_contract
```

We initially suspected the runner hash itself. The GenLayer team's correction (on `genlayerlabs/genvm-manager#50`) is that this exact runner hash has deployed successfully on StudioNet 61999 elsewhere, so the runner hash alone does not explain the failure — and the suspicious element is the mixed tooling generations in our own environment, specifically `genvm-linter 0.11.1rc2`'s v0.6 RC downloads.

## Active versions before cleanup

| Tool | Version found | Generation |
|---|---|---|
| `genvm-linter` (pip, global) | `0.11.1rc2` | v0.6 RC (wrong) |
| `genlayer-test` / `gltest` (pip, global) | `0.29.2` | already correct — unchanged |
| `genlayer` CLI (npm, global only — no repo-local install existed) | `0.39.2` | one patch above target; not itself flagged as an RC, but not repository-pinned |
| Python | `3.12.10` | n/a |
| pytest | `8.4.2` | n/a |

A corrupted package remnant was also found: `~envm_linter-0.11.0.dist-info` in the global site-packages directory (the leading `~` is pip's own marker for a package left in a broken/partial state, most likely from an earlier interrupted upgrade from `0.11.0` to `0.11.1rc2`). This surfaced as a "WARNING: Ignoring invalid distribution ~envm-linter" on every `pip` invocation.

## Contamination matrix

| Location | Current value (found) | Expected value | Active/Inert | Risk | Action |
|---|---|---|---|---|---|
| Global pip: `genvm-linter` | `0.11.1rc2` | `0.11.0` | **ACTIVE** — this is the actual binary `genvm-lint` invoked by this repo's Stage 0-6 workflow | High — auto-resolves to v0.6 RC generation artifacts | **Uninstalled; replaced with `0.11.0`** |
| Global pip site-packages: `~envm_linter-0.11.0.dist-info` | corrupted partial-upgrade remnant | (should not exist) | Inert but noisy (spurious warning on every pip call) | Low — cosmetic/confusing, not a version-selection risk | **Removed** |
| Global pip: `genlayer-test` | `0.29.2` | `0.29.2` | ACTIVE | None — already correct | No change |
| `~/.cache/genvm-linter/` | 3 cached tarballs: `genvm-universal-genlayerlabs-genvm-manager-v0.6.0-rc1.tar.xz`, `-rc5.tar.xz`, `-rc6.tar.xz` (plus extracted dirs, ~933MB total) | no v0.6 RC artifacts | **ACTIVE** — read by `genvm-lint`'s own version-resolution fallback | High — exactly the RC-generation contamination flagged | **Deleted entirely** (report below) |
| `~/.cache/gltest-direct/` | `genvm-universal-v0.2.16.tar.xz` + extracted `py-genlayer/1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` and `py-lib-genlayer-std/11rhn002...` | stable, non-RC build containing our exact pinned runner hash | ACTIVE — this is what every `gltest.direct` test in this repo actually executes against | **None** — this cache is already the correct, stable generation, and already contains our exact Depends hash pre-extracted | **Not touched** |
| Global npm: `genlayer` CLI | `0.39.2` | repo-local `0.39.1` | ACTIVE previously (no repo-local CLI existed) | Medium — not itself an RC, but un-pinned and one version ahead of the requested target | **Left installed globally** (harmless); a **repo-local `0.39.1`** was added and is the one used for all cleanroom verification going forward |
| Environment variables (session + user profile) | none of `GENVM_VERSION`/similar set | not set | N/A | None found | Confirmed absent; also confirmed `gltest`'s own source never reads any such variable (grepped the entire installed `gltest` package — zero matches for `os.environ`/`os.getenv`) |
| `docs/ARCHITECTURE.md:9`, `docs/EVIDENCE_CAPABILITY_MATRIX.md:11,15,47`, `docs/GENVM_API_VERIFICATION.md:6-8,37` | describe `genvm-linter 0.11.1rc2` and the `v0.6.0-rc5/rc6` source read during Stage 0/1 API verification | — | **HISTORICAL DOCUMENTATION** — these are accurate records of what was actually done at the time | Informational only; flagged as an open, unresolved cross-generation-verification caveat (see "Remaining uncertainties" below), not rewritten | **Left unchanged**, per instruction not to rewrite history |
| `docs/STAGE_2_VERIFICATION.md:7` | records that Stage 2 re-verified the same APIs directly against the **stable `v0.2.16`** extraction (matching `gltest-direct`'s own cache) | — | HISTORICAL DOCUMENTATION, and reassuring: only the very first Stage 0/1 pass used RC source; Stage 2 onward re-confirmed against the stable generation | Low | Left unchanged |
| Repository dependency files (`package.json`, `package-lock.json`, any `requirements*.txt`/`pyproject.toml`) | none existed before this task | pinned repo-local tooling | N/A | The repo had **no** dependency-pinning mechanism at all prior to this task — every tool was resolved from whatever happened to be installed globally | **Created** `package.json`/`package-lock.json` pinning `genlayer@0.39.1` exactly; no Python-side lockfile was created since `genvm-linter`/`genlayer-test` are pinned via direct `pip install` of exact versions, matching the repo's pre-existing "no competing dependency system" pattern (there was no `requirements.txt` to extend) |
| CI/GitHub Actions | none exist in this repository | n/a | N/A | None | Not applicable — no CI workflows present |

No occurrence of `61997`, `studio-dev`/`Studio Dev`, `py-genlayer:9b8...`, `GENVM_VERSION=v0.6.x`, or `genlayer CLI 0.40 RC` was found anywhere in the repository (contract, tests, docs, or scripts) — those specific contamination vectors were never present in this codebase.

## Environment variable audit

Checked the full session environment (`env | grep -i "genvm\|genlayer"`) — empty. Checked the entire installed `gltest` package source for any `os.environ`/`os.getenv` call — zero matches. `GENVM_VERSION` is confirmed **not set**, and confirmed **not consulted** by Direct Mode at all; Direct Mode's only version-selection inputs are (a) an explicit `sdk_version` argument, which nothing in this repository's tests ever passes (grepped `test/` and `diagnostics/` — no occurrence), and (b) its own on-disk cache (`~/.cache/gltest-direct`), which already held the correct stable build before this task began. No private keys, wallet secrets, seed phrases, credentials, or API secrets were inspected or exposed in this audit.

## Repository-local CLI pin

- Created `package.json`/`package-lock.json` at the repo root (none existed previously) pinning `"genlayer": "0.39.1"` exactly (`--save-exact`).
- `node_modules/` added to `.gitignore`.
- Proven by direct execution, not by reading the lockfile:
  ```
  ./node_modules/.bin/genlayer --version   ->  0.39.1
  genlayer --version (global)              ->  0.39.2
  ```
- All GenLayer CLI operations for this cleanroom used the repo-local `0.39.1` binary exclusively. The global `0.39.2` CLI was left installed (harmless, unused for this task) but is **not** to be used for cleanroom validation or any future deployment step, per instruction.

## Python tooling pin

- `pip uninstall -y genvm-linter` (removed `0.11.1rc2`), then removed the corrupted `~envm_linter-0.11.0.dist-info` remnant, then `pip install --no-cache-dir "genvm-linter==0.11.0"`.
- Verified: `genvm-lint --version` → `genvm-lint, version 0.11.0`.
- `genlayer-test`/`gltest` was already exactly `0.29.2` — no reinstall needed; verified via `pip show genlayer-test`.
- FairMod's `# { "Depends": ... }` header was **not** touched at any point.

## Cache remediation

| Path | Contents/version | Why it may contaminate | Safe to remove |
|---|---|---|---|
| `~/.cache/genvm-linter/genvm-universal-genlayerlabs-genvm-manager-v0.6.0-rc1.tar.xz` (+ extracted) | GenVM v0.6.0-rc1 | Wrong generation; only ever used by `genvm-linter`'s own static analysis, never by Direct Mode execution or by any deployment path | YES |
| `~/.cache/genvm-linter/genvm-universal-genlayerlabs-genvm-manager-v0.6.0-rc5.tar.xz` (+ extracted, + `.index-v2.json`/`.index-v3.json`) | GenVM v0.6.0-rc5 | Same as above | YES |
| `~/.cache/genvm-linter/genvm-universal-genlayerlabs-genvm-manager-v0.6.0-rc6.tar.xz` (+ extracted, + `.index-v3.json`) | GenVM v0.6.0-rc6 | Same as above; this was the specific build `genvm-linter 0.11.1rc2` had auto-resolved as "latest" | YES |
| `~/.cache/gltest-direct/genvm-universal-v0.2.16.tar.xz` (+ extracted `py-genlayer/1jb45aa8...`, `py-lib-genlayer-std/11rhn002...`) | GenVM v0.2.16 (stable) | **Not contamination** — this is the correct, stable generation, already contains our exact pinned runner hash pre-extracted, and is what every one of the 192 Direct Mode tests in this repo actually runs against | **NO — not removed** |

Action taken: `rm -rf ~/.cache/genvm-linter` (entire directory, ~933MB across the three RC tarballs and their extracted trees). `~/.cache/gltest-direct` was left completely untouched. No wallet files, keystores, private keys, or unrelated user files were inspected or touched anywhere in this process.

## Clean reinstall verification

Post-cleanup, exact installed/running versions were **verified by executing the tools**, not inferred from package metadata:

```
./node_modules/.bin/genlayer --version  -> 0.39.1
genvm-lint --version                    -> genvm-lint, version 0.11.0
pip show genlayer-test                  -> Version: 0.29.2
python --version                        -> Python 3.12.10
pytest --version                        -> pytest 8.4.2
```

No v0.6 RC tool remains anywhere in the clean execution path — confirmed via `find "$HOME/.cache" -iname "*v0.6*"` returning zero results after cleanup.

## Direct Mode audit (Phase 8)

Read `gltest/direct/sdk_loader.py` (part of the installed `genlayer-test` package) directly, not inferred:

- **DIRECT MODE GENVM SOURCE**: GitHub releases at `genlayerlabs/genvm` (`genvm-universal-{version}.tar.xz`), cached locally under `~/.cache/gltest-direct/`.
- **DIRECT MODE VERSION/GENERATION**: `v0.2.16` (already cached before this task; matches the generation our pinned runner hash belongs to — confirmed by its presence, pre-extracted, at `~/.cache/gltest-direct/extracted/v0.2.16/py-genlayer/1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`).
- **AUTOMATIC LATEST DOWNLOAD**: Conditionally YES — `setup_sdk_paths()`'s default behavior (`version=None`) is: use the highest-sorted **already-cached** version if one exists, else call `get_latest_version()` (a GitHub `HEAD` request against `/genvm/releases/latest`) and download that. In our case a cache already existed (`v0.2.16`), so no network "latest" resolution occurred during this task's test runs. This is a real, disclosed characteristic of the tool, not something this task can change without editing `gltest`'s own installed package (out of scope — no request to patch a third-party dependency was made). The runner actually *executed* is still selected by **exact hash** from FairMod's own `Depends` header (`parse_contract_header` + `extract_runner(..., runner_hash=...)`), regardless of which outer release tarball is used — so even an unwanted "latest" tarball fetch would not silently swap which runner code executes, though it could in principle fail with "Runner hash not found" if a future "latest" tarball ever dropped our specific hash.
- **CACHE USED / CACHE VERSION**: `~/.cache/gltest-direct/genvm-universal-v0.2.16.tar.xz`, pre-existing, untouched by this cleanroom.
- **61999 COMPATIBILITY BASIS**: Direct Mode does not itself talk to StudioNet or assert 61999-compatibility — it is a local, in-memory simulator using the exact pinned runner extracted by hash. The actual 61999-compatibility claim rests entirely on the GenLayer team's stated confirmation (per `genvm-manager#50`) that this same runner hash deploys successfully elsewhere on StudioNet 61999, not on anything Direct Mode itself proves.

No ambiguity was found that would require stopping before proceeding — Direct Mode's generation is establishable and is the stable, non-RC `v0.2.16` build already in use throughout Stages 1-6.

## FairMod revalidation under the corrected toolchain (Phase 9)

| Check | Result |
|---|---|
| Python compile (`py_compile.compile('contracts/fairmod.py', doraise=True)`) | PASS |
| `genvm-lint check` (exactly `0.11.0`) | PASS — `{"ok":true,"lint":{"ok":true,"passed":3},"validate":{"ok":true,"contract":"FairMod","methods":30,"view_methods":14,"write_methods":16,"ctor_params":0}}` |
| Schema | 30 methods (14 view, 16 write) — unchanged from the accepted Stage 6 schema |
| Direct Mode (`gltest.direct`, stable `v0.2.16`) | PASS |
| Full test suite (`python -m pytest test/ -q`) | **192 collected, 192 passed, 0 failed, 0 skipped, 0 blocked** |

No incompatibility of any kind (tooling, linter, Direct Mode, or test) was exposed by the corrected toolchain — the accepted Stage 6 FairMod source ran identically under the cleaned environment. No STOP was required; the contract was not touched.

## Clean probe (Phases 10-11)

Created `diagnostics/studionet_61999_clean_probe.py` — a fresh, minimal reproduction (deliberately not reusing the earlier Stage 2H-D `diagnostics/studionet_runtime_probe.py`), containing only the exact pinned `Depends` header, one `gl.Contract` subclass, a no-op constructor, and one deterministic `@gl.public.view` returning the literal `FAIRMOD_61999_CLEANROOM_OK`. No LLM, no web access, no nondeterminism, no `prompt_comparative`, no non-trivial storage, no FairMod application logic.

| Check | Result |
|---|---|
| SHA-256 | `493d0fc4a7ce8e64c54262cc21aea12d92ef8f730e29056f45c1ca40abfcaca8` |
| Python compile | PASS |
| `genvm-lint check` (`0.11.0`) | PASS — `{"ok":true,"lint":{"ok":true,"passed":3},"validate":{"ok":true,"contract":"StudioNet61999CleanProbe","methods":1,"view_methods":1,"write_methods":0,"ctor_params":0}}` |
| Schema | 1 view method, as designed |
| Direct Mode deterministic test (`diagnostics/test_studionet_61999_clean_probe.py`) | PASS — asserts `get_probe() == "FAIRMOD_61999_CLEANROOM_OK"` |

## Final FairMod integrity check (Phase 12)

```
sha256sum contracts/fairmod.py
417cf3de5fef4e6e3a28c0d63510771f18e923dcf42a1f94295a1dc7d3c72d36  contracts/fairmod.py
```

Identical to the value recorded at the start of this task and to the accepted Stage 6 release-candidate hash. **FAIRMOD MODIFIED DURING CLEANROOM: NO.**

## Remaining uncertainties

- Whether StudioNet 61999's live GenVM build is actually the same generation as our pinned runner hash (`v0.2.16`-family) remains a hosted-proof item — this cleanroom establishes that our *local* tooling now consistently targets that stable generation, not that StudioNet's current live chain build matches it. This is the same "runtime build drift" caveat already disclosed in `docs/GENVM_API_VERIFICATION.md`/`docs/EVIDENCE_CAPABILITY_MATRIX.md`, now narrowed rather than resolved.
- The very first Stage 0/1 GenVM API verification pass read source from the v0.6.0-rc5/rc6 generation (see `docs/GENVM_API_VERIFICATION.md`), not the stable generation our runner hash belongs to. Stage 2 onward re-verified the same API surface directly against the stable `v0.2.16` extraction (`docs/STAGE_2_VERIFICATION.md`), which is reassuring but does not retroactively re-verify every API detail Stage 0/1 read only from the RC source. This is flagged, not silently resolved, and not treated as license to alter FairMod's adjudication/evidence/challenge/Fairness Mirror code, per the explicit feature-freeze instruction for this task.
- Whether the previous StudioNet `invalid_contract` deployment failures were actually *caused* by tooling contamination (as the GenLayer team's correction suggests) versus some other StudioNet-side factor remains unproven until the clean probe is actually deployed — that is an explicitly deferred, manual, separate next step.
- `genlayerlabs/genvm-manager#50` was not re-checked as part of this specific toolchain task (it was already reconfirmed OPEN/0 comments at the end of Stage 6); no new comment or action was taken on it here.
