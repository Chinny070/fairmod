# Stage 8 — Hosted StudioNet Test Plan (Completion Gate)

This is the precise checklist of everything Stage 8 could **not** run because `genlayerlabs/genvm-manager#50` remains open. No item below may be marked PASS until it is actually executed against a real, successfully-deployed contract on StudioNet 61999 — this document exists to make that gate unambiguous once the infrastructure issue resolves, not to pre-judge the outcome.

**Do not attempt any item below until**: (a) a maintainer provides a concrete infrastructure/tooling/deployment fix, or a verified infrastructure change is independently confirmed, and (b) the existing minimal clean probe (`diagnostics/studionet_61999_clean_probe.py`, hash `493d0fc4a7ce8e64c54262cc21aea12d92ef8f730e29056f45c1ca40abfcaca8`) is redeployed **first** and reaches `execution_result: SUCCESS` with `get_probe()` returning `FAIRMOD_61999_CLEANROOM_OK`. FairMod itself is never the first hosted test after an infrastructure change.

## Phase A — Clean probe re-verification (must pass before anything else)

| # | Item | Status |
|---|---|---|
| A1 | Clean probe deploys with protocol `FINALIZED` **and** `execution_result: SUCCESS` (not `ERROR`/`invalid_contract`) | NOT RUN |
| A2 | Deployed probe address is queryable via `schema`/`code` | NOT RUN |
| A3 | `get_probe()` returns exactly `FAIRMOD_61999_CLEANROOM_OK` | NOT RUN |
| A4 | Result independently reconfirmed via the real Studio Explorer (`explorer-studio.genlayer.com`) | NOT RUN |

If A1-A4 do not all pass, STOP — do not proceed to Phase B; report the new failure mode instead of assuming it matches the prior `invalid_contract` signature.

## Phase B — Temporary FairMod deployment (disposable wallet only, explicit go-ahead required)

| # | Item | Status |
|---|---|---|
| B1 | FairMod (`contracts/fairmod.py`, hash `417cf3de5fef4e6e3a28c0d63510771f18e923dcf42a1f94295a1dc7d3c72d36`) deploys with `execution_result: SUCCESS` | NOT RUN |
| B2 | Deployed contract address queryable; schema matches `docs/fairmod_schema.json` exactly (30 methods) | NOT RUN |

## Phase C — Critical view methods (read-only, no wallet needed once B passes)

| # | Item | Status |
|---|---|---|
| C1 | `list_communities` / `get_community` return correct empty/initial state | NOT RUN |
| C2 | `get_active_constitution_version` / `get_constitution` | NOT RUN |
| C3 | `get_case` / `get_case_state` | NOT RUN |
| C4 | `get_moderation_receipt` | NOT RUN |
| C5 | `get_community_stats` / `get_community_cases` (pagination) | NOT RUN |
| C6 | `get_case_precedents` | NOT RUN |

## Phase D — Full lifecycle against the real deployment (disposable wallet)

| # | Item | Status |
|---|---|---|
| D1 | `create_community` | NOT RUN |
| D2 | Constitution lifecycle: `create_constitution_draft` → `add_rule` → `activate_constitution` | NOT RUN |
| D3 | `create_case` | NOT RUN |
| D4 | `add_context` | NOT RUN |
| D5 | Real TEXT evidence (`submit_evidence`) | NOT RUN |
| D6 | Real WEB_LINK evidence: `submit_evidence` + `acquire_evidence` performing an actual validator-side `gl.nondet.web.get` against a real, reachable public URL | NOT RUN |
| D7 | Real visual/IMAGE evidence: `acquire_evidence` performing an actual validator-side `gl.nondet.web.render(mode='screenshot')` + `gl.nondet.exec_prompt(images=[...])` | NOT RUN |
| D8 | `freeze_case` | NOT RUN |
| D9 | `adjudicate_case` reaching real cross-validator consensus (not mocked) — observe actual `leader_receipt`/`validators` consensus data | NOT RUN |
| D10 | A real ALLOWED case | NOT RUN |
| D11 | A real FLAGGED case | NOT RUN |
| D12 | A real NEEDS_REVIEW case, if reproducibly triggerable (e.g. via an evidence item forced UNAVAILABLE) | NOT RUN |
| D13 | `file_challenge` | NOT RUN |
| D14 | `resolve_challenge` reaching real consensus | NOT RUN |
| D15 | 24h challenge-window / finalization timing using a legitimate test strategy (e.g. a case created near the start of a testing window, verified at real elapsed time — NOT a claimed "warp," since GenVM's real clock cannot be manipulated the way `gltest.direct` allows) | NOT RUN |
| D16 | `finalize_case` permissionless timeout path | NOT RUN |
| D17 | `get_moderation_receipt` / history reflect the real finalized state | NOT RUN |
| D18 | `get_case_precedents` returns the real finalized case | NOT RUN |
| D19 | `run_fairness_mirror` reaching real consensus | NOT RUN |

## Phase E — Frontend against the real deployment

| # | Item | Status |
|---|---|---|
| E1 | `VITE_FAIRMOD_CONTRACT_ADDRESS` set to the real temporary deployment; frontend loads and reads real state | NOT RUN |
| E2 | Real wallet write (disposable wallet) through the frontend UI, not the CLI directly | NOT RUN |
| E3 | Frontend's transaction-lifecycle UI (`TxStatus`, `writeAndConfirm`) correctly reflects real protocol status transitions | NOT RUN |
| E4 | Authoritative reread against real post-write state confirms (or honestly fails to confirm) the expected transition | NOT RUN |
| E5 | Explorer link from the frontend resolves to the correct real transaction/address | NOT RUN |

No item in this document may be checked off from a Direct Mode test, a mocked adapter test, a browser-only fixture render, or any local simulation — those are already complete (see `docs/FRONTEND_HOSTED_VERIFICATION_MATRIX.md` and the 195 contract / 66 frontend local tests) and are explicitly **not** substitutes for the items above.
