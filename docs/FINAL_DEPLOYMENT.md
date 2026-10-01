# FairMod — Final Canonical Deployment Procedure

## Current status — canonical deployment verified

The current canonical deployment is `0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f`, deployed in transaction `0x3bde02c3690c03175a7601622c8b0cd82851a24031d5fcb40e48a223de7647ad`. Its deployed source matches the repository contract after newline normalization. The former `0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450` is a previous deployment and is superseded. See `docs/CANONICAL_DEPLOYMENT_VERIFICATION.md` for evidence. The procedure below is an archived manual-deployment guide for the earlier `e6fcc…` source and old deployment flow. Do not follow it or redeploy from it.

The historical steps below intentionally retain the old expected hash and old deployment workflow as an audit trail only; they are not instructions for the current deployment.

---


This is the exact, minimal procedure for **you** to manually deploy the frozen FairMod contract to StudioNet 61999. Claude does not perform this step and never sees or touches your wallet's private key or seed phrase.

## What you need before starting

- A GenLayer-compatible wallet account you control, funded with StudioNet GEN (get test GEN from the StudioNet faucet if needed).
- Node.js and npm installed (already required to have run this repository's frontend).
- This repository checked out at the exact commit below.

## 1. Repository / commit

Use commit **`f2bd21a`** (or any later commit, as long as `contracts/fairmod.py` is unchanged from this state — check step 3 below).

## 2. Contract path

```
contracts/fairmod.py
```

## 3. Expected SHA-256 — verify before deploying

Run this and confirm the output matches **exactly**:

```bash
sha256sum contracts/fairmod.py
```

Expected:
```
e6fcc870cef9f70efeb7b148e2065aff297e850bafba18ad2537a9ae52970e0d
```

**If this does not match exactly, stop and do not deploy.** The file has changed since this document was written.

## 4. Network

StudioNet

## 5. Chain ID

61999

## 6. RPC

```
https://studio.genlayer.com/api
```

## 7. Required repository-local CLI version

The repository already pins this — you don't need to install anything separately. From the repository root:

```bash
npm install
```

This installs the exact `genlayer` CLI version `0.39.1` into `node_modules/.bin/genlayer`, matching every test/verification this project has done. **Do not use a globally-installed `genlayer` CLI** — always call it as `./node_modules/.bin/genlayer` (or `npx genlayer` from the repository root, which resolves to the same pinned local install) so you're using the exact version this contract was verified against.

## 8. Set up your wallet in the CLI (your private key never goes to Claude)

This step happens entirely on your own machine, in your own terminal — Claude is not involved and never sees the result.

```bash
./node_modules/.bin/genlayer account import
```

Follow the CLI's own prompts. It will ask for your private key or let you import a keystore file — this happens locally in your terminal session and is stored (encrypted, if the CLI offers that) on your own machine only. Give the account a name you'll recognize, e.g. `my-canonical-wallet`.

Then set it active and confirm the network:

```bash
./node_modules/.bin/genlayer account use my-canonical-wallet
./node_modules/.bin/genlayer network set studionet
./node_modules/.bin/genlayer account show
```

Confirm the printed account address is the one you intend to deploy from, and that its balance is sufficient (a small amount of GEN covers gas; this repository's own test deployments have used well under 1 GEN each).

**Never paste your private key or seed phrase into a chat with Claude, into a GitHub issue, or into any file in this repository.**

## 9. Exact deployment command

```bash
./node_modules/.bin/genlayer deploy --contract contracts/fairmod.py
```

Run this from the repository root. It will use whichever account you set active in step 8.

## 10. What to copy after deployment

The CLI prints a **Deployment Transaction Hash** and, inside the **Deployment Receipt** block, a **`data.contract_address`** (also repeated at the very end under `Result: { 'Transaction Hash': ..., 'Contract Address': ... }`). Copy both of these exactly.

## 11. Do NOT mistake "FINALIZED" for a successful deployment

This is the single most important thing to check, and it is exactly what tripped up this project's own earlier attempts (see `docs/STUDIONET_61999_CLEAN_PROBE_RESULT.md`). The CLI printing `✔ Contract deployed successfully` and the transaction reaching protocol status `FINALIZED` are **not** proof the contract actually works — a transaction can be `FINALIZED` while GenVM execution itself failed.

After deploying, run:

```bash
./node_modules/.bin/genlayer receipt <your transaction hash>
```

Look specifically for two things inside the printed receipt, under `consensus_data.leader_receipt`:
- `execution_result`: this must say **`SUCCESS`**, not `ERROR`.
- `status_name` (near the end of the output): must say **`FINALIZED`**.

**Both** must be true. If `execution_result` is `ERROR`, the deployment did not actually work even though the CLI said "deployed successfully" — stop and report this back rather than treating the address as usable.

Then confirm the contract is actually queryable:

```bash
./node_modules/.bin/genlayer schema <your contract address>
./node_modules/.bin/genlayer code <your contract address>
```

Both commands must succeed and print real output (not a "not found" error). `schema` should list 30 methods; `code` should show the exact contents of `contracts/fairmod.py`.

## 12. What you must return to Claude after deployment

Please provide exactly these four things back in chat:

1. The **transaction hash**.
2. The **resulting contract address**.
3. The full text output of `genlayer receipt <tx hash>` (or at minimum, confirmation that `execution_result: SUCCESS` and `status_name: FINALIZED` both appeared).
4. Confirmation that both `genlayer schema <address>` and `genlayer code <address>` succeeded.

With this, Claude can independently re-verify the deployment (schema, code match, a basic read call, and cross-check against the real Studio Explorer) and, only after that verification passes, treat the address as the canonical production FairMod deployment — see `docs/RELEASE_MANIFEST.md` for exactly which configuration value gets updated at that point.

## What this deployment is not

This deploys the contract only. It does not create any community, constitution, or case — the deployed contract starts completely empty, exactly like every prior test deployment in this project. Creating the first real community is a separate, later step you can take through the production frontend once it's configured (see `docs/FINAL_PRODUCTION_SMOKE_TEST.md`).
