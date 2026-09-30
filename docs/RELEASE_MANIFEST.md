# FairMod — Release Manifest

## Stage 9B update — CANONICAL DEPLOYMENT VERIFIED

FairMod is now deployed at its **canonical production address**, manually deployed by the user via the GenLayer Studio website and independently re-verified by this session:

| Field | Value |
|---|---|
| **Canonical contract address** | **`0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450`** |
| Deployment transaction | `0x22ad7f2ad5415dc2592a2e062bcb062c4723aa378425b8cdb310a6c2826dad2c` |
| Protocol status | FINALIZED |
| GenVM execution result | SUCCESS (Result Code: Return) |
| Schema | PASS — exactly 30 methods (14 view, 16 write) |
| Code match | PASS — byte-identical to `contracts/fairmod.py` (confirmed via line-ending-normalized diff) |
| Basic read call | PASS — `list_communities()` returned `[]` on the fresh deployment |
| Independently reconfirmed via Explorer | YES — `https://explorer-studio.genlayer.com/tx/0x22ad7f2ad5415dc2592a2e062bcb062c4723aa378425b8cdb310a6c2826dad2c` |

**Production frontend configuration**: `VITE_FAIRMOD_CONTRACT_ADDRESS=0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450` — confirmed working end-to-end against this address (typecheck/lint/tests/build all pass with it set; real reads of live canonical state rendered correctly in the frontend). Not yet set in any live hosting environment — see "Public frontend hosting" below.

**Note on the deploying account**: the Explorer shows the deployment's `From` address as `0xaffE15eEc45b68835cc9E5B4Ab85dD5deaE8e70b` — the same disposable `my-studionet-wallet` account used throughout Stage 8C testing, not a distinct address. This is stated factually for the record; it does not affect the technical verification above (ownership/administration of the deployed contract is determined by whichever address the deploying transaction's sender was, per `create_community`'s own `owner = gl.message.sender_address` logic — see `contracts/fairmod.py`).

**Smoke test** (Stage 9B, against the canonical address, disposable wallet only): community creation → constitution draft/rule/activation → case creation with context and TEXT evidence → freeze → real hosted adjudication (verdict FLAGGED, rule SPAM, real generated explanation) → receipt/history reread. All steps `execution_result: SUCCESS`, all reads confirmed authoritative state. Full detail in `docs/STAGE_9B_CANONICAL_VERIFICATION.md`.

**Canonical wallet used by Claude**: NO — every write above (both the earlier Stage 8C hosted campaign and this smoke test) used only the disposable `my-studionet-wallet` account. The canonical deployment transaction itself was submitted by the user, manually, through the GenLayer Studio website — Claude never accessed or requested the user's private key or seed phrase.

---


## Release identity

| Field | Value |
|---|---|
| Release commit | `f2bd21a` (Stage 8C, accepted COMPLETE) |
| Contract path | `contracts/fairmod.py` |
| Contract SHA-256 | `e6fcc870cef9f70efeb7b148e2065aff297e850bafba18ad2537a9ae52970e0d` |
| Runner | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |
| Network | StudioNet |
| Chain ID | 61999 |
| RPC | `https://studio.genlayer.com/api` |
| Repository-local CLI | `genlayer` 0.39.1 |
| Linter | `genvm-linter` 0.11.0 |
| Contract test framework | `genlayer-test`/`gltest` 0.29.2 |
| Frontend GenLayer SDK | `genlayer-js` 1.1.8 (exact) |

## Verification counts

| Check | Result |
|---|---|
| Contract tests | 195 passed / 0 failed |
| Frontend tests | 66 passed / 0 failed |
| Public schema methods | 30 (14 view, 16 write) |
| GenVM lint | PASS |
| Frontend typecheck/lint/build | PASS |
| Production mock fallback | NO |
| Backend | NONE |

## Stage 8C temporary deployment — **TEST ONLY, NOT CANONICAL**

| Field | Value |
|---|---|
| Transaction | `0x17343f3610fe94ffc22528b849a0326f27d94bec2d1544c1a2bb6c0b8f2def5f` |
| Address | `0xB29187225636f6C43C5D9231Ab4f9cfc00907609` |
| Status | FINALIZED, `execution_result: SUCCESS` |

**This address must never be used as the production configuration value.** It exists only as the record of the hosted verification described below. A separate, distinct canonical deployment (performed manually by the user per `docs/FINAL_DEPLOYMENT.md`) supplies the real production address.

## Hosted capabilities verified (Stage 8C, against the temporary deployment above)

- Community creation, role-owner authority
- Constitution draft → rule addition → activation
- Case creation, context addition
- Real TEXT evidence
- Real WEB_LINK evidence via genuine validator-side `gl.nondet.web.get` (fetched real HTML from `example.com`)
- Real visual/IMAGE evidence via genuine validator-side `gl.nondet.web.render(mode='screenshot')` + `gl.nondet.exec_prompt(images=[...])` (real vision-model description)
- Evidence freeze
- Real cross-validator semantic adjudication (verdict FLAGGED, rule HARASSMENT, real generated explanation)
- A real application-level challenge and its independent resolution (outcome UPHOLD, distinct reasoning from the original adjudication)
- Moderation receipts reflecting authoritative state exactly
- Precedent retrieval (correctly non-authoritative)
- Fairness Mirror (result CONSISTENT; verdict/finality fields structurally unchanged, confirmed by reread)
- Transparency counters (exact, algebraically consistent with the exercised lifecycle)
- Pagination
- Real frontend rendering of all of the above, pointed at the live deployment

Full transaction-by-transaction evidence: `docs/STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md`.

## Known non-blocking limitations

These are disclosed gaps in what was directly observed, not hidden failures — every underlying mechanism they touch was otherwise verified (locally and/or in the hosted lifecycle above):

- **ALLOWED hosted outcome**: not reproducibly triggered this session. Only a FLAGGED verdict was obtained on the one real case exercised (deliberately unambiguous content, to reliably get a real semantic verdict on the first hosted attempt). ALLOWED is extensively covered by local Direct Mode tests (`test/test_stage3.py` and others).
- **NEEDS_REVIEW hosted outcome**: not reproducibly triggered this session, for the same reason. Extensively covered locally.
- **24h timeout-specific hosted path**: the one hosted case reached `FINAL` via challenge resolution, not the `finalize_case` permissionless timeout path. The 24h deadline itself was confirmed correctly computed by real GenVM deterministic time (`challenge_deadline` = `decided_at` + exactly 24h); waiting a real 24 hours to exercise the timeout branch specifically was not done this session.
- **Live browser wallet-extension QA**: unavailable this session (`claude-in-chrome`'s `list_connected_browsers` returned empty — no extension connected). All hosted writes went through the repository-local CLI directly instead, which exercises the identical contract-side code path.
- **`grant_role`/`revoke_role` hosted execution**: blocked by a CLI-side argument-type-encoding limitation (documented in `docs/STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md`) — not a contract defect. Owner-authorization enforcement was still indirectly verified via every OWNER-gated hosted call succeeding specifically because the calling wallet was the community owner.

## GitHub issue status

`genlayerlabs/genvm-manager#50`: the technical blocker is considered **resolved for FairMod's own purposes** — both a corrected minimal probe and the corrected FairMod contract itself deployed successfully with `execution_result: SUCCESS` after removing the introductory comment block between the `Depends` magic comment and the first import. This is **not** a claim that GenLayer's own infrastructure was changed or fixed by anyone else — the evidence points to a source-layout boundary condition in how the hosted GenVM runner parses the region immediately after the Depends header. A draft update describing this is prepared at `docs/GENVM_MANAGER_ISSUE_50_UPDATE_DRAFT.md` and has **not** been posted, pending explicit approval.

## Canonical deployment status

**PERFORMED AND VERIFIED** (Stage 9B) — see the update at the top of this document. Canonical address: `0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450`.

## Production frontend configuration

The single value that receives the canonical address is the **`VITE_FAIRMOD_CONTRACT_ADDRESS`** environment variable (see `frontend/src/config/network.ts` and `frontend/.env.example`). It has no fallback — `getConfiguredContractAddress()` returns `''` when unset, and every read/write surface in the frontend treats an empty/invalid address as `CONTRACT_NOT_CONFIGURED` rather than substituting the Stage 8C temporary address, a mock, or a zero address (confirmed: no other file in `frontend/src` hardcodes a contract address). Set to `0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450` and confirmed working (typecheck/lint/tests/build all pass; a local production build correctly bakes in this address; a local dev server pointed at it correctly rendered real canonical contract state) — but **not yet set in any live public hosting environment**, since none is configured in this repository (no `vercel.json`, `netlify.toml`, CI/CD workflow, or similar exists here). Setting it in a real hosting provider's own environment configuration, once one is chosen, is the only remaining step to go live publicly.
