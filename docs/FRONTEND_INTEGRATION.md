# Frontend Integration Design (Stage 0)

Implements Stage 6. IA summary duplicated from ARCHITECTURE.md; this doc adds integration-specific rules.

## Canonical config
One typed module exporting: chain id (61999), RPC URL, deployed contract address, contract schema/ABI import. Every read/write hook imports from this module — no second hardcoded address anywhere (closes threat #20 in THREAT_MODEL.md).

## Wallet flow
Injected EIP-1193 wallet via `genlayer-js@1.1.8`. Detect current chain; if not 61999, show a "switch network" affordance rather than silently submitting; never fall back to another network. Exact client-creation/read/write call surface for `genlayer-js@1.1.8` was not independently verified in this Stage 0 pass (WebFetch attempts against SDK docs returned incomplete results for this — flagged as UNVERIFIED, to confirm via a local `npm install genlayer-js@1.1.8` + package inspection at the start of Stage 6, not guessed).

## Lifecycle states surfaced (never collapsed into a single "done")
`signature_requested -> submitted -> pending_consensus -> decided -> challengeable -> finalizing -> finalized`, plus `failed`/`undetermined`. A transaction hash alone only moves state to `submitted`; `finalized` is set only after rereading authoritative contract state.

## Safety
Evidence/reported content rendered as text, never as executable HTML; no `dangerouslySetInnerHTML`-equivalent on untrusted fields.

## Accessibility
Keyboard operable, focus-visible, non-color verdict cues (shape/type, not just color), responsive down to mobile width, `prefers-reduced-motion` respected, long IDs/hashes truncate with full value on focus/hover and copy affordance.

## Visual design system
Full design-token/component spec (palette, typography, Constitution Sheet/Rule Mark/Case File/Evidence Seal/Verdict Stamp/Consensus Rail/Challenge Clock/Receipt/Precedent Folio/Fairness Mirror components) is a Stage 6 deliverable — Stage 0 commits only to the non-negotiable constraints already stated in the product spec (civic-editorialism direction, forbidden generic-SaaS patterns, the given palette as foundation) and does not produce final tokens/mockups yet.
