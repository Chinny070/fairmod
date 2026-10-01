# FairMod — Release Manifest

## Current release — canonical deployment and lifecycle verified (2026-10-01)

| Field | Verified value |
|---|---|
| Current repository release commit | `7d89fa0ea682183d1c8ea4db047f801c19ac09a6` |
| Contract source commit | `0cc4d30b7ce5ad309c6839850c7844f45eb39cfa` |
| Contract source | `contracts/fairmod.py` |
| Local source SHA-256 | `2ad077c7970b8ef09c3a1ba6ed5744e3c1ad4f68b56562c9f21f298de8e0c5be` |
| Current canonical StudioNet address | `0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f` |
| Deployment transaction | `0x3bde02c3690c03175a7601622c8b0cd82851a24031d5fcb40e48a223de7647ad` |
| Protocol status / GenVM execution | FINALIZED / SUCCESS (Explorer deployment record) |
| Deployed source comparison | PASS — live `getContractCode` source equals local source after CRLF/LF normalization |
| Deployed schema | PASS — 30 methods, 14 view / 16 write |
| Representative live application state | PASS — community `c0`, case `c0#0`, state FINAL, verdict FLAGGED, challenge UPHOLD, Fairness Mirror CONSISTENT; fresh authoritative reads confirmed |
| Production frontend address | `VITE_FAIRMOD_CONTRACT_ADDRESS` is present in Vercel Production; public production bundle contains current address and not the superseded or temporary address |
| Network / chain / RPC | StudioNet / `61999` / `https://studio.genlayer.com/api` |

Current local gate: contract tests **200 passed / 0 failed**; frontend tests **66 passed / 0 failed**; TypeScript PASS; ESLint PASS (0 errors, 1 warning); production build PASS. The test suite and build details are also recorded in `docs/CANONICAL_DEPLOYMENT_VERIFICATION.md`.

Full evidence and lifecycle transactions: `docs/CANONICAL_DEPLOYMENT_VERIFICATION.md`.

## Historical Stage 9B deployment — superseded

This section records the earlier deployment, not the current canonical deployment. Address `0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450` has been superseded by the current deployment above. The original observations below remain historical evidence for that earlier contract/source.

| Field | Value |
|---|---|
| Previous deployment address (superseded) | `0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450` |
| Deployment transaction | `0x22ad7f2ad5415dc2592a2e062bcb062c4723aa378425b8cdb310a6c2826dad2c` |
| Protocol status | FINALIZED |
| GenVM execution result | SUCCESS (Result Code: Return) |
| Schema | PASS — exactly 30 methods (14 view, 16 write) |
| Code match | PASS — byte-identical to `contracts/fairmod.py` (confirmed via line-ending-normalized diff) |
| Basic read call | PASS — `list_communities()` returned `[]` on the fresh deployment |
| Independently reconfirmed via Explorer | YES — `https://explorer-studio.genlayer.com/tx/0x22ad7f2ad5415dc2592a2e062bcb062c4723aa378425b8cdb310a6c2826dad2c` |

The production environment now points to `0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f`. This historical deployment's frontend configuration is not current.

**Note on the deploying account**: the Explorer shows the deployment's `From` address as `0xaffE15eEc45b68835cc9E5B4Ab85dD5deaE8e70b` — the same disposable `my-studionet-wallet` account used throughout Stage 8C testing, not a distinct address. This is stated factually for the record; it does not affect the technical verification above (ownership/administration of the deployed contract is determined by whichever address the deploying transaction's sender was, per `create_community`'s own `owner = gl.message.sender_address` logic — see `contracts/fairmod.py`).

**Smoke test** (Stage 9B, against the canonical address, disposable wallet only): community creation → constitution draft/rule/activation → case creation with context and TEXT evidence → freeze → real hosted adjudication (verdict FLAGGED, rule SPAM, real generated explanation) → receipt/history reread. All steps `execution_result: SUCCESS`, all reads confirmed authoritative state. Full detail in `docs/STAGE_9B_CANONICAL_VERIFICATION.md`.

**Canonical wallet used by Claude**: NO — every write above (both the earlier Stage 8C hosted campaign and this smoke test) used only the disposable `my-studionet-wallet` account. The canonical deployment transaction itself was submitted by the user, manually, through the GenLayer Studio website — Claude never accessed or requested the user's private key or seed phrase.

---


## Stage 8C release identity (historical)

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
| Contract tests at that stage | 195 passed / 0 failed |
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

**This address must never be used as the production configuration value.** It remains a test deployment only; current production uses the canonical address in the current-release table above.

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

**PERFORMED AND VERIFIED** — current canonical address: `0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f`; deployment transaction: `0x3bde02c3690c03175a7601622c8b0cd82851a24031d5fcb40e48a223de7647ad`. The earlier Stage 9B deployment at `0x234…F450` is superseded.

## Production frontend configuration

The single value that receives the canonical address is **`VITE_FAIRMOD_CONTRACT_ADDRESS`** (see `frontend/src/config/network.ts` and `frontend/.env.example`). Vercel Production has this variable configured; its value is encrypted in Vercel. The public production JS bundle was fetched and verified to contain the current canonical address and not contain the earlier `0x234…F450` or Stage 8C temporary address. There is no hardcoded fallback: when unset locally, reads/writes refuse with `CONTRACT_NOT_CONFIGURED`.

## Public launch (Stage 9C)

**Live URL**: [https://fairmod.vercel.app](https://fairmod.vercel.app)
**Hosting**: Vercel, project `chinny070s-projects/fairmod`, deployed via the Vercel CLI (`vercel deploy --prod`) from `frontend/`. `frontend/vercel.json` provides the SPA rewrite React Router needs. `VITE_FAIRMOD_CONTRACT_ADDRESS` is set as a Vercel production environment variable (not committed to the repository) — confirmed present, correct, and baked into the deployed bundle.

Verified against the actual live public URL (not just a successful build): homepage, community directory (showing real canonical-contract data — the Stage 9B "Smoke Test Community"), case detail (real DECIDED case with real evidence), how-it-works, create-community form, direct/refreshed nested-route loading (SPA rewrite working), an in-app 404 for unknown paths, no horizontal overflow at mobile/tablet/desktop widths, no secrets in `localStorage`/`sessionStorage`/page source, and the temporary Stage 8C address confirmed absent from the deployed bundle.

One real frontend defect was found live and fixed during this verification: `CommunityDetail` called `get_role` with an empty-string address whenever no wallet was connected (the default for every public visitor), issuing a doomed contract read on every community page load. Fixed to skip the call entirely and resolve `'NONE'` locally when no wallet address is available; full frontend gate re-run and passed; redeployed.

One benign, non-blocking artifact was found and is disclosed, not silently hidden: a `GenLayer RPC error (gen_call): execution failed` appears once in the browser console on every page load, including the Home page, which makes zero contract reads. This was confirmed to originate from `genlayer-js`'s own internal, already-deprecated `initializeConsensusSmartContract()` startup path (visible as a "deprecated" warning throughout this project's CLI usage since Stage 8), not from any FairMod application code — there is no call site in `frontend/src` to fix. It does not affect functional correctness: every real FairMod read and write exercised throughout this session succeeded and rendered/behaved correctly.

Live wallet-extension QA: **NOT AVAILABLE** (no browser extension connected this session, consistent with every prior stage) — not treated as a launch blocker, per instruction.

## Post-launch fix — live wallet write failure (Stage 9D)

After public launch, the user's own live-site usage surfaced a real write-path defect that no prior session could have caught (it only manifests with a genuine browser wallet extension, which was unavailable in every automated verification pass): every write (starting with `create_community`) failed instantly, with no wallet signature prompt ever appearing, and the frontend surfaced only its generic `UNKNOWN_PROTOCOL_ERROR` message.

**Root cause**: `createWalletClient` (`frontend/src/adapter/client.ts`) constructed the `genlayer-js` wallet client from the injected EIP-1193 `provider` alone. `genlayer-js@1.1.8`'s `ClientConfig` requires `account` as a separate, explicit field — it is not derived from `provider`. Without it, `writeContract` throws `"No account set. Configure the client with an account or pass an account to this function."` synchronously, before ever reaching the wallet — explaining why no MetaMask popup appeared.

**Diagnosis aid added**: `normalizeError()` (`frontend/src/domain/errors.ts`) previously discarded the raw error once it fell through every known pattern to `UNKNOWN_PROTOCOL_ERROR`, leaving nothing in the console to debug from. It now `console.error`s the raw error before returning the generic `FairModError`, which is what surfaced the real message above.

**Fix**: `createWalletClient` now takes the connected account explicitly and passes it through to `createClient`; both the initial `connect()` path and the `accountsChanged` listener in `useWallet.ts` rebuild the client with the current account. Verified live: after redeploying, `create_community("Riverside Forum", ...)` reached `FINALIZED` / `execution_result: SUCCESS` (tx `0x89114ac63e16f52406ecaccf760c72b900820e864fd6c7325a07f948048d6de7`, returned `"c1"`), the frontend correctly showed the new community and recognized the connecting wallet as its `OWNER`.

## Post-launch fix — premature draft reread after `add_rule` (Stage 9D, continued)

Continued live usage (drafting a constitution for "Riverside Forum") surfaced a second real defect: after `add_rule` was submitted and reached `FINALIZED`/`execution_result: SUCCESS` on-chain (tx `0x750356e53d3bd3b12a96d2a21caceeaded1c0d14f09d177b4f38f878ec38cfd3`), the Constitution Authoring UI still showed "Status: DRAFT — 0 rules", leaving "Activate" incorrectly disabled.

**Root cause**: `AddRuleForm`'s submit handler (`frontend/src/pages/community/ConstitutionAuthoringTab.tsx`) called the raw `addRule()` adapter function, which only awaits `writeContract`'s own promise — resolved once a transaction hash exists, not once the transaction is finalized — then immediately called `onAdded()` to reread the draft. The reread raced ahead of on-chain finalization and returned the pre-write state.

**Fix**: `AddRuleForm` now goes through the same `writeAndConfirm` pipeline every other write in this app uses — it waits for the transaction to reach `FINALIZED` and confirms the new rule ID is actually present in a fresh `getConstitution` read before calling `onAdded()`. A full frontend gate rerun (66/66 tests, typecheck/lint/build) passed; redeployed to `https://fairmod.vercel.app`.

## Post-launch fix — case-id URL fragment collision (Stage 9D, continued)

After activating the constitution and creating a real case (`create_case` → tx `0x4c9e6aa834db7227d5c6405e578d81ead6f63e4ff853f9bd15b373d65ccd4829`, `FINALIZED`/`SUCCESS`, returned case id `"c1#0"`), clicking into it from the Cases tab immediately produced `"An unexpected error occurred."` on the case detail page.

**Root cause**: FairMod's case ids are composite strings of the form `"<communityId>#<index>"` (e.g. `"c1#0"`). The Cases tab's link (`frontend/src/pages/CommunityDetail.tsx`) built `` `/cases/${c.case_id}` `` unencoded — `#` is the URL fragment delimiter, so both the rendered `<a href>` and React Router's `<Link>` parsed `/cases/c1#0` as pathname `/cases/c1` plus hash `#0`. `CaseDetail`'s `useParams()` therefore only ever received `caseId = "c1"`, a nonexistent case, and every read (`getCase`, `getContext`, `listEvidence`) threw, surfacing the generic fallback message.

**Fix**: the link now URL-encodes the case id (`encodeURIComponent(c.case_id)`, `c1%230`); React Router's `useParams()` decodes it back to the correct `"c1#0"` automatically, requiring no change on `CaseDetail`'s side. Confirmed this was the only call site constructing a `/cases/:caseId` link. Frontend gate rerun (66/66 tests) passed; redeployed to `https://fairmod.vercel.app`.
