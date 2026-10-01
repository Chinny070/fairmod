# FairMod Demo / Reviewer Flow

The text-evidence lifecycle through challenge resolution has now been exercised against the current canonical StudioNet deployment, and a fresh authoritative reread confirmed case `c0#0` is `FINAL`. The historical issue #50 invalid-contract failures were followed by successful deployment after correcting the Depends-header boundary. See `docs/CANONICAL_DEPLOYMENT_VERIFICATION.md` for transaction-level evidence. Web/image evidence and deliberately divergent leader/validator candidates were not rerun against the current canonical address in this pass; the earlier Stage 8C web/visual evidence belongs to its explicitly temporary test deployment.

## Why this demo needs GenLayer at all

The point to make concrete, not just assert: a keyword filter or a single centralized LLM API call could produce a verdict string too. What it *cannot* do is what steps 6-7 below actually exercise — multiple independent validators each re-executing the same evidence-acquisition and adjudication logic against the case's own frozen constitution, with their answers checked for material agreement (not identical wording) before a verdict is ever written to contract state. That is the thing worth demonstrating, not the verdict itself.

## Sequence

1. **Open/create a community.** Show `create_community`, then the Community Directory listing it — public, no wallet needed to browse.
2. **Inspect the constitution.** Show the Constitution tab: active version, Rule IDs, rule definitions. Point out that rule text is what the validators actually reason over — not a keyword list.
3. **Submit a moderation case.** Reporter (any address) calls `create_case` with real reported content. Show the case immediately readable by anyone, in `OPEN` state.
4. **Attach context and evidence.** Add a context item (background, not itself evidence). Submit at least one TEXT evidence item and, if the hosted path is live, one WEB_LINK evidence item pointing at a real, reachable page — narrate that this reference is not fetched by the demo's own browser; it is only fetched by GenLayer validators, independently, later.
5. **Freeze evidence.** `freeze_case` — show the evidence rows lock (`frozen: true`); attempting to submit further evidence now visibly fails.
6. **Trigger evidence acquisition** (if WEB_LINK/IMAGE evidence was submitted). `acquire_evidence` — narrate that this is the moment each validator independently fetches/renders the reference itself, not a shared cache.
7. **Request adjudication.** `adjudicate_case` — this is the centerpiece: narrate the four-section prompt structure (trusted procedure / frozen constitution / untrusted content / untrusted evidence), and that the equivalence principle requires validators to agree on verdict + cited rules, not exact wording.
8. **Inspect the structured verdict.** Show `verdict`, `violated_rule_ids`, `explanation`, `material_facts`, `evidence_used` — not a single badge, a real structured decision record.
9. **Inspect the receipt.** `get_moderation_receipt` — the content fingerprint, timestamps, and full decision trail together.
10. **File a challenge.** Show the challenge window, `file_challenge` with a real objection.
11. **Resolve the challenge.** `resolve_challenge` — narrate that this asks a *different* question (uphold vs. overturn given the objection), not a re-vote, and that the original decision is preserved unmutated even if overturned.
12. **Finalize.** Either via challenge resolution or the permissionless timeout path (`finalize_case`) — narrate the FairMod-application-FINAL vs. GenLayer-protocol-FINALIZED distinction explicitly here, since it's the exact place confusion would matter most.
13. **Show public history.** `get_community_cases` — the case is now part of the community's permanent, paginated public record.
14. **Show precedent (informational).** `get_case_precedents` for the same rule — narrate explicitly that this is shown for context only and is never read by any adjudication prompt.
15. **Run the Fairness Mirror.** `run_fairness_mirror` — narrate that this is a separate, non-authoritative consistency check that structurally cannot change the verdict, and show it rendered visually distinct from the binding decision in the frontend.

## Further demo prerequisites

- A currently queryable FairMod deployment; production currently points at the canonical address in `docs/CANONICAL_DEPLOYMENT_VERIFICATION.md`.
- A disposable wallet with StudioNet GEN, connected via the frontend (not the CLI, for the demo itself).
- At least one real, reachable public URL prepared in advance for the WEB_LINK evidence step, and ideally one image-bearing page for the visual-evidence step.
- Enough real elapsed time (or a legitimately long demo session) to show the 24h challenge-window boundary honestly, or an explicit narrated skip of that step with the boundary behavior described from the existing Direct Mode test coverage instead.

## Evidence boundary

The full sequence above is a demo plan, not a claim that every item was run against the current canonical address. Specifically, current-canonical live evidence covers the text-evidence moderation/challenge/finality/receipt/Fairness Mirror lifecycle; hosted web and visual acquisition evidence remains associated only with the separate Stage 8C temporary test deployment.
