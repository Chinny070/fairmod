# Stage 1 Verification — Deterministic Protocol Core (CLOSURE — executed)

Contract: [`contracts/fairmod.py`](../contracts/fairmod.py) (719 lines, SHA-256 `43f47acc552460efcbe6f331ebbd57d4fee2c8a003547062e3fd08df87deeb67`).
Tests: [`test/test_fairmod.py`](../test/test_fairmod.py) (651 lines, 49 tests, **all executed and passing** — see below).

## Environment blockers — investigated and resolved/routed around

**A. Docker daemon not running.** `docker ps`/`docker info` showed the Docker Desktop *client* (27.5.1) installed but the `dockerDesktopLinuxEngine` named pipe absent — the daemon simply wasn't started. Fixed with the official, non-destructive `docker desktop start` CLI command (this only launches an already-installed application; nothing was reconfigured). Docker is running as of this report.

**B. `genlayer up --headless` CLI crash.** Root-caused by reading the installed CLI's own bundled dependency (`node_modules/genlayer/node_modules/update-check/index.js`, v1.5.4): `checkCliVersion()` calls `updateCheck(package_default)` with no try/catch around it (confirmed by reading `dist/index.js` — the call site has no error handling at all), and `update-check`'s `getMostRecent()` does `if (err.code && ...)` assuming `err` is always an Error object; when the underlying HTTPS request instead fires a bare `'timeout'` event calling `reject()` with **no argument**, `err` is `undefined` and `err.code` throws `TypeError: Cannot read properties of undefined (reading 'code')`. No environment variable disables this check (grepped the entire CLI bundle for `NO_UPDATE`/`SKIP_UPDATE`/any conditional guard around `checkCliVersion` — none exists). This is a genuine unguarded bug in the shipped `genlayer` CLI 0.39.2, not a Node-24 incompatibility (the crash is a null-object-property read, unrelated to Node version) and not fixable without patching the installed package (which was correctly avoided per instruction). **Routed around**, not fixed: Stage 1 does not need the localnet/Docker path at all — see below.

## The real "fast in-memory direct test" path — found and used

Re-checked the installed `genlayer-test` 0.29.2 package and found it ships **two distinct test runners**, not one:
1. `gltest.contracts` (`get_contract_factory().deploy()`) — drives a **real localnet over JSON-RPC** (`http://127.0.0.1:4000/api`), i.e. exactly the Docker/`genlayer up` path. This is what the official `football_bets.py` example and my earlier draft used. **This is LOCAL-NODE INTEGRATION testing, not direct testing** — the earlier Stage 1 report mislabeled it.
2. `gltest.direct` (`direct_deploy`/`direct_vm` pytest fixtures, registered as the `gltest_direct` pytest11 entry point) — a **native Python, in-memory contract runner**: storage is a plain Python dict-backed `InmemManager`, `_genlayer_wasi` is replaced by a pure-Python mock (`gltest/direct/wasi_mock.py`), and contract methods execute as ordinary Python calls. **No WASM, no Docker, no socket, no subprocess of any kind.** This is the genuine "fast direct test" path the Stage 0/1 briefs meant, and this closure report re-targets all 49 tests at it.

**Category, stated precisely per the closure task's requirement: PURE IN-MEMORY DIRECT TESTS.** Not GLSim (no simulator), not local-node integration (no RPC, no `127.0.0.1:4000`), not hosted integration (no StudioNet). Confirmed by reading `gltest/direct/vm.py`/`loader.py`/`wasi_mock.py` source directly, not inferred.

## Tooling bugs found and fixed along the way (all disclosed, none silently patched into GenLayer's own packages)

1. **A leftover placeholder `genlayer==0.0.1` pip package** — installed by me during Stage 0 exploration (`pip install genlayer`, before I knew the real SDK isn't a pip package) — was shadowing the real SDK. When any other pytest plugin (`gltest_cli.config.plugin`, the localnet one, also auto-loaded) triggered an early `import genlayer`, Python cached this near-empty stub in `sys.modules`, and `gltest.direct`'s later `sys.path` manipulation could no longer take effect because the module was already resident. Symptom: `NameError: name 'allow_storage' is not defined`. **Fixed by `pip uninstall -y genlayer`** — removing an artifact I had installed myself, not modifying any GenLayer-authored package.
2. **`gltest-direct`'s own SDK downloader targets a renamed GitHub asset.** `gltest/direct/sdk_loader.py` requests `genvm-universal.tar.xz` from `genlayerlabs/genvm` releases; that asset was renamed to `genvm-runners-all.tar.xz` starting at release `v0.3.0-rc0` (confirmed via the GitHub releases API — every tag from `v0.3.0-rc0` onward 404s on the old name; `v0.2.16` and earlier still have it). This is a real version-lag bug in the installed `genlayer-test` 0.29.2 package, not fixed by any config. **Routed around, not patched**: called `setup_sdk_paths(..., version='v0.2.16')` once to populate the local cache from a release that both (a) still has the old asset name the installed tool expects, and (b) happens to already contain the exact `py-genlayer` runner hash this contract's header pins (confirmed by listing the tarball's `runners/py-genlayer/` entries before committing to this — `1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` is present). Once cached, subsequent runs need no network and no explicit version — `list_cached_versions()` finds it automatically.
3. **Storage container objects cannot be constructed as loose Python values and assigned into another container**, e.g. `self.roles[cid] = TreeMap()` or a dataclass field `Constitution(rules=TreeMap(), ...)`. This is enforced in the actual pinned GenVM standard library itself (`genlayer/py/storage/vec.py`: `DynArray.__init__` raises `TypeError("this class can't be instantiated by user")`; `TreeMap()` construction produces an object whose `__type_desc__` doesn't match the field descriptor the storage-generation machinery expects) — **this is a real contract-correctness bug that would have failed identically against real StudioNet**, not a test-tool artifact. **Fixed in the contract** (not a redesign — an implementation-pattern correction within the existing architecture): top-level containers now use `TreeMap.get_or_insert_default(key)` (the official idiom, verified from the `football_bets.py` example) instead of constructing-and-assigning; `Constitution.rules`/`rule_order` and `RuleRevision.exceptions` — which were nested storage-typed fields inside a dataclass value, a strictly deeper case the official example never exercises either — were moved to top-level contract maps keyed by a new `_constitution_key(community_id, version)` composite string (`constitution_rules`, `constitution_rule_order`), and `exceptions` became a single newline-joined bounded string (`exceptions_joined`) instead of a nested `DynArray[str]`. Schema (method signatures/types) is **byte-identical** before and after this change — confirmed by diffing `docs/fairmod_schema.json`, which git shows as unchanged.

## Rule ID format (closure Section 4)

Canonical format enforced in `_canonical_rule_id()`: `A-Z`, `0-9`, `_` only; non-empty; bounded to `MAX_RULE_ID_LEN` (40). Malformed input is **rejected, never normalized** — verified directly: `" HARASSMENT "`, `"Harassment"`, `"harassment"`, `"../../HARASSMENT"`, `"HARASSMENT!"`, `""`, `"HARASS MENT"`, and `"HARASSMENT\n"` all revert `add_rule` and leave the constitution's rule set empty (`test_malformed_rule_id_rejected_not_normalized`, parametrized, 8 cases). Valid canonical IDs (`HARASSMENT`, `SPAM`, `MALICIOUS_LINK`, `RULE_12`, single-char, and exactly-40-char) are accepted (`test_canonical_rule_id_accepted`, 6 cases). Length boundary tested at 41 chars (`test_rule_id_over_max_length_rejected`).

## Quality gates re-run after the Rule ID + storage-pattern changes (closure Section 5)

```
$ sha256sum contracts/fairmod.py
43f47acc552460efcbe6f331ebbd57d4fee2c8a003547062e3fd08df87deeb67  (was 955f3cff...; changed, as expected)

$ genvm-lint check contracts/fairmod.py --json
{"ok":true,"lint":{"ok":true,"passed":3},"validate":{"ok":true,"contract":"FairMod",
 "methods":20,"view_methods":10,"write_methods":10,"ctor_params":0,
 "warnings":[{"code":"I200","msg":"py-genlayer: a newer runner is available (...)"}]}}
```
Schema regenerated to `docs/fairmod_schema.json` — **`git diff` shows zero changes**: all 20 public method signatures/types are byte-identical to before this closure's fixes, confirming the storage restructuring and Rule ID validation are purely internal — no public API surface changed. `grep -n "nondet\|eq_principle\|exec_prompt"` against the contract source returns only comment lines (the boundary-documentation comments) — no accidental nondeterministic code was introduced.

## Direct tests — ACTUALLY EXECUTED (not merely collected)

```
$ python -m pytest test/test_fairmod.py -q
.................................................                        [100%]
49 passed in 12.53s
```

TEST EXECUTION PATH: `gltest.direct` (pure in-memory, native Python — see above).

Per-category breakdown (all executed, all passing):

| Category | Tests | Result |
|---|---|---|
| COMMUNITY | create, no-collision, name bounds (empty/80/81 boundary), wrong-ID isolation | 4/4 PASS |
| ROLES | owner grant/revoke, unauthorized grant, self-escalation, cross-community authority, duplicate-grant idempotence, revoked-authority-cannot-act | 6/6 PASS |
| CONSTITUTIONS / RULE IDS | draft/activate pointer, malformed rule ID ×8, canonical rule ID ×6, rule-ID length boundary, duplicate rule ID, mutation-after-activation, old-version-preserved-as-RETIRED-with-identical-rules, stable-logical-ID-different-definitions | 19/19 PASS |
| CASES | requires-active-constitution, binds-version-permanently, content bounds, cross-community isolation | 4/4 PASS |
| CONTEXT | add + max-count boundary, wrong-case rejected, immutable-after-freeze | 3/3 PASS |
| EVIDENCE | all 4 types (TEXT/WEB_LINK/DOCUMENT/IMAGE) record + correct retrieval-status per type, bounds (count + URL length), wrong-case/cross-case-reference rejected, immutable-after-freeze | 4/4 PASS |
| FREEZE | legal freeze, unauthorized freeze, duplicate freeze, immutable snapshot (evidence frozen flag + case content unchanged) | 4/4 PASS |
| STATE MACHINE | no public method can reach DECIDED/FINAL (schema-checked via isolated subprocess), OPEN→EVIDENCE_FROZEN only | 1/1 PASS |
| TIME | deterministic timestamp captured, no method accepts a caller-supplied timestamp parameter (schema-checked), documented `vm.warp()` limitation for this SDK generation | 2/2 PASS |
| STORAGE/RUNTIME INVARIANTS (closure Section 6, consolidated) | counters/IDs no alias, community isolation, role revocation persistence, constitution immutability + correct active pointer + non-destructive supersession, case version binding permanence, evidence single-case ownership, freeze persistence/immutability, no-partial-mutation-on-failed-write | 1/1 PASS |

TESTS COLLECTED: 49. TESTS EXECUTED: 49. PASSED: 49. FAILED: 0. BLOCKED: 0. SKIPPED: 0.

### A note on two tooling-level bugs found and fixed *inside the test file itself* (not the contract)
- `direct_alice`/`direct_bob` fixtures return a real `Address` object only if `genlayer` is already imported in the process at fixture-construction time, else raw `bytes` (both observed depending on test ordering) — added a small `_hex()` normalizer in the test file rather than assuming one shape.
- Calling `genvm_linter.validate.validator.extract_schema` **in-process**, inside the same pytest run as `gltest.direct` tests, corrupts shared process state (`GENERATING_DOCS` env var + a stale `genlayer.gl` module left in `sys.modules`), which then makes `gl.message_raw` appear as the literal `...` placeholder in every subsequent test in that process. Fixed by running that one check in an isolated subprocess (`_static_schema()` in the test file) instead of importing it directly.

## Storage persistence / invariant results (closure Section 6, explicit answers)

- **STATE PERSISTENCE**: VERIFIED — every write is followed by an independent `get_*` view call in the same test, confirming the mutation is actually stored, not just returned transiently.
- **COMMUNITY ISOLATION**: VERIFIED — activating a constitution in community A leaves community B's `active_constitution_version` at 0 (`test_storage_runtime_invariants`).
- **CONSTITUTION IMMUTABILITY**: VERIFIED — v1's rule content is byte-identical before/after a v2 supersedes it as active; v1's status correctly becomes `RETIRED` (by design — exactly one `ACTIVE` version at a time) rather than being deleted or silently mutated.
- **CASE VERSION BINDING**: VERIFIED — a case's `constitution_version` is unchanged across two subsequent constitution activations in the same community.
- **EVIDENCE OWNERSHIP**: VERIFIED — an evidence ID minted for one case never appears in another case's `list_evidence`, and cross-case lookup raises.
- **FREEZE IMMUTABILITY**: VERIFIED — post-freeze, evidence rows show `frozen=True`, and both `add_context`/`submit_evidence` revert.
- **FAILED-WRITE ATOMICITY**: **PARTIALLY VERIFIED, with an explicit UNVERIFIED remainder, per closure instruction "mark it UNVERIFIED rather than assuming it."** What IS verified: a Python exception raised partway through `add_rule` (duplicate rule_id, caught after validation but before the map write) leaves `constitution_rule_order`'s length unchanged in this in-memory VM — i.e. this contract's *own* write-ordering doesn't leave a half-written rule behind at the Python level. What is NOT verified: whether the underlying **GenVM transaction/consensus layer** itself provides atomic rollback of *all* storage writes on revert (the real cross-validator commit semantics) — that is a property of the live network's execution engine, not of this in-memory test runner, and was not and cannot be established at Stage 1. Treat GenVM-level transaction atomicity as UNVERIFIED until a hosted StudioNet test (Stage 7) exercises a reverting write and rereads state.

## Known limitations (carried over / updated)

- GenVM API generation divergence (documented in the previous version of this file) still applies: this contract targets Generation A (`gl.Contract`), matched by the installed CLI/test tooling; Generation B (`gl.contract.Contract`) exists in the same official releases and should be re-checked against whatever StudioNet actually runs before Stage 7.
- `genlayer-test`'s bundled `gltest.direct.sdk_loader` has a real, disclosed asset-naming bug against current `genlayerlabs/genvm` releases (item 2 above) — flag for the FairMod team to report upstream or to re-check when upgrading `genlayer-test`.
- The `genlayer` CLI 0.39.2's `checkCliVersion()` crash (item B above) is unfixed upstream; it only matters for the localnet/Docker path, which Stage 1 no longer depends on, but Stage 7 (hosted StudioNet) may hit it too if it uses the same CLI for anything beyond direct RPC calls — worth a preemptive check before Stage 7.
- GenVM transaction-level write atomicity on revert remains UNVERIFIED (see above) — this is explicitly a Stage 7 hosted-proof item now, not assumed.
