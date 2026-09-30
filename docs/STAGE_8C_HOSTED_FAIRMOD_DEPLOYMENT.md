# Stage 8C — Temporary FairMod StudioNet Deployment & Hosted E2E Results

**This is a temporary test deployment, not canonical.** Deployed using only the disposable `my-studionet-wallet` account. No canonical wallet was used or accessed at any point.

## Deployment

| Field | Value |
|---|---|
| Contract | `contracts/fairmod.py` (header-boundary-corrected; semantic diff from the accepted Stage 8 release candidate: **NONE** — see below) |
| Source hash | `e6fcc870cef9f70efeb7b148e2065aff297e850bafba18ad2537a9ae52970e0d` |
| Transaction | `0x17343f3610fe94ffc22528b849a0326f27d94bec2d1544c1a2bb6c0b8f2def5f` |
| Contract address | `0xB29187225636f6C43C5D9231Ab4f9cfc00907609` |
| Protocol status | FINALIZED |
| GenVM execution result | **SUCCESS** (Result Code: Return) |
| Schema query | PASS — all 30 methods present and correctly typed |
| Code query | PASS — matches deployed source exactly |

## FairMod semantic diff (Section 5)

Diffed the accepted Stage 8 state (commit `6eda06b`, hash `417cf3de5fef4e6e3a28c0d63510771f18e923dcf42a1f94295a1dc7d3c72d36`) against the header-fix commit (`49f65f6`, hash `e6fcc870...`) via `git diff 6eda06b..49f65f6 -- contracts/fairmod.py`. The **only** change is removal of the introductory comment block between the `Depends` line and the first `import` (comment lines only — no code, storage, method signature, or logic changed). **FAIRMOD SEMANTIC DIFF: NONE.** Confirmed further by 195/195 contract tests, 66/66 frontend tests, and identical schema (30 methods, 14 view/16 write) before and after.

## Debug trace attempts (Section 4)

`gen_dbg_traceTransaction` attempted against both the old failed probe (`0xdbd7e25d...`) and the new successful probe (`0xa8d1b91d...`). Both returned `Method not found: gen_dbg_traceTransaction` (RPC error -32601). **DEBUG TRACE: UNAVAILABLE** on this RPC endpoint for both. No network/endpoint change was made to work around this, per instruction.

## Local release gate (Section 7)

| Check | Result |
|---|---|
| Python compile | PASS |
| `genvm-lint` 0.11.0 | PASS |
| Schema | PASS — 30 methods (14 view, 16 write) |
| Contract tests | **195 passed, 0 failed** |
| Frontend typecheck | PASS |
| Frontend lint | PASS (0 errors, 1 pre-existing benign warning) |
| Frontend tests | **66 passed, 0 failed** |
| Frontend production build | PASS |
| Production mock fallback | NO |
| Backend | NONE |
| FairMod hash | `e6fcc870cef9f70efeb7b148e2065aff297e850bafba18ad2537a9ae52970e0d` — exact match |

## Hosted lifecycle exercised

All calls below used the disposable `my-studionet-wallet` account against `0xB29187225636f6C43C5D9231Ab4f9cfc00907609`. For every write, the pattern followed was: submit → observe protocol status (via `genlayer receipt`, waiting for `FINALIZED`) → observe GenVM `execution_result` → **then** independently re-read authoritative contract state via a separate `genlayer call`. No step was marked successful from a transaction hash or "FINALIZED" status alone.

| Step | Tx hash | Execution result (majority) | Authoritative reread confirms |
|---|---|---|---|
| `create_community("Stage8C Test Community", ...)` | `0xfb040dffb19d5390acc85ac11a152a17da6efcd6e860ad0d4623986629b6c44f` | SUCCESS (3/5 agree) | `list_communities` → `['c0']`; `get_community('c0')` matches submitted name/metadata |
| `create_constitution_draft('c0')` | `0xd71078dc170d1cc6445a537e317fe8f7046d1c2215629e4d05f7e6a5aad1c9b2` | SUCCESS (returned version `1`) | — |
| `add_rule(...HARASSMENT...)` | `0x270fdb3452234ef33b420c146518ab35c3ed7a351de0a2cdea5f55d3b6d86f5a` | SUCCESS (4/6) | `get_constitution('c0',1)` shows the HARASSMENT rule with exact submitted text |
| `activate_constitution('c0',1)` | `0x6e963c25418dab31d8f6452d4aa37c9bb31c1c88c3027b3712de151e8ece8888` | **SUCCESS (6/6 unanimous)** | `get_active_constitution_version('c0')` → `1` |
| `create_case('c0', "You are a worthless idiot...")` | `0x79be688bcf27e30692fca9f14bd058a38d11876c3d62a3bf8a4252b7b7bec205` | SUCCESS (returned `"c0#0"`) | — |
| `add_context('c0#0', 'prior-warning', ...)` | `0xe80895e62cb680b33d23c47928cdaadbe7c0e448ba533adeb3662998c6ac118d` | SUCCESS (4/6) | `get_case` shows `context_count: 1` |
| `submit_evidence(TEXT, ...)` | `0xa506dcf1e5aaaf06df4db629e54a448324bb16fcaa4f3e0d4f0e544a31bff7cf` | SUCCESS (4/6) | `list_evidence` includes `c0#0:e0` |
| `submit_evidence(WEB_LINK, https://example.com)` | `0xb23db7e146c394c8116ee80923b0e786d1b2f1845ee882d9d57d82bc02c515da` | SUCCESS (4/6) | `list_evidence` includes `c0#0:e1` |
| `submit_evidence(IMAGE, https://example.com)` | `0x1d045816a234fd700fce170c09559a781733ab969504cacf4eede3dc2df3ddfe` | **SUCCESS (6/6 unanimous)** | `list_evidence` includes `c0#0:e2` |
| `freeze_case('c0#0')` | `0x52d560bb34a6082232c520c156b8b29266953458deb13d122e96cdb023aceede` | SUCCESS (4/6) | `get_case_state` → `EVIDENCE_FROZEN`; all 3 evidence rows `frozen: true` |
| `acquire_evidence('c0#0','c0#0:e1')` — **real `gl.nondet.web.get`** | `0x7218f90de370d8743f65c309c2fd57d4b99eb4a48e4712c579857a9830a30a08` | SUCCESS (4/6), returned `"ACQUIRED"` | `get_evidence` shows real fetched HTML (`<!doctype html>...Example Domain...`), `retrieval_status: ACQUIRED`, real fingerprints |
| `acquire_evidence('c0#0','c0#0:e2')` — **real screenshot + vision model** | `0x0b1c3e6516e5ec0c3fe4e6f714169a4bd059c3175e3b5bbaf3f2e90f6a2cb8ec` | SUCCESS (4/6), returned `"ACQUIRED"` | `get_evidence` shows real model-generated `content_excerpt` describing the visible page text, `retrieval_status: ACQUIRED` |
| `adjudicate_case('c0#0')` — **real cross-validator semantic consensus** | `0x11b86105dba468c3da6d2c18d49055ce0afd0a1ba97f11b64d44b10d6cb743c6` | SUCCESS (4/6), returned `"DECIDED"` | `get_case` shows `state: DECIDED`, `verdict: FLAGGED`, `violated_rule_ids: ['HARASSMENT']`, real generated `explanation`/`material_facts` |
| `file_challenge('c0#0', ...)` | `0xeec11953ce80f8a7b2f0c5c4083f8a9f88e4a6219f7d094300b4d6b81ec0aaee` | SUCCESS (4/6) | `get_case` shows `state: CHALLENGED` |
| `resolve_challenge('c0#0')` — **real challenge-specific consensus** | `0x16435d163b1a293b4152cf27bde8b302995efd049e46fa755d8d372d779cf49f` | SUCCESS (4/6), returned `"FINAL"` | `get_case` shows `state: FINAL`, `challenge_outcome: UPHOLD`, `final_verdict: FLAGGED`, distinct real reasoning about the challenge itself (not a re-vote of the original prompt) |
| `run_fairness_mirror('c0#0')` — **real non-authoritative consensus** | `0x51b2cf575b9c352eef9fb970a09987e6293deac4e2d634148290d92b94aa09fd` | SUCCESS (4/6), returned `"CONSISTENT"` | `get_case` shows `fairness_mirror_status: CONSISTENT` with real generated explanation; `verdict`/`final_verdict`/`challenge_outcome`/`state` all **unchanged** |
| `get_moderation_receipt('c0#0')` (read) | — | — | Full receipt matches every field above exactly, plus `content_fingerprint` |
| `get_case_precedents('c0','HARASSMENT',20)` (read) | — | — | Returns exactly `[{case_id: 'c0#0', final_verdict: 'FLAGGED', ...}]` |
| `get_community_cases('c0',0,10)` (read) | — | — | Returns the one finalized case, correctly paginated |
| `get_community_stats('c0')` (read) | — | — | `total_cases:1, total_challenged:1, total_initial_flagged:1, total_finalized:1, total_final_flagged:1, total_overturned:0` — algebraically consistent with the exercised lifecycle |

## Frontend against the temporary deployment (Section 22)

`VITE_FAIRMOD_CONTRACT_ADDRESS` set locally (not committed) to `0xB29187225636f6C43C5D9231Ab4f9cfc00907609`; dev server started; navigated to `/cases/c0%230`. Confirmed real rendering of: case state (FINAL), reported content, context (correctly labeled non-evidentiary), all 3 evidence rows with real `ACQUIRED` content excerpts (including the real fetched HTML and the real vision-model description), the structured verdict (initial + application-final, both FLAGGED/HARASSMENT), the full moderation receipt, precedent (correctly labeled "informational — not binding"), and the Fairness Mirror result (correctly labeled "non-authoritative — never changes the verdict", showing CONSISTENT). No mock/fixture data was used — this was the real frontend reading the real deployed contract over the real StudioNet RPC. **FRONTEND TEMP CONTRACT: PASS.**

## Known CLI limitation found (not a contract defect)

Attempting `grant_role`/`get_role` with an address-shaped string argument (e.g. `0x1111...1111`) via the repository-local CLI's raw `write`/`call --args` interface fails with `TypeError: cannot convert 'Address' object to bytes` (or, with a `str#` prefix workaround attempt, a different `exit_code 1` failure). Root cause: the CLI's own argument-type heuristic (documented in its own `--help` output: "address: 0x6857...a0 (40 hex chars)") auto-promotes any 40-hex-char argument to an `Address` type before sending it, but `grant_role`'s `target` parameter is declared `str` in the schema — the contract's own `Address(target)` call then fails trying to construct an `Address` from an already-`Address` value. This reproduced identically on both a plain lowercase hex string and a `str#`-prefixed attempt. **This is a CLI-side argument-encoding limitation, not a contract or GenVM defect** — the frontend adapter (which passes plain JS strings directly through `genlayer-js`'s typed `args` array, never through this CLI heuristic) does not have this issue, as already proven by 9 passing adapter boundary tests including an exact-argument-order test for `grant_role` itself (`src/adapter/fairmodAdapter.test.ts`). Owner-authorization enforcement itself was still indirectly and positively verified: every OWNER-gated call in this session (`create_constitution_draft`, `add_rule`, `activate_constitution`) succeeded specifically because the calling wallet is the community's owner (`get_community('c0').owner` matches the sender address exactly).

## What remains genuinely untested this session

- **NEEDS_REVIEW / ALLOWED verdicts**: not reproducibly triggered this session (only FLAGGED was obtained on the one real case exercised — content was deliberately unambiguous harassment to reliably get a real semantic verdict on the first attempt, matching Section 16's "do not manipulate contract semantics merely to force all three" instruction). **NOT REPRODUCIBLY TRIGGERED** for ALLOWED and NEEDS_REVIEW specifically this session — marked honestly, not fabricated.
- **24-hour timeout finalization path**: this case reached FINAL via challenge resolution, not the `finalize_case` permissionless timeout path. The 24h challenge deadline was correctly computed by real GenVM deterministic time (`challenge_deadline` exactly 24h after `decided_at`), but waiting a real 24 hours to exercise the timeout path itself was not done this session. **PENDING REAL TIME WINDOW.**
- **Live wallet browser-extension QA**: `claude-in-chrome`'s `list_connected_browsers` returned empty — no extension available. **NOT AVAILABLE**, unchanged from Stage 8.
- **`grant_role`/`revoke_role` hosted execution**: blocked by the CLI argument-encoding limitation described above, not attempted via a different tool this session.
