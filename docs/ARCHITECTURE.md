# FairMod Architecture (Stage 0)

## Scope discipline
Build only: (1) one GenLayer Intelligent Contract suite, (2) a browser frontend. No Supabase/Firebase/Fly.io/centralized DB/hidden adjudicator/staking system. Network: `studionet`, chain `61999`, RPC `https://studio.genlayer.com/api`, frontend SDK `genlayer-js@1.1.8` (pinned — not latest; see TOOLCHAIN).

## Toolchain (verified this session — REVISED, now complete)
- Python 3.12.10, Node v24.14.0, npm 11.9.0 present locally.
- `genlayer` CLI 0.39.2 installed globally (`npm i -g genlayer`, confirmed via `genlayer --version`); used to scaffold a real example project (`genlayer new probe`) for cross-reference.
- `genvm-linter` 0.11.1rc2 installed (pip) — provides `genvm-lint check` and, critically, a `download_artifacts()` helper that pulled the official GenVM runtime bundle (`genvm-universal-genlayerlabs-genvm-manager-v0.6.0-rc6.tar.xz`) directly from GenLayer's own release artifacts; this is the actual source used to verify contract-side APIs (see `GENVM_API_VERIFICATION.md`).
- `genlayer-test` 0.29.2 installed (pip; depends on `genlayer-py`, `pytest`, `pyyaml`).
- `pytest` 8.4.2 installed.
- `genlayer-js@1.1.8` installed in an isolated scratch npm workspace and its type declarations + a runtime probe script inspected directly — see `GENLAYER_JS_1_1_8_VERIFICATION.md`. `genlayer-js` on npm goes up to `2.0.0-rc.1`; 1.1.8 was NOT substituted with 2.x or Transaction Kit, per instruction.
- No GenLayer docs MCP (`docs-mcp.genlayer.com`) or Skills plugin marketplace was reachable as Claude Code slash commands in this environment; per the build brief's fallback instruction, primary-source verification was done instead via locally-installed package/source inspection (`genvm-linter`'s artifact downloader + `genlayer-js`'s own `.d.ts` files), which is a stronger verification method than docs-website fetching in practice — a WebFetch pass against the docs website had already produced one incorrect conclusion (IMAGE marked BLOCKED) that direct source reading corrected.

## Multi-community model (single contract, many communities)
One deployed contract instance is the registry for all communities — no per-community redeploy.

```
Contract state (conceptual, Stage 1 will pick exact GenLayer storage types):
  communities: TreeMap[community_id -> Community]
  constitutions: TreeMap[(community_id, version) -> Constitution]   # immutable once activated
  rules: TreeMap[(community_id, version, rule_id) -> Rule]
  cases: TreeMap[case_id -> Case]
  evidence: TreeMap[(case_id, evidence_id) -> Evidence]
  challenges: TreeMap[case_id -> Challenge]                          # bounded to one per case unless spec changes
  moderators: TreeMap[(community_id, address) -> Role]
  case_counter / evidence_counter / community_counter: monotonic ids
```

`community_id`, `case_id`, `evidence_id`, `rule_id` are all protocol-assigned monotonic/stable IDs, never client-supplied — this closes the "reference another case's evidence" and "spoof an ID" attack classes at the storage layer: a lookup by ID either resolves to a real, correctly-scoped record or fails.

## Roles and permission boundary
- **Owner** (community creator, set once at `create_community`, transferable only via an explicit two-step handoff in a later stage — not in scope for Stage 0/1): manages moderator list, publishes constitution versions.
- **Moderator**: address explicitly added by the owner to `moderators[(community_id, address)]`; can perform only actions the active constitution/protocol authorizes (e.g. mark evidence reviewed, resolve `NEEDS_REVIEW`), never adjudicate directly.
- **Reporter/user**: any address; can open a case, submit evidence pre-freeze, file a challenge if eligible.
- **GenLayer consensus**: the only path that can write a `verdict` field. No admin/moderator function may set `verdict` directly — this is enforced by having exactly one internal method that writes it, called only from the adjudication transition, never exposed as a public write.

Every state-changing method checks `gl.message.sender_address` against the relevant role map before acting; there is no "trust the caller's claimed role" pattern anywhere.

## Constitution versioning
`activate_constitution(community_id, draft)` is the only way a constitution becomes real; on activation it is assigned a version number, an activation timestamp, and an immutable content commitment (hash of the serialized rules). Once activated, that version's rule text is never mutated — a new draft becomes v(n+1) instead. Each case stores the exact `(community_id, version)` it is bound to at creation time, so a later constitution change cannot retroactively change the rules a pending case is judged under. Rule IDs are **stable logical keys** across versions (e.g. `HARASSMENT`, `SPAM`) per the finalized user decision — see `CONSTITUTION_AND_RULES.md` for the full storage-key design (`(community_id, version, rule_id) -> definition`).

## Case state machine
See `docs/STATE_MACHINE.md` for the full transition table. Summary:
`OPEN -> EVIDENCE_FROZEN -> ADJUDICATING -> DECIDED -> CHALLENGE_WINDOW -> [CHALLENGED -> CHALLENGE_DECIDED] -> FINAL`, with `NEEDS_REVIEW` as a real sub-state reachable from `ADJUDICATING`/`CHALLENGE_DECIDED` with its own deterministic human-review deadline and timeout exit.

## Evidence Locker
Evidence rows are always case-scoped (`(case_id, evidence_id)` compound key) — a lookup can never silently resolve to another case's row. Evidence type is one of `TEXT | WEB_LINK | DOCUMENT | IMAGE`; only `TEXT` and `WEB_LINK` are enabled at the contract-logic level per `EVIDENCE_CAPABILITY_MATRIX.md` — `DOCUMENT`/`IMAGE` exist as reserved enum values the UI can show as "not yet supported," per the product spec's instruction to preserve planned capabilities without faking them.

## Web evidence / independent validator acquisition (conceptual — Stage 2/2A implements; API source-verified in `GENVM_API_VERIFICATION.md`/`EVIDENCE_CAPABILITY_MATRIX.md`)
`frozen URL -> deterministic HTTPS/allowlist validation -> gl.nondet.web.render(url, mode='text') executed independently by leader and each validator (confirmed: gl.eq_principle.prompt_comparative's validator_fn re-runs the fetch closure itself, not a trust-the-leader copy) -> bounded extraction -> prompt_comparative equivalence judgment -> consensus value -> stored fingerprint of the agreed normalized extract`. For IMAGE evidence, the same shape applies with `mode='screenshot'` feeding `gl.nondet.exec_prompt(prompt, images=[...])`. A frontend fetch is never treated as evidence of what the contract saw; the frontend may show a preview, but the case's authoritative evidence text comes only from a completed nondet contract call, and the Evidence row is not marked "retrieved" until that call lands in state.

## Adjudication context separation (Stage 3 implements)
The prompt assembled for `exec_prompt`/`eq_principle.prompt_comparative` must be built from four structurally distinct sections the contract code keeps separate until the final string assembly: (1) trusted fixed procedure text authored by FairMod, (2) the frozen constitution/rule text for the case's bound version, (3) untrusted reported content, (4) untrusted evidence extracts. Rule/Evidence IDs referenced in the LLM's structured output are validated against the case's actual bound rule set and evidence rows before being persisted — a hallucinated ID is rejected, not stored.

## Frontend information architecture (design system detail in a later stage doc; IA only here)
Landing -> Communities Explorer -> Community profile -> {Rules Studio, Constitution history, New Case, Moderation history, Precedent Explorer, Transparency, Fairness Mirror, Playground} -> Case File -> {Evidence Locker, Consensus status, Challenge flow, Moderation Receipt}. Every page reads from one canonical typed chain/contract-address config; no page hardcodes an address or duplicates the ABI/schema import.

## Stage 2 update
Evidence acquisition (`acquire_evidence`) is now implemented per the conceptual flow above, using `gl.nondet.web.get()` (text route — corrected from `web.render` to expose HTTP status) and `gl.nondet.web.render(mode='screenshot')` + `gl.nondet.exec_prompt(images=[...])` (image route), both wrapped in `gl.eq_principle.prompt_comparative`. See [docs/STAGE_2_VERIFICATION.md](STAGE_2_VERIFICATION.md) for full detail, mock-test coverage, and REQUIRES_HOSTED_PROOF items. Still no semantic verdict logic anywhere in the contract.

## Explicit non-scope for Stage 0
No contract file, no frontend code, no deployment, no wallet connection, no transaction of any kind was produced or executed in this stage.
