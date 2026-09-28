# Evidence Model & Web Render Design (Stage 0 — REVISED)

This doc is the design companion to `EVIDENCE_CAPABILITY_MATRIX.md` (API verification, now source-verified from the embedded GenVM `genlayer.gl` package, lives there — this doc is the data-model/flow design).

## Corrected API reference (was vague/wrong in the prior pass)
- Web render: `gl.nondet.web.render(url, mode='text'|'html'|'screenshot')` — a single function, three modes, not three separate functions.
- Raw HTTP: `gl.nondet.web.get/post/delete/head/patch(url, ...)` and the general `gl.nondet.web.request(url, method=..., body=..., headers=...)`.
- Image/visual evidence uses the SAME render call with `mode='screenshot'` (returns a `gl.nondet.Image`), then feeds it to `gl.nondet.exec_prompt(prompt, images=[screenshot])` — this is now confirmed DOCUMENTED (see matrix), correcting the earlier BLOCKED classification.
- Equivalence: `gl.eq_principle.strict_eq(fn)` for exact-value cases, `gl.eq_principle.prompt_comparative(fn, principle)` for LLM-judged semantic equivalence (the one FairMod's evidence flow uses), `gl.eq_principle.prompt_non_comparative(fn, task=..., criteria=...)` for single-side subjective NLP tasks.
- Deterministic time for freeze/retrieval timestamps: `gl.message_raw['datetime']` (string) — NOT `gl.message.datetime`, which does not exist on the convenience `MessageType` NamedTuple.

## Evidence row shape
`(case_id, evidence_id)` compound key; fields: `evidence_type` (TEXT | WEB_LINK | IMAGE | DOCUMENT[HTML/TEXT sub-type only, reuses WEB_LINK path — PDF/DOCX sub-types stay UNSUPPORTED/reserved]), `submitter_address`, `public_reference` (URL), `source_category`, `submitted_at`, `frozen_at`/`retrieved_at`, `bounded_normalized_content` (text) or `content_fingerprint` (hash of screenshot/image bytes for IMAGE rows — the raw bytes themselves are not stored on-chain), `availability_state` (PENDING | RETRIEVED | UNAVAILABLE | DISPUTED).

## Freeze flow
1. Evidence submitted while case is OPEN — reference stored, not yet retrieved.
2. On `freeze_case`: WEB_LINK/DOCUMENT(HTML) evidence calls `gl.nondet.web.render(url, mode='text')` wrapped in `gl.eq_principle.prompt_comparative`; IMAGE evidence calls `gl.nondet.web.render(url, mode='screenshot')` (or `web.get` for a direct image URL) then `gl.nondet.exec_prompt(prompt, images=[...])`, also wrapped in `prompt_comparative`. Exactly once per evidence row; result (or failure) is written back with `retrieved_at`/`availability_state` before the case can move to ADJUDICATING.
3. Once written, the evidence row is immutable — no method accepts an evidence_id for a case not in OPEN state.

## Changing-web handling
Source-confirmed mechanism (see `EVIDENCE_CAPABILITY_MATRIX.md`): `gl.eq_principle.prompt_comparative(fn, principle)` makes the leader run `fn()` once and makes **each validator independently re-run `fn()` itself** (re-fetch/re-render/re-screenshot), then judges `leader_answer` vs `validator_answer` against `principle` via an LLM (`ExecPromptTemplate` / `EqComparative`). If that judgment or the underlying nondet execution disagrees, the call does not resolve to a single value — the contract must catch this outcome explicitly and set `availability_state = DISPUTED`, which routes the case toward `NEEDS_REVIEW` rather than silently using whichever value happened to be threaded through. This must never be "first successful retrieval wins." Screenshot-mode evidence has a materially higher legitimate-disagreement rate (dynamic content, ad rotation, viewport/timing differences) than text-mode — Stage 2A's test plan must exercise this specifically, not just malformed/unavailable-URL cases.

## Untrusted-content boundary
Retrieved web text, once bounded/normalized, is placed only in the evidence section of the adjudication prompt (see ARCHITECTURE.md's four-section separation). No retrieved text is ever concatenated into the procedure or constitution sections, and structured-output post-validation rejects any output that doesn't match the expected schema regardless of what the evidence text asked for. Text visible **inside** a rendered screenshot/image passed to `gl.nondet.exec_prompt(images=[...])` is the same class of untrusted data — the prompt text sent alongside the image must explicitly instruct the model that any instruction-like text appearing in the image is evidence content, not a command (see `THREAT_MODEL.md` row on visual prompt injection).

## Bounds (defaults pending Stage 1/2 numeric confirmation)
Max URL length, max normalized content length after render, max evidence rows per case, allowed URL schemes (https only), rejected patterns (localhost/private-IP ranges, non-standard ports) to close SSRF-style abuse of the validator-side fetch.
