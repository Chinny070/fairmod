# FairMod Frontend

**Live**: [https://fairmod.vercel.app](https://fairmod.vercel.app), configured against the canonical contract `0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f` on StudioNet.

Frontend + GenLayer contract only — no backend, no centralized moderation service. The GenLayer contract (`../contracts/fairmod.py`) is the sole authoritative application state.

## Production hosting

Hosted on Vercel (project `chinny070s-projects/fairmod`), deployed via `vercel deploy --prod` from this directory. `vercel.json` provides the SPA rewrite (`/(.*) → /index.html`) React Router needs for direct/refreshed nested-route loads. The production `VITE_FAIRMOD_CONTRACT_ADDRESS` environment variable is set in the Vercel project's own dashboard/CLI env store (`vercel env add`), never committed to this repository.

## Stack

- Vite + React 18 + TypeScript (strict), React Router
- `genlayer-js@1.1.8` (pinned exact — do not upgrade to a 2.x/RC line; see `../docs/GENLAYER_JS_1_1_8_VERIFICATION.md` and the adapter's own source comments for what was verified against the actual installed package)
- Vitest + Testing Library for unit/adapter/component tests
- ESLint (strict TypeScript rules, `no-explicit-any` enforced)

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # optionally set VITE_FAIRMOD_CONTRACT_ADDRESS for local live reads
npm run dev
```

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `VITE_FAIRMOD_CONTRACT_ADDRESS` | The deployed FairMod contract address on StudioNet. Production points to the verified canonical deployment; local environments may leave it unset, in which case the app refuses reads/writes rather than fabricating a fallback (`src/config/network.ts`). | unset locally |
| `VITE_FAIRMOD_DEV_MODE` | Gates development-only fixture data paths (`src/dev/fixtures.ts`). Must remain unset/false in any production build. | `false` |

Changing which contract address the app talks to is a **one-line environment variable change** — nothing else in the codebase hardcodes an address (`src/config/network.ts` is the single source of truth, imported everywhere an address or Explorer link is needed).

## StudioNet configuration

Network: StudioNet · Chain ID `61999` · RPC `https://studio.genlayer.com/api` · Currency `GEN`. See `src/config/network.ts`.

**Hosted deployment status**: FairMod is deployed and verified on StudioNet. The production bundle was checked and contains `0xad3C8BF5FCE573A9dB2f0c857e8c303aDFBB771f`; no hardcoded fallback is used. Current deployment and lifecycle evidence: `../docs/CANONICAL_DEPLOYMENT_VERIFICATION.md`. The earlier `invalid_contract` issue #50 is historical context; the header-boundary correction preceded successful probe and FairMod deployments.

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

## Historical StudioNet deployment issue

The prior `invalid_contract` reports tracked under `genlayerlabs/genvm-manager#50` are historical. Successful probe and current FairMod deployments followed correction of the Depends-header boundary. Do not change the stable runner or network without a separately verified reason; current hosted evidence is in `../docs/CANONICAL_DEPLOYMENT_VERIFICATION.md`.

## Updating the production contract address

Production currently points at the canonical contract listed at the top of this README. Only for a separately authorized future deployment, set `VITE_FAIRMOD_CONTRACT_ADDRESS` in Vercel Production to that deployment's independently verified address and redeploy the frontend; no source fallback or code change is needed.
