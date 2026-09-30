# FairMod

A multi-community moderation protocol built entirely as a [GenLayer](https://genlayer.com) Intelligent Contract, with a companion web frontend.

**Live**: [https://fairmod.vercel.app](https://fairmod.vercel.app)
**Canonical contract**: [`0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450`](https://explorer-studio.genlayer.com/address/0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450) on GenLayer StudioNet (chain ID `61999`)

## What FairMod is

FairMod lets communities write their own natural-language moderation rules and have real cases decided against those rules by GenLayer's validator set — not a centralized moderation API, and not a keyword filter. Every community has its own versioned constitution; every case has its own evidence, verdict, and public receipt.

## Why it needs GenLayer

Deciding whether a message violates "no targeted harassment" requires contextual judgment a keyword blocklist cannot provide. FairMod asks GenLayer's validators to reason over each case directly against a community's own written rules. Multiple validators independently re-execute the same evidence-acquisition and adjudication logic — re-fetching a referenced web page themselves, re-rendering a referenced image themselves, re-running the reasoning prompt themselves — and their answers are compared under an *equivalence principle* (must agree on the material outcome, not on exact wording) before anything is written to contract state. This is the actual mechanism GenLayer provides that a plain LLM API call cannot: independent, consensus-checked reasoning over untrusted evidence, recorded immutably on-chain.

## How moderation works

1. **Communities** — anyone can create one (`create_community`); it has an owner and, optionally, ADMIN/MODERATOR role-holders.
2. **Versioned constitutions** — a community drafts a constitution (`create_constitution_draft`), adds rules with stable logical IDs (`add_rule`), and activates it (`activate_constitution`). A case is permanently bound to whichever constitution version was active when it was created — later constitution changes never retroactively reinterpret an existing case.
3. **Cases** — anyone can report content (`create_case`), attach background context (`add_context`), and submit evidence (`submit_evidence`).
4. **Evidence** — four types: `TEXT` (already in hand), `WEB_LINK` and `IMAGE` (fetched/rendered independently by each validator via `gl.nondet.web.get`/`gl.nondet.web.render`), and `DOCUMENT` (routed to one of those two paths). Web and visual evidence is never fetched by the browser on the contract's behalf — only by validators, independently, after the case is frozen.
5. **Freeze** (`freeze_case`) locks content, context, and evidence before any AI reasoning touches them.
6. **Adjudication** (`adjudicate_case`, permissionless) — validators independently reason over the frozen case against the frozen constitution and reach a structured verdict: `ALLOWED`, `FLAGGED` (with cited Rule IDs and an explanation), or `NEEDS_REVIEW`.
7. **Challenge** — the reporter or a community role-holder may file one challenge within a 24-hour window (`file_challenge`); resolving it (`resolve_challenge`) asks a genuinely different question (uphold vs. overturn given the objection) than the original adjudication, and the original decision is never mutated, only superseded by a separate `final_verdict`.
8. **Finality** — a case reaches FairMod's own application-level `FINAL` state either through challenge resolution or a permissionless timeout (`finalize_case`). This is explicitly distinct from GenLayer's own protocol-level transaction finality — the frontend always shows both separately.
9. **Receipts & history** — `get_moderation_receipt` composes the full decision trail (fingerprints, timestamps, verdicts) from authoritative state; `get_community_cases` gives paginated public history.
10. **Precedent** (`get_case_precedents`) is shown for context only — it is never read by any adjudication prompt and never binds a new case.
11. **Fairness Mirror** (`run_fairness_mirror`) is a separate, non-authoritative consistency check askable once per finalized case — it can never change a verdict, and the frontend always renders it visually distinct from the binding decision.

Full design/verification detail lives in `docs/` — see `docs/ARCHITECTURE.md`, `docs/ADJUDICATION.md`, `docs/STATE_MACHINE.md`, `docs/THREAT_MODEL.md`, and the per-stage `STAGE_*_VERIFICATION.md` files for the complete build/audit history.

## Canonical deployment

| Field | Value |
|---|---|
| Contract | `contracts/fairmod.py` |
| SHA-256 | `e6fcc870cef9f70efeb7b148e2065aff297e850bafba18ad2537a9ae52970e0d` |
| Address | `0x234ECcBDE3d265F6BF158A93e15bF5B8cCB7F450` |
| Deployment tx | `0x22ad7f2ad5415dc2592a2e062bcb062c4723aa378425b8cdb310a6c2826dad2c` |
| Network | GenLayer StudioNet, chain ID `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Public schema | 30 methods (14 view, 16 write) |

Full independent verification: `docs/STAGE_9B_CANONICAL_VERIFICATION.md` and `docs/RELEASE_MANIFEST.md`.

## Repository layout

```
contracts/fairmod.py   — the GenLayer Intelligent Contract (frozen; canonical hash above)
frontend/               — the production web frontend (Vite + React + TypeScript)
test/                   — contract test suite (gltest.direct, 195 tests)
diagnostics/            — minimal StudioNet reproduction probes
docs/                   — full design, verification, and deployment history
```

## Running locally

**Contract tests:**
```bash
pip install "genvm-linter==0.11.0" "genlayer-test==0.29.2"
python -m pytest test/ -q
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
See `frontend/README.md` for environment variables, testing, and build details.

## Status

The contract is feature-frozen and deployed on StudioNet as the canonical address above. The frontend is live at [fairmod.vercel.app](https://fairmod.vercel.app). Full build/audit/deployment history: `docs/RELEASE_MANIFEST.md`.
