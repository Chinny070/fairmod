# FairMod Frontend

Frontend + GenLayer contract only — no backend, no centralized moderation service. The GenLayer contract (`../contracts/fairmod.py`) is the sole authoritative application state.

## Stack

- Vite + React 18 + TypeScript (strict), React Router
- `genlayer-js@1.1.8` (pinned exact — do not upgrade to a 2.x/RC line; see `../docs/GENLAYER_JS_1_1_8_VERIFICATION.md` and the adapter's own source comments for what was verified against the actual installed package)
- Vitest + Testing Library for unit/adapter/component tests
- ESLint (strict TypeScript rules, `no-explicit-any` enforced)

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # then set VITE_FAIRMOD_CONTRACT_ADDRESS once a real deployment exists
npm run dev
```

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `VITE_FAIRMOD_CONTRACT_ADDRESS` | The deployed FairMod contract address on StudioNet. Empty until a real deployment exists — the app refuses reads/writes rather than fabricating a fallback address (`src/config/network.ts`). | unset |
| `VITE_FAIRMOD_DEV_MODE` | Gates development-only fixture data paths (`src/dev/fixtures.ts`). Must remain unset/false in any production build. | `false` |

Changing which contract address the app talks to is a **one-line environment variable change** — nothing else in the codebase hardcodes an address (`src/config/network.ts` is the single source of truth, imported everywhere an address or Explorer link is needed).

## StudioNet configuration

Network: StudioNet · Chain ID `61999` · RPC `https://studio.genlayer.com/api` · Currency `GEN`. See `src/config/network.ts`.

**Hosted deployment status**: FairMod itself is not yet deployed to StudioNet. Hosted deployment is blocked by [genlayerlabs/genvm-manager#50](https://github.com/genlayerlabs/genvm-manager/issues/50) — every deployment attempt of the pinned runner (including a from-scratch minimal probe under a fully cleaned local toolchain) reaches protocol `FINALIZED` but GenVM execution reports `invalid_contract`. See `../docs/STUDIONET_61999_CLEAN_PROBE_RESULT.md` for the full evidence. This frontend is built and tested against the contract's schema and mocked SDK boundary, not against a live deployment — see `../docs/FRONTEND_HOSTED_VERIFICATION_MATRIX.md`.

## Wallet behavior

Injected EIP-1193 provider (MetaMask-compatible) only. Never requests or stores a private key or seed phrase. A public visitor gets a read-only client automatically — connecting a wallet is only required for write actions. Network mismatch (wrong chain id) is detected and surfaced; the app never silently submits a write to the wrong chain.

## Method mapping

See `../docs/FRONTEND_METHOD_MATRIX.md` for the full method-to-UI matrix covering all 30 public contract methods.

## Transaction lifecycle

Every write goes through `src/adapter/writeAndConfirm.ts`: submit → observe (protocol status + GenVM execution result, via `src/adapter/txLifecycle.ts`) → **always** re-read authoritative contract state → only then compute `applicationConfirmed`. No UI component may show a "success" state from a transaction hash or a `FINALIZED` protocol status alone — this was a real, previously-observed failure mode (a `FINALIZED` transaction with GenVM `execution_result: ERROR`; see `../docs/STUDIONET_61999_CLEAN_PROBE_RESULT.md`).

## Community administration & constitution authoring (Stage 7.1)

All 30 public contract methods now have usable UI, not just adapter wiring — see `../docs/FRONTEND_METHOD_MATRIX.md`. Notably:
- **Administration tab** (Community detail): grant/revoke ADMIN/MODERATOR roles, gated to the community owner, with a confirmation dialog before every change.
- **Constitution authoring** (Constitution tab, "Draft a new constitution version"): create a draft, add rules with client-side Rule-ID format validation, and activate — gated to OWNER/ADMIN, with an explicit confirmation dialog before activation (irreversible).
- **Case context** (Case detail): add background context, visually and semantically distinct from Evidence and the Verdict.

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

66 tests across 8 files. Categories: domain unit tests (`src/domain/*.test.ts`), adapter boundary tests mocking the `genlayer-js` client exactly (`src/adapter/fairmodAdapter.test.ts`), transaction lifecycle tests including the exact `FINALIZED`+`execution_result: ERROR` shape (`src/adapter/txLifecycle.test.ts`), the write→observe→reread pipeline (`src/adapter/writeAndConfirm.test.ts`), wallet edge cases against a fake in-memory EIP-1193 provider (`src/adapter/useWallet.test.ts` — no live wallet transaction is ever performed by this suite), automated accessibility checks via `axe-core`/`vitest-axe` (`src/test/a11y.test.tsx`), and a security regression suite including a real filesystem scan for `dangerouslySetInnerHTML` (`src/test/security.test.tsx`).

### Responsive verification

Automated overflow detection (`document.documentElement.scrollWidth > clientWidth`) was run against the real dev server at mobile/tablet/desktop-pane widths using a dev-gated long-content stress route (`src/pages/DevPreview.tsx`, only reachable with `VITE_FAIRMOD_DEV_MODE=true`, inert otherwise). This found and fixed a real page-wide horizontal-overflow bug caused by unbroken long tokens (addresses/URLs) — see `src/styles/app.css`'s `overflow-wrap: anywhere` rules. This is real-browser verification, not an exhaustive pixel-level visual regression suite across every route×breakpoint combination — see `../docs/FRONTEND_HOSTED_VERIFICATION_MATRIX.md` for the precise scope.

### Bundle

Two chunks: app code (~213kB/67kB gzip) and a `genlayer-vendor` chunk (~535kB/116kB gzip) containing `genlayer-js`+`viem`, split via `vite.config.ts`'s `manualChunks` for browser-cache efficiency across deploys (not a size reduction — the SDK's size is inherent to being a real Web3 wallet/RPC library). See `../docs/FRONTEND_HOSTED_VERIFICATION_MATRIX.md` for the full investigation.

## Mock/dev mode restrictions

`src/dev/fixtures.ts` contains deterministic fixture data for visual/component development. It is imported by **no** production code path (`src/adapter`, `src/pages`, `src/config`) — grep for `dev/fixtures` to confirm before any release. `VITE_FAIRMOD_DEV_MODE` exists as an explicit, isolated gate for any future dev-only UI affordance; no current page reads it to alter production behavior.

## Issue #50 hosted-testing blocker

Do not attempt to work around `genlayerlabs/genvm-manager#50` by switching tooling generations, runners, or networks in this frontend. If maintainers respond with a suggested fix, it is tested against the minimal clean probe first (`../diagnostics/studionet_61999_clean_probe.py`), not against this frontend directly.

## Final deployment-address replacement procedure

1. Deploy the exact frozen, accepted `contracts/fairmod.py` source (hash must match the recorded release-candidate hash).
2. Set `VITE_FAIRMOD_CONTRACT_ADDRESS` in the production environment to the resulting address.
3. Redeploy the frontend. No code change is required.
