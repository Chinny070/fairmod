# FairMod — Final Production Smoke Test

Run this **once**, after the canonical deployment is confirmed (per `docs/FINAL_DEPLOYMENT.md`, section 11-12) and its address has been set in production configuration. This is deliberately much smaller than the Stage 8 adversarial campaign — Stage 8 already established isolation, authorization, structured-output validation, replay-safety, and every other correctness property against a real hosted deployment (see `docs/STAGE_8_HOSTED_STUDIONET_TEST_PLAN.md` and `docs/STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md`). This smoke test exists only to confirm the *canonical* address is genuinely the same working contract, not to re-prove properties already proven.

For every write below: submit → wait for `FINALIZED` → confirm `execution_result: SUCCESS` → **re-read** authoritative state independently. Never treat a transaction hash or "FINALIZED" alone as success (this is not optional — see `docs/STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md` for why).

## 1. Contract queryability

```bash
./node_modules/.bin/genlayer schema <canonical address>
./node_modules/.bin/genlayer code <canonical address>
```
Expect: schema lists 30 methods (14 view, 16 write); code matches `contracts/fairmod.py` exactly (hash `e6fcc870cef9f70efeb7b148e2065aff297e850bafba18ad2537a9ae52970e0d`).

## 2. Public read path

```bash
./node_modules/.bin/genlayer call <canonical address> list_communities
```
Expect: `[]` (empty — nothing has been created on this fresh deployment yet).

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
