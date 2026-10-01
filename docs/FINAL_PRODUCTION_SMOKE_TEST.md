# FairMod — Final Production Smoke Test

> Historical smoke-test procedure: current canonical verification is complete. Do not run this checklist as a new write campaign. Current address, exact source comparison, and authoritative lifecycle readback are documented in `docs/CANONICAL_DEPLOYMENT_VERIFICATION.md`.

Current canonical address: `0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f`.
Current deployed source SHA-256: `2ad077c7970b8ef09c3a1ba6ed5744e3c1ad4f68b56562c9f21f298de8e0c5be`.
Current deployment transaction: `0x3bde02c3690c03175a7601622c8b0cd82851a24031d5fcb40e48a223de7647ad`.

For every write below: submit → wait for `FINALIZED` → confirm `execution_result: SUCCESS` → **re-read** authoritative state independently. Never treat a transaction hash or "FINALIZED" alone as success (this is not optional — see `docs/STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md` for why).

## 1. Contract queryability

```bash
./node_modules/.bin/genlayer schema <canonical address>
./node_modules/.bin/genlayer code <canonical address>
```
Expect: schema lists 30 methods (14 view, 16 write); returned code matches `contracts/fairmod.py` after newline normalization (local file SHA-256 above).

## 2. Public read path

```bash
./node_modules/.bin/genlayer call <canonical address> list_communities
```
Current readback is populated: community `c0`, case `c0#0`; see the verification record for current values.

## 3. Community creation

```bash
./node_modules/.bin/genlayer write <canonical address> create_community --args "<a real community name>" "<description>"
```
Reread: `list_communities`, `get_community --args c0`.

## 4. Constitution creation + activation

```bash
./node_modules/.bin/genlayer write <canonical address> create_constitution_draft --args c0
./node_modules/.bin/genlayer write <canonical address> add_rule --args c0 1 <RULE_ID> "<title>" "<definition>" "<category>" '[]' false "<policy>"
./node_modules/.bin/genlayer write <canonical address> activate_constitution --args c0 1
```
Reread: `get_active_constitution_version --args c0` → `1`; `get_constitution --args c0 1` shows the rule.

## 5. Case creation + evidence/context

```bash
./node_modules/.bin/genlayer write <canonical address> create_case --args c0 "<real reported content>"
./node_modules/.bin/genlayer write <canonical address> add_context --args "c0#0" "<kind>" "<content>"
./node_modules/.bin/genlayer write <canonical address> submit_evidence --args "c0#0" TEXT "<evidence text>" "<category>"
```
Reread: `get_case --args "c0#0"`, `list_evidence --args "c0#0"`.

## 6. One appropriate real adjudication path

```bash
./node_modules/.bin/genlayer write <canonical address> freeze_case --args "c0#0"
./node_modules/.bin/genlayer write <canonical address> adjudicate_case --args "c0#0"
```
Reread: `get_case --args "c0#0"` — confirm `state` is `DECIDED` or `NEEDS_REVIEW` with a real generated `explanation`.

## 7. Receipt / history

```bash
./node_modules/.bin/genlayer call <canonical address> get_moderation_receipt --args "c0#0"
./node_modules/.bin/genlayer call <canonical address> get_community_cases --args c0 0 10
```
Expect: receipt matches the case state exactly; history contains the one case.

## 8. Frontend reads

Set `VITE_FAIRMOD_CONTRACT_ADDRESS` to the canonical address in the production environment, load the production frontend, and confirm the Community Directory and the case page render the real state created above — no "contract not configured" banner, no fake data.

## 9. One appropriate frontend write

Connect a wallet (any account, e.g. the same one used for the CLI steps above, or a fresh one) to the production frontend on StudioNet, and perform one write through the UI itself — e.g. adding a second context item to the same case, or granting a role. Confirm the frontend's own transaction-status component shows submission → protocol status → execution result → then, only after an authoritative reread, an application-success state (never before).

## 10. Explorer cross-check

Open the deployment transaction and the write from step 9 on `https://explorer-studio.genlayer.com` and confirm `Execution Result: SUCCESS` and `Status: FINALIZED` independently match what the CLI/frontend reported.

## Pass criteria

All ten steps above complete with `execution_result: SUCCESS` on every write and correct authoritative reread. If any step fails, do not proceed to the next — capture the exact evidence (transaction hash, receipt output) and report it before continuing.
