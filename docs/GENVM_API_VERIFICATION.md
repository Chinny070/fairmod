# GenVM Contract-Side API Verification (Stage 0)

## Method — how the real source was obtained
No GenLayer docs MCP or Skills plugin was installable/available as slash commands in this environment (this is a Claude Code session; the brief's fallback instruction — "use the equivalent accessible primary official GenLayer documentation and locally installed package/source/type declarations" — applies). Instead of relying on docs-website WebFetch summaries (which had already produced one wrong conclusion, on IMAGE), the actual embedded GenVM Python standard library source was obtained via a real official channel already present on this machine:

1. `genvm-linter` (installed via pip, version `0.11.1rc2`) contains a `download_artifacts()` function (`genvm_linter/validate/artifacts.py`) that fetches GenLayer's own official runtime release bundle from `genlayerlabs/genvm-manager`.
2. Running it fetched `genvm-universal-genlayerlabs-genvm-manager-v0.6.0-rc6.tar.xz` (the current latest per `get_latest_version()`). A previously-cached extraction of the adjacent `v0.6.0-rc5` build was already unpacked on disk and was read directly for this verification.
3. `genlayer new probe` (using the installed `genlayer` CLI 0.39.2) also scaffolded an official example contract (`football_bets.py`) for cross-reference, though that template pins an older `genlayer-test==0.1.1`/`genlayer-js: 0.8.0` and uses an older-looking call style (`gl.get_webpage`, `gl.exec_prompt` unqualified, `gl.eq_principle_strict_eq`) — this template is **not** treated as current-API truth; the embedded `v0.6.0-rc5/rc6` source under `py-lib-genlayer-std` is treated as authoritative since it is the actual runtime library, and the CLI template is flagged as potentially stale/example-only.

This is source-code verification of the actual embedded standard library, not a documentation paraphrase.

## Storage
Confirmed from `genlayer/py/storage/__init__.py` exports: `DynArray`, `Array`, `TreeMap`, `allow_storage`, `Root`, `Slot`, `Manager`, `Indirection`, `VLA`. The official example contract uses `TreeMap[Address, TreeMap[str, Bet]]` and `TreeMap[Address, u256]` for nested persistent maps, and `@allow_storage` on a `@dataclass` to make an arbitrary struct storable inside a `TreeMap`/`Contract` — this directly informs FairMod's storage design in `ARCHITECTURE.md` (nested `TreeMap`s for `(community_id, version)`-keyed constitutions/rules, `(case_id, evidence_id)`-keyed evidence).

## Schema
`gl.Contract.__get_schema__()` (in `genvm_contracts.py`) generates a JSON schema from the class via `genlayer.py.get_schema`; this is also exposed via the `genlayer` CLI's `schema <contractAddress>` command and genlayer-js's `getContractSchema`/`getContractSchemaForCode`. Contract classes are declared as `class MyContract(gl.Contract): ...` — exactly one `Contract` subclass per module is enforced at the class level (`__init_subclass__` raises `TypeError` on a second one).

## Timestamps — corrected
`gl.message_raw['datetime']` (a string on the raw message dict, from `genlayer/_internal/msg.py`'s `MessageRawType`) is the deterministic transaction datetime. The convenience `gl.message` NamedTuple (`contract_address, sender_address, origin_address, value, chain_id`) does **not** include `datetime` — code must read `gl.message_raw['datetime']` directly. This corrects an assumption in the original Stage 0 pass that a `gl.message.datetime`-style attribute might exist.

## Caller identity
`gl.message.sender_address` (via the `MessageType` NamedTuple) is the call-initiator address FairMod's role checks must use — confirmed from both `genlayer/gl/__init__.py` (`MessageType` construction) and the official `football_bets.py` example (`gl.message.sender_address` used directly for per-user storage keys). `gl.message.origin_address` is also available (the entire transaction's original initiator, distinct from `sender_address` for call chains) — FairMod's role model in `ARCHITECTURE.md` should use `sender_address` for direct-call authorization checks, consistent with the example contract's usage.

## Decorators
```python
@gl.public.view      # read-only method
@gl.public.write      # state-mutating method
@gl.public.write.payable          # state-mutating + accepts value
@gl.public.write.min_gas(leader=N, validator=M).payable  # gas floor variant
```
Confirmed from `genlayer/gl/annotations.py`. `gl.private` exists but is a no-op (everything is private by default; it's documentation-only).

## Contract-to-contract calls
`gl.get_contract_at(address)` returns a `ContractProxy` with `.view()`/`.emit()` namespaces for calling other deployed contracts' methods, and `gl.contract_interface` for a typed version. `gl.deploy_contract(code=..., args=..., kwargs=..., salt_nonce=..., value=..., on='accepted'|'finalized')` deploys a new contract from within a contract — not needed for FairMod's single-registry-contract design, but confirms the language available if a future adapter/integration stage needs it.

## What remains unverified
Whether StudioNet chain 61999's live GenVM build is exactly `v0.6.0-rc5`/`rc6` (the artifact downloaded/read locally) — this is the same "runtime build drift" caveat as in `EVIDENCE_CAPABILITY_MATRIX.md`, resolved only by a real hosted probe deployment in Stage 1/7, not by more source reading.
