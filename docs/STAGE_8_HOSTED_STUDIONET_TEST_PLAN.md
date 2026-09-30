# Stage 8 — Hosted StudioNet Test Plan (Completion Gate)

## Stage 8C update
Phases A-E below were executed this stage against a real StudioNet 61999 deployment, after the header-boundary fix resolved the `invalid_contract` blocker. Full evidence (every transaction hash, execution result, and authoritative-reread confirmation) is in [docs/STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md](STAGE_8C_HOSTED_FAIRMOD_DEPLOYMENT.md). Statuses below are updated to match what was actually run — nothing below is marked PASS without a corresponding real transaction hash in that document.

This is the precise checklist of everything Stage 8 could **not** run because `genlayerlabs/genvm-manager#50` remained open. No item below was marked PASS until it was actually executed against a real, successfully-deployed contract on StudioNet 61999.

## Phase A — Clean probe re-verification (must pass before anything else)

| # | Item | Status |
|---|---|---|
| A1 | Clean probe deploys with protocol `FINALIZED` **and** `execution_result: SUCCESS` | **PASS** — tx `0xa8d1b91da1af0e39e95cbe52d169f318d95985677664d368fd7d2e37cbc62bdb` |
| A2 | Deployed probe address is queryable via `schema`/`code` | **PASS** |
| A3 | `get_probe()` returns exactly `FAIRMOD_61999_CLEANROOM_OK` | **PASS** |
| A4 | Result independently reconfirmed via the real Studio Explorer | **PASS** |

## Phase B — Temporary FairMod deployment

| # | Item | Status |
|---|---|---|
| B1 | FairMod (header-corrected, hash `e6fcc870cef9f70efeb7b148e2065aff297e850bafba18ad2537a9ae52970e0d`) deploys with `execution_result: SUCCESS` | **PASS** — tx `0x17343f3610fe94ffc22528b849a0326f27d94bec2d1544c1a2bb6c0b8f2def5f`, address `0xB29187225636f6C43C5D9231Ab4f9cfc00907609` |
| B2 | Deployed contract address queryable; schema matches exactly (30 methods) | **PASS** |

## Phase C — Critical view methods

| # | Item | Status |
|---|---|---|
| C1 | `list_communities` / `get_community` | **PASS** |
| C2 | `get_active_constitution_version` / `get_constitution` | **PASS** |
| C3 | `get_case` / `get_case_state` | **PASS** |
| C4 | `get_moderation_receipt` | **PASS** |
| C5 | `get_community_stats` / `get_community_cases` (pagination) | **PASS** |
| C6 | `get_case_precedents` | **PASS** |

## Phase D — Full lifecycle against the real deployment

| # | Item | Status |
|---|---|---|
| D1 | `create_community` | **PASS** |
| D2 | Constitution lifecycle: draft → rule → activate | **PASS** |
| D3 | `create_case` | **PASS** |
| D4 | `add_context` | **PASS** |
| D5 | Real TEXT evidence | **PASS** |
| D6 | Real WEB_LINK evidence — real validator-side `gl.nondet.web.get` | **PASS** — genuine fetched HTML from `example.com` observed |
| D7 | Real visual/IMAGE evidence — real screenshot + vision model | **PASS** — genuine model-generated description observed |
| D8 | `freeze_case` | **PASS** |
| D9 | `adjudicate_case` reaching real cross-validator consensus | **PASS** — real generated verdict/explanation/material_facts |
| D10 | A real ALLOWED case | **NOT REPRODUCIBLY TRIGGERED** this session (deliberately unambiguous content used to reliably obtain a real verdict on the first attempt; not fabricated) |
| D11 | A real FLAGGED case | **PASS** — verdict FLAGGED, rule HARASSMENT |
| D12 | A real NEEDS_REVIEW case | **NOT REPRODUCIBLY TRIGGERED** this session |
| D13 | `file_challenge` | **PASS** |
| D14 | `resolve_challenge` reaching real consensus | **PASS** — outcome UPHOLD, distinct real reasoning from the original adjudication |
| D15 | 24h challenge-window timing | **PARTIAL** — deadline correctly computed by real GenVM time (`challenge_deadline` = `decided_at` + exactly 24h); the case reached FINAL via challenge resolution before the window elapsed, so the window's own expiry was not observed |
| D16 | `finalize_case` permissionless timeout path | **PENDING REAL TIME WINDOW** — not exercised (case finalized via challenge resolution instead) |
| D17 | Receipt/history reflect real finalized state | **PASS** |
| D18 | `get_case_precedents` returns the real finalized case | **PASS** |
| D19 | `run_fairness_mirror` reaching real consensus | **PASS** — result CONSISTENT, verdict/finality fields unchanged |

## Phase E — Frontend against the real deployment

| # | Item | Status |
|---|---|---|
| E1 | Frontend loads and reads real state | **PASS** |
| E2 | Real wallet write through the frontend UI, not the CLI directly | **NOT RUN** — all hosted writes this session went through the CLI directly (per the task's own instructions); the adapter that would perform this is fully unit-tested (66/66 passing) but not exercised live through the browser UI itself |
| E3 | Frontend's transaction-lifecycle UI reflects real protocol status transitions | **NOT DIRECTLY OBSERVED** — the frontend's read-side rendering against real hosted state was confirmed (E1); its write-side `TxStatus`/`writeAndConfirm` behavior against a *live* transaction was not observed since E2 wasn't performed |
| E4 | Authoritative reread against real post-write state | **PASS at the CLI level** (every write above was followed by an independent reread); not separately re-proven through the frontend's own `writeAndConfirm` pipeline live |
| E5 | Explorer link resolves correctly | **PASS** — confirmed for the deployment transaction |

No item above was checked off from a Direct Mode test, a mocked adapter test, a browser-only fixture render, or any local simulation.
