# FairMod Demo / Reviewer Flow (prepared for when StudioNet hosting unblocks)

This is a prepared sequence, not a record of results. No step below has been run against a real StudioNet deployment — that remains blocked by `genlayerlabs/genvm-manager#50` (see `docs/STUDIONET_61999_CLEAN_PROBE_RESULT.md`, `docs/STAGE_8_HOSTED_STUDIONET_TEST_PLAN.md`). Every claim of "works" in this document today refers only to local Direct Mode (`gltest.direct`) or mocked-adapter frontend verification, never real GenLayer consensus.

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

## Demo prerequisites (once hosted deployment is unblocked)

- A temporary FairMod deployment at a known address, `VITE_FAIRMOD_CONTRACT_ADDRESS` pointed at it.
- A disposable wallet with StudioNet GEN, connected via the frontend (not the CLI, for the demo itself).
- At least one real, reachable public URL prepared in advance for the WEB_LINK evidence step, and ideally one image-bearing page for the visual-evidence step.
- Enough real elapsed time (or a legitimately long demo session) to show the 24h challenge-window boundary honestly, or an explicit narrated skip of that step with the boundary behavior described from the existing Direct Mode test coverage instead.

## What this document is not

Not a script that has been run. Not a claim that any step above currently works against real StudioNet consensus. Every "works" claim in this repository about the moderation lifecycle beyond this point is backed only by Direct Mode (`gltest.direct`) tests — real, but local and mocked at the nondeterministic-call boundary, per every prior stage's own disclosure.
