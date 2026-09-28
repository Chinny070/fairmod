# Evidence Capability Matrix (Stage 0 — REVISED)

## Source of truth for this revision

The previous version of this matrix was WebFetch/WebSearch-summarized against `docs.genlayer.com` and was **incorrect on IMAGE** and imprecise on the exact web API names. This revision replaces it with the **actual GenVM Python standard-library source code**, obtained via a real, official channel:

1. `genvm-linter` (0.11.1rc2, installed locally) ships a `download_artifacts()` helper (`genvm_linter/validate/artifacts.py`) that fetches the official GenVM runtime bundle directly from GenLayer's own release artifacts (`genlayerlabs/genvm-manager`). Running it downloaded `genvm-universal-genlayerlabs-genvm-manager-v0.6.0-rc6.tar.xz` (latest at time of check) to `~/.cache/genvm-linter/`; a prior cached extraction of `v0.6.0-rc5` (same minor line, one rc apart) was already unpacked on this machine and was read directly.
2. The extracted tree contains `py-lib-genlayer-std/.../genlayer/gl/*.py` — this **is** the real `genlayer.gl` package that gets embedded into the GenVM WASM runtime; `from genlayer import *` inside a contract resolves to this exact code. This is materially more reliable than the docs website (which a WebFetch summarization pass had already gotten wrong on IMAGE).
3. Read in full: `gl/nondet/__init__.py`, `gl/nondet/web.py`, `gl/eq_principle.py`, `gl/genvm_contracts.py`, `gl/annotations.py`, `gl/advanced.py`, `gl/__init__.py`, `_internal/msg.py`, `py/storage/__init__.py`.

This is now **VERIFIED against embedded runtime source**, not documentation. Remaining gap: confirm this exact `v0.6.0-rc*` build is what StudioNet's live chain 61999 currently runs (StudioNet could be pinned to a different GenVM build) — that is a hosted-proof item, not a source-reading item, and is called out per row below.

## Corrected exact API (verbatim from `genlayer/gl/nondet/web.py` and `genlayer/gl/nondet/__init__.py`)

```python
# gl.nondet.web — all functions return Lazy[...], call .get() or await
gl.nondet.web.get(url, *, headers={})            -> Lazy[Response]
gl.nondet.web.post(url, *, body=None, headers={}) -> Lazy[Response]
gl.nondet.web.delete/head/patch(...)              -> Lazy[Response]
gl.nondet.web.request(url, *, method: Literal['GET','POST','DELETE','HEAD','OPTIONS','PATCH'], body=None, headers={}) -> Lazy[Response]
gl.nondet.web.render(url, *, mode: Literal['html','text','screenshot'] = 'text', wait_after_loaded=None) -> Lazy[str | Image]
  # mode='html' or 'text' -> str ; mode='screenshot' -> Image(raw: bytes, pil: PIL.Image.Image)

# gl.nondet.exec_prompt — THIS is the multimodal entry point
gl.nondet.exec_prompt(prompt: str, *, response_format: Literal['text','json']='text',
                       images: Sequence[bytes | gl.nondet.Image] | None = None) -> Lazy[str | dict]

# gl.eq_principle — equivalence wrappers, each takes a callable
gl.eq_principle.strict_eq(fn) -> Lazy[T]                         # exact value equality across leader/validator
gl.eq_principle.prompt_comparative(fn, principle: str) -> Lazy[T] # LLM judges leader vs validator result vs principle
gl.eq_principle.prompt_non_comparative(fn, *, task: str, criteria: str) -> Lazy[str]  # subjective single-side NLP task, integrity-checked
```

There is **no** `gl.get_webpage`, `gl.nondet.exec_prompt` accepting a *single* `image=` kwarg (that overload signature exists in the type stubs but the implementation takes `images=[...]`, plural, a list of `bytes | Image`), and **no** `gl.eq_principle.strict_eq()`-as-namespace-call typo from the earlier pass — module is `gl.eq_principle`, function is `strict_eq`, called as `gl.eq_principle.strict_eq(fn)`. Confirmed exactly from source, correcting the prior draft's guess.

Deterministic transaction time: `gl.message_raw['datetime']` (a string field on the raw message dict — see `genlayer/_internal/msg.py`); `gl.message` (the convenience NamedTuple) does **not** re-expose `datetime`, only `contract_address/sender_address/origin_address/value/chain_id` — so FairMod's timestamp code must read `gl.message_raw['datetime']` directly, not `gl.message.datetime` (that attribute does not exist and would be a runtime AttributeError).

## Revised matrix

| Modality | Exact verified API | Source | Runtime confidence | Independent validator acquisition | Bounds | Equivalence | Provenance | Changing-source behavior | Status |
|---|---|---|---|---|---|---|---|---|---|
| TEXT | Ordinary contract storage field; no GenVM API needed | N/A | Certain | N/A (deterministic) | Max length (Stage 1 constant) | Exact match | Content hash at submission | Immutable once frozen | VERIFIED |
| WEB_LINK | `gl.nondet.web.render(url, mode='text')` or `mode='html'`, wrapped in `gl.eq_principle.prompt_comparative(fn, principle)` | `genlayer/gl/nondet/web.py`, `genlayer/gl/eq_principle.py` (embedded runtime source, v0.6.0-rc5/rc6) | HIGH confidence in API shape; NOT yet confirmed this exact rc build is what StudioNet 61999 currently executes | GenVM invokes `fn` once for the leader and independently re-invokes the validator closure per validator per `eq_principle.prompt_comparative`'s documented leader/validator split (source: the function builds a separate `validator_fn` that re-executes `fn()` and only then calls `ExecPromptTemplate` with `leader_answer` vs `validator_answer`) — this is a real, source-confirmed independent-acquisition design, not a leader-broadcast-and-trust pattern | Bound rendered text length; HTTPS-only; reject private/localhost targets | `gl.eq_principle.prompt_comparative(fn, principle)` — LLM-judged; non-agreement is a nondet-consensus failure the contract must catch | Freeze URL + timestamp (`gl.message_raw['datetime']`); store fingerprint of leader's normalized text | Non-equivalent leader/validator renders -> no agreed value -> contract routes to `NEEDS_REVIEW` | REQUIRES_HOSTED_STUDIONET_PROOF |
| IMAGE (via WEB_LINK screenshot) | `screenshot = gl.nondet.web.render(url, mode='screenshot')` (returns `Image`) then `gl.nondet.exec_prompt(prompt, images=[screenshot])`, wrapped in `gl.eq_principle.prompt_comparative` | `genlayer/gl/nondet/__init__.py` (`Image` dataclass, `exec_prompt` signature with `images=`) | HIGH confidence in API shape (corrects the prior draft's "BLOCKED — no API found," which was wrong: the API exists in embedded source) — NOT yet hosted-proven, and NOT yet confirmed the deployed StudioNet model backend actually performs vision inference on the `images` payload rather than ignoring it | Same independent-acquisition pattern as WEB_LINK: each validator independently renders its own screenshot and runs its own `exec_prompt`, compared via `prompt_comparative`, not a shared leader image | Bound image byte size before passing to `exec_prompt`; reject non-image content-types | `gl.eq_principle.prompt_comparative` over the `exec_prompt` result | Freeze URL + timestamp; fingerprint the rendered screenshot bytes (hash), not just the URL, since screenshot content is itself the disputed nondet value | Two validators' screenshots of the same URL can legitimately differ (dynamic content, viewport, timing) — this is a materially higher disagreement-risk case than text render and must be explicitly tested | **DOCUMENTED / REQUIRES_HOSTED_STUDIONET_PROOF** (was incorrectly BLOCKED — corrected per user's direct doc check) |
| IMAGE (direct image URL/upload, no screenshot) | `gl.nondet.web.get(url)` to fetch raw bytes, then `gl.nondet.exec_prompt(prompt, images=[raw_bytes])` | Same source files | Same as above | Same pattern — each validator independently fetches the image bytes via its own `web.get` call | Bound byte size; validate content-type is an actual image before passing to `exec_prompt` | `prompt_comparative` | Fingerprint the fetched bytes | A mutable image URL is the same changing-source problem as WEB_LINK, at the byte level | REQUIRES_HOSTED_STUDIONET_PROOF |
| DOCUMENT — HTML/plain-text document | `gl.nondet.web.render(url, mode='text'/'html')` — identical mechanism to WEB_LINK; there is no separate "document" primitive because an HTML/text document IS a web page to this API | `genlayer/gl/nondet/web.py` | HIGH | Same as WEB_LINK | Same as WEB_LINK | `prompt_comparative` | Same as WEB_LINK | Same as WEB_LINK | REQUIRES_HOSTED_STUDIONET_PROOF (functionally = WEB_LINK, not a distinct code path) |
| DOCUMENT — PDF | No PDF-parsing primitive exists anywhere in the embedded `genlayer.gl`/`genlayer.py` source (confirmed by reading every module under `gl/` and `py/` — the only nondet I/O primitives are `WebRequest`, `WebRender`, `ExecPrompt`, `ExecPromptTemplate`, `CallContract`, `PostMessage`, `DeployContract`, `Trace`; none parses PDF) | Absence confirmed by exhaustive source read, not by searching docs | Confident absence at this GenVM build | N/A | N/A | N/A | N/A | N/A | **UNSUPPORTED** — no native API. A PDF could theoretically be fetched as raw bytes via `web.get` and handed to `exec_prompt` only if the model backend accepts PDF bytes as an "image"-slot input, which is unverified and not implied by any type signature (`images: Sequence[bytes \| Image]` gives no format guarantee) — do not implement without an explicit hosted test proving the backend can even parse PDF bytes passed this way; treat as UNSUPPORTED until such a test exists |
| DOCUMENT — scanned/image-based document | Same path as "IMAGE (direct image URL)" above — a scanned document IS an image from GenVM's perspective | Same source | Same as IMAGE row | Same as IMAGE row | Same as IMAGE row | Same as IMAGE row | Same as IMAGE row | Same as IMAGE row | REQUIRES_HOSTED_STUDIONET_PROOF (functionally = IMAGE, not a distinct code path) |
| DOCUMENT — PNG/JPEG document | Identical to "IMAGE (direct image URL)" row — no distinction in the API between "an image" and "a document that happens to be a PNG" | Same source | Same | Same | Same | Same | Same | Same | REQUIRES_HOSTED_STUDIONET_PROOF (= IMAGE) |
| DOCUMENT — DOCX/office format | No native parser exists (same absence-of-primitive finding as PDF); DOCX is a zipped XML container, not renderable by `web.render` and not an image `exec_prompt` could plausibly interpret | Absence confirmed by source read | Confident absence | N/A | N/A | N/A | N/A | N/A | **UNSUPPORTED** |

## Corrected independent-validator-acquisition finding

The prior draft was right in spirit but vague. Now source-confirmed precisely: `gl.eq_principle.prompt_comparative(fn, principle)` (in `genlayer/gl/eq_principle.py`) works by having the **leader run `fn()` once**, and having **each validator independently run its own `validator_fn` closure**, which itself calls `fn()` again (so a validator that reaches this code path genuinely re-executes the nondet call — re-fetches the URL, re-renders, re-screenshots, re-runs the prompt — it does not receive and trust the leader's raw fetched content). The validator then sends `{leader_answer, validator_answer, principle}` to an `ExecPromptTemplate` LLM judgment (template `'EqComparative'`) and votes based on that judgment's boolean result. This is exactly the "frontend fetch is never proof" / "independent validator acquisition" property the product spec requires, and it is now backed by a source-code citation rather than a paraphrase of a doc page.

## What still requires hosted StudioNet proof (Stage 2/2A/7)

- That the exact rc-build API above matches what StudioNet chain 61999 currently runs (embedded-runtime version drift between this laptop's cached artifact and the live network is possible and must be checked, e.g. via a trivial deployed probe contract calling `gl.nondet.web.render` against a static test URL).
- That the model backend behind `exec_prompt(images=[...])` actually performs vision inference (returns text sensitive to image content) rather than silently ignoring the `images` list — this is the single most important IMAGE-modality proof and was not claimed as done here.
- Real disagreement/failure-mode behavior for screenshot-based `eq_principle.prompt_comparative` (different validators' screenshots of a dynamic page can legitimately differ even on a static-seeming page — must be tested, not assumed benign).

## Explicit non-guess statement

DOCUMENT (PDF, DOCX) stays UNSUPPORTED with high confidence, based on an exhaustive read of the embedded GenVM Python standard library's nondet I/O surface, not merely an absence in web docs. IMAGE (screenshot-derived or direct-fetch) is corrected from the earlier wrong BLOCKED classification to DOCUMENTED/REQUIRES_HOSTED_STUDIONET_PROOF — the API exists and is source-verified, but "the API exists" and "it is production-proven on StudioNet" are still different claims, and only the former is established here.
