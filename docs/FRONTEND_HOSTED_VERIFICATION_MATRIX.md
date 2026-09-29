# Stage 7 — Hosted Verification Matrix

Honest status per Stage 7 §35: nothing requiring a deployed FairMod contract on StudioNet is marked PASS. `genlayerlabs/genvm-manager#50` remains open; the clean-probe reproduction (`docs/STUDIONET_61999_CLEAN_PROBE_RESULT.md`) shows the identical `FINALIZED`/`execution_result: ERROR`/`invalid_contract` signature persists under a fully cleaned toolchain, so a live FairMod deployment is not currently possible.

| Test | Local | Mocked | Direct Mode | Real StudioNet | Status | Evidence | Blocker |
|---|---|---|---|---|---|---|---|
| Domain constraint unit tests (Rule ID format, URL preview, bounds) | Yes | — | — | — | PASS | `src/domain/constraints.test.ts` | — |
| Error taxonomy normalization | Yes | — | — | — | PASS | `src/domain/errors.test.ts` | — |
| Adapter exact functionName/args/value boundary (all methods spot-checked) | Yes | Yes (genlayer-js client mocked) | — | — | PASS | `src/adapter/fairmodAdapter.test.ts` | — |
| Adapter CONTRACT_NOT_CONFIGURED refusal | Yes | Yes | — | — | PASS | `src/adapter/fairmodAdapter.test.ts` | — |
| Transaction lifecycle phase derivation (incl. FINALIZED+ERROR shape) | Yes | Yes | — | — | PASS | `src/adapter/txLifecycle.test.ts` | — |
| write → observe → reread anti-false-positive pipeline | Yes | Yes | — | — | PASS | `src/adapter/writeAndConfirm.test.ts` | — |
| Full community → constitution → case → evidence → freeze → adjudicate → challenge → finalize lifecycle against a real deployed FairMod contract | — | — | — | No | **BLOCKED** | — | genlayerlabs/genvm-manager#50 |
| Real `web.get`/`web.render` evidence acquisition observed through the UI | — | — | — | No | **BLOCKED** | — | genlayerlabs/genvm-manager#50 |
| Real cross-validator adjudication consensus observed through the UI | — | — | — | No | **BLOCKED** | — | genlayerlabs/genvm-manager#50 |
| Real challenge/finality timing against StudioNet's actual block/transaction clock | — | — | — | No | **BLOCKED** | — | genlayerlabs/genvm-manager#50 |
| Wallet connect / disconnect / account-change / chain-change detection against a real injected provider | Manual only | — | — | Partial (network detection logic exercised against StudioNet RPC directly, no live wallet session in this stage) | **PARTIAL** | `src/adapter/useWallet.ts` implemented, EIP-1193 event handlers wired; not exercised against a live browser wallet extension this stage | Requires a manual browser session with MetaMask — deferred to reviewer/manual QA, not a code gap |
| Production build (`vite build` + `tsc -b`) | Yes | — | — | — | see Stage 7 report for PASS/FAIL | build output | — |
| Lint (`eslint`) | Yes | — | — | — | see Stage 7 report | lint output | — |
| Accessibility (automated) | Not run this stage | — | — | — | **NOT RUN** | — | No automated a11y tool (e.g. axe) was wired into the test suite this stage — manual structural review only (semantic HTML, labels, `role="alert"`/`role="status"`, focus-visible tokens) |
| Responsive layout at representative breakpoints | Manual/CSS review only | — | — | — | **NOT AUTOMATED** | `src/styles/app.css` media query at 640px | No screenshot-diff or viewport test harness wired this stage |

## What "Direct Mode" columns mean here

Direct Mode (`gltest.direct`) is the contract's own local test runner (Python side, unchanged from Stage 1-6). It has no frontend-facing equivalent — the frontend's local verification is its own Vitest suite mocking the `genlayer-js` client boundary, which is the frontend analogue of the same "prove the code's own logic without needing a live network" principle. No frontend test in this matrix claims Direct Mode coverage for itself; Direct Mode rows are left blank (`—`) throughout because they describe the contract's test suite, not the frontend's.
