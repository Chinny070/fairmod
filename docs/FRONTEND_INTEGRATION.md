# Frontend Integration Design (Stage 0)

Implements Stage 6. IA summary duplicated from ARCHITECTURE.md; this doc adds integration-specific rules.

## Canonical config
One typed module exporting: chain id (61999), RPC URL, deployed contract address, contract schema/ABI import. Every read/write hook imports from this module — no second hardcoded address anywhere (closes threat #20 in THREAT_MODEL.md).

## Wallet flow — VERIFIED against installed `genlayer-js@1.1.8`
`npm install genlayer-js@1.1.8` was run and the package's `.d.ts` files inspected directly (not guessed). Confirmed API:
- `createClient({ chain?, endpoint?, account?, provider? })` — `provider` accepts an injected EIP-1193 provider directly.
- `chains.studionet` is a real exported chain object: `{ id: 61999, isStudio: true, name: "Genlayer Studio Network", rpcUrls.default.http: ["https://studio.genlayer.com/api"], nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 }, consensusMainContract: {...} }` — this independently confirms the product spec's chain-61999/RPC baseline directly from the installed package, not just from the spec text.
- `client.readContract({ address, functionName, args?, kwargs? })` and `client.writeContract({ address, functionName, args?, value, leaderOnly?, consensusMaxRotations? })`.
- `client.deployContract({ code, args?, kwargs? })`, `client.getTransaction({ hash })`, `client.getCurrentNonce({ address })`.
- `client.waitForTransactionReceipt({ hash, status?, interval?, retries? })` — accepts a target `TransactionStatus` to wait for, not just "transaction included."
- `TransactionStatus` enum (14 values): `UNINITIALIZED, PENDING, PROPOSING, COMMITTING, REVEALING, ACCEPTED, UNDETERMINED, FINALIZED, CANCELED, APPEAL_REVEALING, APPEAL_COMMITTING, READY_TO_FINALIZE, VALIDATORS_TIMEOUT, LEADER_TIMEOUT` — plus a `DECIDED_STATES` array and `isDecidedState(status)` helper. This is the exact primitive that makes "a tx hash is not finality" enforceable in code: the frontend must poll/wait for `TransactionStatus.FINALIZED` (or use `isDecidedState`/`DECIDED_STATES` for the "decided but not yet final" UI state), never treat "transaction returned a hash" or even "ACCEPTED" as done.
- Also present: `canAppeal({ txId })`, `appealTransaction`, `finalizeTransaction`, `finalizeIdlenessTxs`, `getMinAppealBond` — these are GenLayer **protocol-level** appeal/finality primitives, confirming Stage 4's required distinction between protocol-level appeal and FairMod's own application-level challenge system is a real, separate mechanism in the SDK, not just a conceptual worry.
- No dedicated "chain switch" helper was found in the top-level exports inspected; network switching is expected to go through the injected provider's own `wallet_switchEthereumChain` (standard EIP-1193), with the frontend detecting mismatch via the connected provider's chain id vs `chains.studionet.id` (61999) before allowing any write.

## Lifecycle states surfaced (never collapsed into a single "done")
`signature_requested -> submitted -> pending_consensus (PROPOSING/COMMITTING/REVEALING/ACCEPTED) -> decided (isDecidedState) -> challengeable -> finalizing -> finalized (TransactionStatus.FINALIZED via waitForTransactionReceipt)`, plus `failed`/`undetermined` (`CANCELED`/`UNDETERMINED`/`VALIDATORS_TIMEOUT`/`LEADER_TIMEOUT`). A transaction hash alone only moves state to `submitted`; `finalized` is set only after `waitForTransactionReceipt` (or an equivalent reread) actually reports `TransactionStatus.FINALIZED`, matching the product spec's explicit EVM-inclusion-vs-GenLayer-finality distinction with a real SDK primitive, not a UI convention.

## Safety
Evidence/reported content rendered as text, never as executable HTML; no `dangerouslySetInnerHTML`-equivalent on untrusted fields.

## Accessibility
Keyboard operable, focus-visible, non-color verdict cues (shape/type, not just color), responsive down to mobile width, `prefers-reduced-motion` respected, long IDs/hashes truncate with full value on focus/hover and copy affordance.

## Visual design system
Full design-token/component spec (palette, typography, Constitution Sheet/Rule Mark/Case File/Evidence Seal/Verdict Stamp/Consensus Rail/Challenge Clock/Receipt/Precedent Folio/Fairness Mirror components) is a Stage 6 deliverable — Stage 0 commits only to the non-negotiable constraints already stated in the product spec (civic-editorialism direction, forbidden generic-SaaS patterns, the given palette as foundation) and does not produce final tokens/mockups yet.
