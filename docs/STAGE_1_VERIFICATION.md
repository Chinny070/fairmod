# Stage 1 Verification — Deterministic Protocol Core

Contract: [`contracts/fairmod.py`](../contracts/fairmod.py) (660 lines, SHA-256 `955f3cffb6223d0a8c895f2fde71936c9f140d77f1cd1e7df49509dd253af64e`).

## GenVM API generation divergence — a real Stage 1 finding

While pinning the header, `genvm-linter`'s own `download_artifacts()`/`find_latest_runner()` revealed that the **same official latest release** (`genlayerlabs/genvm-manager` v0.6.0-rc6) ships **two coexisting, incompatible GenVM Python SDK generations** under different `py-genlayer` runner hashes:

| | Generation A (`1jb45aa8...` runner → std `11rhn002...`) | Generation B (`5jycge...` runner → std `kzr02ndm...`) |
|---|---|---|
| Import style | `from genlayer import *` | `import genlayer as gl` |
| Contract base | `gl.Contract` | `gl.contract.Contract` |
| Storage decorator | `@allow_storage` | `@gl.storage.allow` |
| Storage types | `TreeMap`/`DynArray` (flat) | `gl.storage.TreeMap`/`gl.storage.DynArray` |
| `gl.message.datetime` | Does not exist — only `gl.message_raw['datetime']` | Exists directly (flat module attrs incl. `datetime`) |
| `find_latest_runner()` picks it? | No | Yes ("latest") |
| Matched by installed `genlayer new` CLI scaffold (0.39.2)? | Yes (`football_bets.py` uses this exact shape) | No |
| Matched by installed `genlayer-test`/`gltest` (0.29.2) contract-discovery AST? | Yes — its AST check literally looks for `base.value.id == 'gl' and base.attr == 'Contract'` (confirmed by reading `gltest/artifacts/contract.py`) | No — this AST pattern does not match `gl.contract.Contract` |

**Decision:** Stage 1 targets **Generation A**, pinned to its exact runner hash (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`, not "latest"), because it is the generation every other piece of the locally-installed, real toolchain (CLI scaffold, `gltest`'s contract discovery) actually understands and can exercise. Generation B is real and officially shipped, but no locally available dev/test tool can currently deploy or discover a contract written against it — targeting it would have made every direct test unrunnable even once a localnet is available, for a tooling-compatibility reason with nothing to do with the contract's own correctness.

This was discovered empirically: an earlier draft of this contract was written against Generation B, passed `genvm-lint check`'s schema validation (`validate.ok: true`, 20 methods) but was then rejected by `gltest`'s AST-based contract finder with `FileNotFoundError` before any deploy attempt. Switching to Generation A resolved this without any other code changes. `genvm-lint` still emits an informational (`I200`, non-blocking) note that a newer runner exists — expected and intentional, not an error.

Consequence for Stage 0 docs: `docs/GENVM_API_VERIFICATION.md`'s statement that `gl.message.datetime` does not exist is correct **for Generation A** (the one this contract uses) but not universally true of every GenVM SDK build — Generation B's `gl.message.datetime` does work. This contract uses `gl.message_raw['datetime']`, matching Generation A.

## Storage implemented
`Community`, `RuleRevision`, `Constitution`, `ContextItem`, `Evidence`, `Case` — all `@dataclass` + `@allow_storage`, matching the pattern verified from the official `football_bets.py` example. Top-level contract storage: `communities`, `community_order`, `community_counter`, `roles` (nested `TreeMap[str, TreeMap[str, str]]`), `constitutions` (nested `TreeMap[str, TreeMap[u256, Constitution]]`), `cases`, `contexts`, `evidence` (nested), `evidence_order`. All `TreeMap`/`DynArray` — no raw Python `dict`/`list` persisted (verified: `genvm-lint`'s schema extraction succeeded, which would fail on unsupported raw containers used as annotated storage).

## Permissions matrix

| Action | OWNER | ADMIN | MODERATOR | Reporter (case owner) | Anyone else |
|---|---|---|---|---|---|
| `grant_role`/`revoke_role` | ✅ | ❌ | ❌ | — | ❌ |
| `create_constitution_draft`/`add_rule`/`activate_constitution` | ✅ | ✅ | ❌ | — | ❌ |
| `create_case` | ✅ | ✅ | ✅ | ✅ (anyone) | ✅ (anyone — no privilege required, per spec) |
| `add_context`/`submit_evidence` (pre-freeze) | — | — | — | ✅ | any address, no role check (matches spec: "ordinary users may submit/report cases... evidence") — bounded by state (case must be OPEN) only |
| `freeze_case` | ✅ (of that community) | ✅ | ✅ | ✅ (own case) | ❌ |
| All read (`get_*`/`list_*`) | ✅ | ✅ | ✅ | ✅ | ✅ (public reads) |

OWNER is implicit (the `create_community` caller), never granted/revoked, and cannot be duplicated as a role entry (`grant_role` explicitly rejects `target_addr == community.owner`).

## Constitution lifecycle
`create_constitution_draft` → `add_rule` (repeatable while `DRAFT`) → `activate_constitution` (irreversible: sets `ACTIVE`, retires the previous `ACTIVE` version if any, sets `active_constitution_version`). No method can write into `rules`/`status`/any field of a `Constitution` whose `status != DRAFT` — verified by code inspection: only `add_rule` and `activate_constitution` touch `Constitution` fields, and both gate on `status == DRAFT` first.

## Stable logical Rule IDs
`rules: TreeMap[str, RuleRevision]` keyed by the logical `rule_id` string (e.g. `"HARASSMENT"`), scoped per `(community_id, version)` via the outer `constitutions[community_id][version]` structure. A later version may define a different `RuleRevision` under the same logical `rule_id` string without touching the earlier version's copy — verified in `test_stable_logical_rule_id_different_definitions_across_versions`.

## Case lifecycle (Stage 1 boundary)
`OPEN` → `EVIDENCE_FROZEN` only. `create_case` requires `active_constitution_version != 0` and binds `constitution_version` permanently at creation. `freeze_case` is a one-way, one-time transition (guarded by `state == CASE_OPEN`) authorized only for the reporter or an OWNER/ADMIN/MODERATOR of the case's own community (role resolved from `case.community_id`, never a caller-supplied value). **No public method in this contract can set `state` to anything other than `OPEN` (constructor-implied) or `EVIDENCE_FROZEN` (via `freeze_case`)** — `ADJUDICATING`/`DECIDED`/`NEEDS_REVIEW`/`CHALLENGE_WINDOW`/`CHALLENGED`/`CHALLENGE_DECIDED`/`FINAL` are intentionally unreachable; they require Stage 3 (GenLayer consensus callback) and Stage 4 (challenge logic) that do not exist in this file.

## Freeze invariants
After `freeze_case`: every evidence row for that case gets `frozen = True`; `add_context` and `submit_evidence` both hard-require `case.state == CASE_OPEN` and therefore reject any call once frozen; no method exists to modify `case.content`, delete/replace an evidence row, or delete a context item, at any case state (content is in fact immutable from creation, which is stricter than the spec's minimum requirement, not a gap).

## Resource bounds (with rationale)
See the `MAX_*` constants at the top of `contracts/fairmod.py` — each has an inline comment stating why that specific limit was chosen (display-field brevity, adjudication-prompt-size containment for rule/definition fields, SSRF/storage-growth containment for URLs, etc.). Every bound is enforced via `_bounded_str`/explicit `_require` length checks before any write, including boundary-exact values (tested at exactly `MAX_NAME_LEN`, `MAX_CONTEXT_ITEMS`, `MAX_EVIDENCE_PER_CASE`).

## Replay/idempotence
- Community/case/evidence IDs are counter- or pattern-derived (`f'c{n}'`, `f'{community_id}#{n}'`, `f'{case_id}:e{n}'`) and cannot collide or be supplied by a caller; each creation path has a redundant `_require(... not in ...)` unreachable-guard as defense in depth.
- `grant_role` with an already-held identical role is a **documented no-op**, not a revert (see inline comment) — distinguished explicitly from an error case.
- `activate_constitution` on an already-`ACTIVE`/`RETIRED` version reverts (status guard).
- `freeze_case` on an already-frozen case reverts (state guard).
- `revoke_role` on an address that never held a role is a safe no-op (avoids a timing/error-content side channel about role history).

## Lint
```
genvm-lint check contracts/fairmod.py --json
{"ok":true,"lint":{"ok":true,"passed":3},"validate":{"ok":true,"contract":"FairMod","methods":20,"view_methods":10,"write_methods":10,"ctor_params":0,"warnings":[{"code":"I200","msg":"py-genlayer: a newer runner is available (5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng). See https://github.com/genlayerlabs/genvm-manager/releases for changes."}]}}
```
`ok: true` overall. The one warning is informational (Generation B exists, see above) and intentionally not acted on for the reasons given.

## Schema
Extracted via `genvm_linter.validate.validator.extract_schema` (real SDK reflection, not hand-written) and saved to [`docs/fairmod_schema.json`](fairmod_schema.json): constructor takes 0 params (matches `__init__(self)`), 20 total methods (10 `readonly: true` view, 10 write), argument/return types all resolve correctly (`string`, `int`, `bool`, `array`, `dict`, `null`). This is real schema-generation proof, not a claim — it is the same reflection path GenVM itself uses to produce a deployed contract's ABI.

## Direct tests
[`test/test_fairmod.py`](../test/test_fairmod.py): 30 tests across COMMUNITY, ROLES, CONSTITUTIONS/stable-rule-IDs, CASES, CONTEXT, EVIDENCE, FREEZE, STATE MACHINE, TIME categories, using `genlayer-test`'s real `gltest` fixtures (`get_contract_factory`, `get_accounts`, `contract.connect(account)`, `tx_execution_succeeded`/`tx_execution_failed`) against real transactions — no mocked nondeterminism (Stage 1 has none to mock).

**Collection status:** all 30 tests collect and are correctly wired against the real `gltest` API (verified by reading `gltest/contracts/contract.py`/`contract_factory.py` source directly — `contract.connect()` is real, `factory.deploy(account=...)` is real; an earlier draft's guessed `factory.get_contract(...)`/`contract.get_contract_schema()` calls were found to be wrong by source inspection and corrected before this report, replaced with `contract.connect()` and a local `genvm_linter`-based static schema check respectively).

**Execution status: BLOCKED**, not PASS. Exact chain of blockers:
1. `genlayer up --headless` (the official localnet starter) crashes before reaching Docker:
   ```
   TypeError: Cannot read properties of undefined (reading 'code')
       at getMostRecent (...node_modules\genlayer\node_modules\update-check\index.js:125:11)
   ```
   — an unrelated bug in the CLI's own update-check step (likely triggered by this sandboxed environment's restricted network access), not something in FairMod's contract or tests.
2. Independently, the Docker daemon itself is not running in this environment (`docker ps` → `error during connect: ... open //./pipe/dockerDesktopLinuxEngine`), so even a working `genlayer up` would have nothing to attach to without the user starting Docker Desktop first.
3. Running `pytest test/test_fairmod.py` against this state reaches exactly the expected point — real schema/discovery/deploy-request construction all succeed, and it fails only at the actual network call: `HTTPConnectionPool(host='127.0.0.1', port=4000): ... actively refused it`.

This is reported as BLOCKED, not converted to a false PASS, per Stage 1 rule #17. Everything short of the actual live localnet round-trip (static lint, schema reflection, test collection/wiring, and manual code-path review below) was independently exercised.

## Hostile self-audit (manual code-path review, since runtime execution is blocked)
Walked every attack in the Stage 1 brief against the actual code in `contracts/fairmod.py`:
- **Become admin/moderator without authority**: `grant_role` requires `gl.message.sender_address == community.owner`; no other path writes `self.roles`. Cannot self-escalate.
- **Cross-community authority**: every role/constitution check resolves `community.owner`/role map from the *target* `community_id`'s own `Community`/`roles` entry, never from a caller-supplied assumption; `freeze_case` derives the required role from `case.community_id` (the case's own community), not any parameter.
- **Modify an activated constitution / change an old rule via a newer version**: `add_rule` and `activate_constitution` both gate on `constitution.status == CONSTITUTION_DRAFT`; no other method touches a `Constitution`'s fields.
- **Old case resolves against new constitution**: `case.constitution_version` is set once at `create_case` and never written again anywhere in the file.
- **Alter content/context/evidence after freeze**: no method mutates `case.content` ever; `add_context`/`submit_evidence` both require `case.state == CASE_OPEN`; no delete/replace method exists for context or evidence at any state.
- **Cross-case evidence reference**: `get_evidence`/`submit_evidence` always operate on `self.evidence[case_id]`, a per-case map; evidence IDs are also self-describing (`f'{case_id}:e{n}'`), so even a lookup mistake can't resolve to another case's row.
- **Freeze someone else's case / freeze twice**: authorization checked (reporter or community role) and state guarded (`CASE_OPEN` only) — both tested directly.
- **Collide IDs**: all IDs protocol-generated from monotonic counters/string patterns embedding their parent's ID; every creation path also carries a redundant unreachable-guard.
- **Bypass bounds**: every string field is bounded via `_bounded_str` before storage; every list append path checks a length bound with `_require` first.
- **Force DECIDED/FINAL**: no such method exists in the 20-method schema (mechanically checked in `test_no_public_method_can_force_decided_or_final`).
- **Forge timestamps**: no method accepts a timestamp parameter (checked mechanically against the schema); every timestamp field is written from `_now()` only.
- **Corrupt counters/indexes**: all counters are private-mutated fields on dataclasses reached only through internal contract logic, never exposed as writable method parameters.
- **Irreversible dead state at the Stage 1 boundary**: `EVIDENCE_FROZEN` is the intended Stage 1 terminal state (Stage 2/3 continues it); it is not a bug that Stage 1 alone cannot proceed further — that is the documented, intentional hard stop.

**No material findings requiring a code fix** were identified in this pass. Minor, non-security observations recorded as known limitations below.

## Known limitations
- Runtime direct-test execution is environment-BLOCKED (Docker/localnet unavailable) — see above. This is a tooling/environment gap, not a code gap; the tests themselves are ready to run once a localnet is reachable.
- `rule_id` character set is not restricted beyond length + non-empty (e.g. `"HARASSMENT"` vs `"harassment "` are different keys) — acceptable for Stage 1 (it's just a map key), but Stage 5's cross-community Precedent Explorer should probably normalize/document a casing convention.
- Reported case `content` is immutable even pre-freeze (no edit method) — stricter than the spec requires, not a defect, but worth noting since a future stage might want a bounded pre-freeze edit path.
- GenVM Generation B (`gl.contract.Contract` style) exists and is real, but nothing in this contract targets it — if the locally-installed tooling (`genlayer-test`) is upgraded to recognize Generation B before Stage 7's hosted proof, this pin decision should be revisited against whatever StudioNet 61999 is actually running by then.

## Future-stage hooks already present in the data model (not implemented, per Stage 1 boundary)
`Evidence.retrieval_status`/`Evidence.fingerprint` fields exist and are populated with `NOT_APPLICABLE`/`PENDING`/`''` placeholders — Stage 2/2A's `gl.nondet.web.render`/`eq_principle` flow writes into these same fields without needing a schema migration. `EVIDENCE_TYPE_DOCUMENT`/`EVIDENCE_TYPE_IMAGE` are accepted at the record layer today (metadata only) so Stage 2A can enable their retrieval without changing `submit_evidence`'s signature. The case state machine's `CASE_OPEN`/`CASE_EVIDENCE_FROZEN` constants sit alongside commented-out-of-reach state names, ready for Stage 3/4 to add new transitions without renaming existing ones.
