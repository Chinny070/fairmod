# Evidence Model & Web Render Design (Stage 0)

This doc is the design companion to `EVIDENCE_CAPABILITY_MATRIX.md` (API verification lives there — this doc is the data-model/flow design).

## Evidence row shape
`(case_id, evidence_id)` compound key; fields: `evidence_type` (TEXT | WEB_LINK | DOCUMENT[reserved] | IMAGE[reserved]), `submitter_address`, `public_reference` (URL for WEB_LINK, null for TEXT), `source_category` (policy tag, e.g. "general-web" vs an allowlisted domain class), `submitted_at`, `frozen_at`/`retrieved_at`, `bounded_normalized_content` (the actual text the adjudication prompt uses), `fingerprint` (hash of normalized content), `availability_state` (PENDING | RETRIEVED | UNAVAILABLE | DISPUTED).

## Freeze flow
1. Evidence submitted while case is OPEN — reference stored, not yet retrieved.
2. On `freeze_case`, WEB_LINK evidence triggers the nondet web-render + equivalence flow (Stage 2/2A) exactly once per evidence row; result (or failure) is written back with `retrieved_at`/`availability_state` before the case can move to ADJUDICATING.
3. Once written, the evidence row is immutable — no method accepts an evidence_id for a case not in OPEN state.

## Changing-web handling
If leader and validators cannot reach `eq_principle` agreement on the rendered content, that nondet call does not resolve to a single value — the contract must catch this outcome explicitly and set `availability_state = DISPUTED`, which routes the case toward `NEEDS_REVIEW` rather than silently using whichever value happened to be threaded through. This must never be "first successful retrieval wins."

## Untrusted-content boundary
Retrieved web text, once bounded/normalized, is placed only in the evidence section of the adjudication prompt (see ARCHITECTURE.md's four-section separation). No retrieved text is ever concatenated into the procedure or constitution sections, and structured-output post-validation rejects any output that doesn't match the expected schema regardless of what the evidence text asked for.

## Bounds (defaults pending Stage 1/2 numeric confirmation)
Max URL length, max normalized content length after render, max evidence rows per case, allowed URL schemes (https only), rejected patterns (localhost/private-IP ranges, non-standard ports) to close SSRF-style abuse of the validator-side fetch.
