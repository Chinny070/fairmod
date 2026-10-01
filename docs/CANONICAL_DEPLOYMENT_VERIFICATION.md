# Current Canonical Deployment Verification

Verification date: 2026-10-01. This record supersedes the earlier Stage 9B canonical deployment record. No transaction was submitted during this verification pass.

## Identity and source provenance

| Item | Verified value |
|---|---|
| Current release commit | `7d89fa0ea682183d1c8ea4db047f801c19ac09a6` |
| Contract change commit | `0cc4d30b7ce5ad309c6839850c7844f45eb39cfa` |
| Local contract | `contracts/fairmod.py` |
| Local SHA-256 | `2ad077c7970b8ef09c3a1ba6ed5744e3c1ad4f68b56562c9f21f298de8e0c5be` |
| Current canonical address | [`0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f`](https://explorer-studio.genlayer.com/address/0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f) |
| Deployment transaction | [`0x3bde02c3690c03175a7601622c8b0cd82851a24031d5fcb40e48a223de7647ad`](https://explorer-studio.genlayer.com/tx/0x3bde02c3690c03175a7601622c8b0cd82851a24031d5fcb40e48a223de7647ad) |
| Network | StudioNet, chain `61999`, RPC `https://studio.genlayer.com/api` |

The transaction is FINALIZED. The Studio Explorer deployment record showed GenVM execution SUCCESS. Read-only `getContractCode` returned the contract source; after normalizing CRLF/LF line endings, the returned source is exactly equal to the complete local `contracts/fairmod.py` file. The local file's raw Windows-byte SHA-256 is the value above. No semantic or source mismatch was observed.

The live schema was read independently: 30 public methods, 14 views, 16 writes, including the case, receipt, challenge, and fairness methods. Both the address page and transaction are available through the linked Studio Explorer records.

## Representative live lifecycle

The following user-submitted StudioNet Explorer transaction records form a successful lifecycle against the current address. Each write reached FINALIZED and GenVM execution SUCCESS, except the explicitly labeled early-finalization attempt. These are historical transactions; no new writes were issued for this verification.

| Action | Transaction | Outcome |
|---|---|---|
| Create community | [`0x63318ed361d4666369136f5dffa8e545adfb8c5de48ba64d93c59c6955c3272f`](https://explorer-studio.genlayer.com/tx/0x63318ed361d4666369136f5dffa8e545adfb8c5de48ba64d93c59c6955c3272f) | `c0` |
| Add HARASSMENT rule | [`0x0da1b56aa962eff105ef9f2f223742d8345e56b563f818fc36c5dbead5d069bb`](https://explorer-studio.genlayer.com/tx/0x0da1b56aa962eff105ef9f2f223742d8345e56b563f818fc36c5dbead5d069bb) | SUCCESS |
| Create case | [`0xc0bade7f2884e95febf0b19f807fb72ab81455b5eb2ba1ed859575349ad90c71`](https://explorer-studio.genlayer.com/tx/0xc0bade7f2884e95febf0b19f807fb72ab81455b5eb2ba1ed859575349ad90c71) | `c0#0` |
| Submit TEXT evidence | [`0x09540605cbb86bed5ceafa9ea91564660e2a449ec74df95de1fc9232cadfbcbe`](https://explorer-studio.genlayer.com/tx/0x09540605cbb86bed5ceafa9ea91564660e2a449ec74df95de1fc9232cadfbcbe) | `c0#0:e0` |
| Freeze evidence | [`0x00a112f88a515b6123d1fadea82ebdd409d6a9e8d98628d430fe153791aaab92`](https://explorer-studio.genlayer.com/tx/0x00a112f88a515b6123d1fadea82ebdd409d6a9e8d98628d430fe153791aaab92) | SUCCESS |
| Adjudicate | [`0x7ed585fa8e2bca8d71dd381a655b65eedcdc34a08ad900b726b0b7a574a6ee63`](https://explorer-studio.genlayer.com/tx/0x7ed585fa8e2bca8d71dd381a655b65eedcdc34a08ad900b726b0b7a574a6ee63) | `DECIDED`; `FLAGGED`, rule `HARASSMENT`, evidence `c0#0:e0` |
| File challenge | [`0xd75116c6c4f1dffc282de04568fb3a08464704e985076ae5c86343f4ee99bda9`](https://explorer-studio.genlayer.com/tx/0xd75116c6c4f1dffc282de04568fb3a08464704e985076ae5c86343f4ee99bda9) | `CHALLENGED` |
| Resolve challenge | [`0x28fccc9cf17fe4fa02d767ad8ac75d09a7a6b11ef06a620a750c4a6902be8483`](https://explorer-studio.genlayer.com/tx/0x28fccc9cf17fe4fa02d767ad8ac75d09a7a6b11ef06a620a750c4a6902be8483) | `FINAL`; `UPHOLD`; final verdict `FLAGGED` |
| Fairness Mirror | [`0x167f10b045d4d545f739b1df78d93926b1fc6e928d4aaf9baf6f00fa0a4ccd57`](https://explorer-studio.genlayer.com/tx/0x167f10b045d4d545f739b1df78d93926b1fc6e928d4aaf9baf6f00fa0a4ccd57) | `CONSISTENT` |

One call to `finalize_case` before the 24-hour challenge deadline correctly failed with “the challenge window has not yet closed”; it is not counted as a successful lifecycle action. Challenge resolution finalized the application case without falsifying time.

Fresh read-only calls against `0xad3…771f` confirmed:

- `get_community("c0")`: active constitution version 1 and one case.
- `get_case("c0#0")` and `get_moderation_receipt("c0#0")`: state `FINAL`, initial and final verdict `FLAGGED`, challenge `UPHOLD`, final rule `HARASSMENT`, evidence `c0#0:e0`, Fairness Mirror `CONSISTENT`.
- `get_case_state("c0#0")`: `FINAL`.
- `get_community_stats("c0")`: one case, one challenged, one finalized, one final flagged, zero overturned.
- `list_evidence("c0#0")`: `c0#0:e0`.

## Which address is canonical?

`0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f` is the current canonical FairMod deployment. The older `0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450` is a previous deployment of an earlier source and is superseded; it must not be represented as the current production address.

The StudioNet deployment transactions and source checks are sufficient to retain the current deployment; no redeployment is indicated.

## Production frontend configuration

Vercel lists `VITE_FAIRMOD_CONTRACT_ADDRESS` in the Production environment (value encrypted). A read-only fetch of `https://fairmod.vercel.app` and its public JS asset confirmed the bundle contains `0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f`, does not contain the superseded `0x234…F450`, and does not contain the Stage 8C temporary address `0xB291…7609`. The frontend source still has no hardcoded contract fallback.

## Local release gates

- Contract tests: **200 passed, 0 failed** (pytest reported one Windows cache-permission warning only).
- `genvm-lint check contracts/fairmod.py --json`: PASS, 30 methods (14 view / 16 write).
- Frontend tests: **66 passed**.
- TypeScript typecheck: PASS.
- ESLint: PASS, 0 errors and 1 existing React Fast Refresh warning.
- Production build: PASS. JS: 213.80 kB app + 534.78 kB GenLayer vendor; CSS: 9.93 kB.
- Backend: NONE. Production mock fallback: NO.

## Remaining unverified items

- This pass did not run a new hosted WEB_LINK or image-evidence lifecycle; prior hosted verification evidence is recorded in `docs/STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md` against the separate Stage 8C test deployment, not falsely attributed to this canonical-address lifecycle.
- The optional test of materially different hosted leader/validator candidate outputs was not run. The recorded adjudication and challenge transactions show successful equivalence execution, not a deliberately induced disagreement.
- No new transactions, wallet actions, or deployments were performed during this verification pass.
