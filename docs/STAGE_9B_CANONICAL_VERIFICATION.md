# Stage 9B — Canonical Deployment Verification

The user manually deployed the frozen FairMod contract via the GenLayer Studio website, following `docs/FINAL_DEPLOYMENT.md`. This document is this session's **independent** re-verification of that deployment, plus a small smoke test — not a repeat of the full Stage 8 adversarial campaign (those properties were already established against the Stage 8C temporary deployment; see `docs/STAGE_8_HOSTED_STUDIONET_TEST_PLAN.md` and `docs/STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md`).

## 1. Independent deployment verification

| Check | Method | Result |
|---|---|---|
| Transaction FINALIZED | `genlayer receipt 0x22ad7f2a...` | PASS — `status_name: 'FINALIZED'` |
| GenVM execution SUCCESS | same receipt | PASS — majority `execution_result: 'SUCCESS'` (4/6) |
| Created the specified address | same receipt (`recipient`/`contract_address`) | PASS — `0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450` exactly |
| Contract queryable | `genlayer schema` / `genlayer code` | PASS — both succeed |
| Deployed code matches frozen source | line-ending-normalized `diff` between `contracts/fairmod.py` and `genlayer code` output | PASS — byte-identical (only difference was CLI output trailing whitespace, not code) |
| Schema: exactly 30 methods, 14 view / 16 write | `genlayer schema` + grep count | PASS — `readonly: true` × 14, `readonly: false` × 16 |
| Basic read call succeeds | `genlayer call ... list_communities` | PASS — returned `[]` (correct for a fresh deployment) |
| Independently reconfirmed via real Studio Explorer | `https://explorer-studio.genlayer.com/tx/0x22ad7f2a...` | PASS — identical `FINALIZED`/`SUCCESS`/`Return` shown, contract_code in the decoded input matches exactly |

**Observation, not a failure**: the Explorer's `From` field on this deployment transaction is `0xaffE15eEc45b68835cc9E5B4Ab85dD5deaE8e70b` — the same disposable `my-studionet-wallet` account used throughout Stage 8C, not a distinct address. Recorded factually for the record.

## 2. Production frontend configuration

`VITE_FAIRMOD_CONTRACT_ADDRESS=0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450` set locally (in `frontend/.env.local` and `frontend/.env.production.local`, both gitignored, never committed — confirmed via `git check-ignore -v`). No other file was changed to reference this address; no fallback to the Stage 8C temporary address, a mock, or a zero address exists anywhere in `frontend/src` (confirmed by code review — `getConfiguredContractAddress()` in `frontend/src/config/network.ts` is the sole source, and it returns `''`, never a substitute, when unset).

A local production build (`npm run build`) with this value set succeeded and correctly baked the canonical address into the output bundle (confirmed via `grep` on the built JS). A local dev server pointed at the same value correctly rendered real canonical-contract state (community directory showing "Smoke Test Community", case detail page showing the real DECIDED case) — this is genuine, not mocked.

One real, outdated piece of frontend copy was found and fixed during this verification: the footer previously stated hosted verification was "currently blocked by genlayerlabs/genvm-manager#50," which is no longer accurate now that both a probe and FairMod itself have deployed and executed successfully. Updated to state FairMod is deployed and verified live, with the issue link kept as historical context for the tooling diagnosis. Full frontend gate (typecheck/lint/66 tests/build) re-run and passed after this fix.

## 3. Smoke test (Stage 9B, disposable wallet only, against the canonical address)

Followed the smaller checklist in `docs/FINAL_PRODUCTION_SMOKE_TEST.md`, steps 1-7 (steps 8-10, requiring a live browser wallet extension, are marked separately below — not skipped silently).

| Step | Tx hash | Execution result | Reread confirms |
|---|---|---|---|
| `create_community` | `0xdfe7c3a2d00c858dabc73086d1d5f939ec127bc2106e0b24632bc6dfcb6da52c` | SUCCESS (4/6) | `list_communities` → `['c0']` |
| `create_constitution_draft` | `0xd7a8944e7f6d0603d3497b2a713b9bb7a686539b91ffda76d14ae495b4eb99c7` | SUCCESS (6/6) | — |
| `add_rule` (SPAM) | `0xf55f8b9893baceaa64cff88515fd52b6f59a81014b1725964a95a324df63f254` | SUCCESS (6/6) | — |
| `activate_constitution` | `0xf02aded18d0765bf1f7c2d59af5b50a78281aa5b7679980c1ac7fbf060aed775` | SUCCESS (6/6) | `get_active_constitution_version` → `1` |
| `create_case` | `0xe111eb89cea7b87f899203e8dfe73a2779c22ee5240965ab38a06a008af932f6` | SUCCESS (6/6) | — |
| `add_context` | `0xf050fde8bd35033dbd8aa00483b958e936e1391384486bde07edb9042658d79e` | SUCCESS (6/6) | — |
| `submit_evidence` (TEXT) | `0x420b4b355e4bff406d835180bbb4e38ba6eb2204b930f7592799b06957ef581d` | SUCCESS (4/6) | — |
| `freeze_case` | `0xf6690d54869ce321eb9ce806db797ba34f6fb33fce5716cc6707cd9ee9cde579` | SUCCESS (6/6) | — |
| `adjudicate_case` — **real hosted semantic adjudication** | `0x283149c7241da201ab3e31bef7526e397e1265e3c3e14b5159469d4a3283b87e` | SUCCESS (4/6), returned `"DECIDED"` | `get_case`: `verdict: FLAGGED`, `violated_rule_ids: ['SPAM']`, real generated `explanation`/`material_facts` |
| `get_moderation_receipt` (read) | — | — | Matches `get_case` exactly, plus `content_fingerprint` |
| `get_community_cases` (read) | — | — | Returns the one case, correctly |

## What steps 8-10 of the smoke test require (not performed this session)

- **Step 9 (real wallet write through the frontend UI)**: requires a live browser wallet extension. `claude-in-chrome`'s `list_connected_browsers` was not re-checked this session (already confirmed empty in Stage 8C); this remains **NOT AVAILABLE**, not silently skipped. The frontend's write path (`writeAndConfirm`/`TxStatus`) is fully unit-tested (66/66 passing, including the exact FINALIZED+error regression shape) but was not exercised against a *live* transaction through the browser UI itself this session.
- **Step 10 (frontend-initiated Explorer cross-check for a UI-driven write)**: depends on step 9.

## Summary

Every item independently checkable without a live browser wallet passed. The canonical deployment is real, correctly sourced, fully queryable, and demonstrated to work end-to-end (contract writes reaching real GenVM consensus, reads reflecting authoritative state, and the real frontend correctly rendering that state) using only the disposable test wallet — the user's canonical wallet was never accessed, used, or requested by Claude at any point.
