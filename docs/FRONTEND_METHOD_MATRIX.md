# Stage 7 — Method-to-UI Integration Matrix

## Stage 7.1 update
All 30/30 methods are now intentionally represented through usable UI, not just the adapter layer. The six methods previously "adapter only" are now wired into the product:

- `grant_role`/`revoke_role` — Community detail's new **Administration** tab (`frontend/src/pages/community/AdministrationTab.tsx`), visible only to a connected wallet, gated to the community owner (contract-authoritative; frontend gating is convenience only per Stage 7 §20), with a target-account role lookup, a confirmation dialog before every grant/revoke, and the mandatory write→observe→reread pipeline.
- `create_constitution_draft`/`add_rule`/`activate_constitution` — a "Draft a new constitution version" disclosure inside the Constitution tab (`frontend/src/pages/community/ConstitutionAuthoringTab.tsx`), gated to OWNER/ADMIN, showing the current active version, the draft's accumulating rules, a Rule-ID format validator, and an explicit confirmation dialog before activation naming its irreversibility.
- `add_context` — Case detail's **Context** section (`frontend/src/components/ContextSection.tsx`), visually and semantically distinct from both Evidence and the Verdict, with an explanatory note that context is weighed by the adjudicator, not independently authoritative.

`get_case_state` remains the one method still reached only through the adapter rather than a separate UI control — see the table row below for why that is a deliberate, documented choice (every UI surface that needs case state already has the full `get_case` dict, so a second, narrower call would add a redundant network round trip with no new information).

All 30 public methods from `docs/fairmod_schema.json` (current deployed contract source SHA-256 `2ad077c7970b8ef09c3a1ba6ed5744e3c1ad4f68b56562c9f21f298de8e0c5be`), each accounted for. Method signatures remain compatible with the deployed 30-method schema.

| Method | V/W | Who can call (contract-enforced) | UI surface | Inputs | Output | Payable | Preconditions | Success state | Error state | Post-write reread | Test coverage |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `create_community` | W | anyone | `/communities/new` | name, metadata | community_id (via reread of `list_communities`) | No | none | new community list contains one more id than before | `INVALID_INPUT` | `list_communities` length +1 | adapter test + writeAndConfirm test |
| `get_community` | V | anyone | Community directory, Community detail header | community_id | dict | — | exists | renders | `PRECONDITION_FAILED` | — | adapter test |
| `list_communities` | V | anyone | Community directory | none | array | — | none | renders | `RPC_FAILURE` | — | used by CreateCommunity confirm |
| `grant_role` | W | community owner | Administration tab (AdministrationTab.tsx) | community_id, target, role | none | No | caller is owner | `get_role(target)` returns granted role | `ROLE_NOT_AUTHORIZED` | `get_role` | adapter test (exact arg order) |
| `revoke_role` | W | community owner | Administration tab | community_id, target | none | No | caller is owner | `get_role(target)` returns `NONE` | `ROLE_NOT_AUTHORIZED` | `get_role` | adapter boundary test + live in AdministrationTab |
| `get_role` | V | anyone | Community detail header (“your role”) | community_id, target | string | — | none | renders | `RPC_FAILURE` | — | used live in CommunityDetail |
| `create_constitution_draft` | W | OWNER/ADMIN | Constitution Authoring disclosure | community_id | version (int) | No | caller has role | new draft version exists | `ROLE_NOT_AUTHORIZED` | `get_constitution` | live in ConstitutionAuthoringTab |
| `add_rule` | W | OWNER/ADMIN | Constitution Authoring disclosure | community_id, version, rule fields | none | No | constitution is DRAFT | rule appears in `get_constitution` | `PRECONDITION_FAILED` / `INVALID_INPUT` | `get_constitution` | live in ConstitutionAuthoringTab, Rule-ID validated client-side |
| `activate_constitution` | W | OWNER/ADMIN | Constitution Authoring disclosure | community_id, version | none | No | DRAFT, ≥1 rule | `get_constitution` status becomes ACTIVE | `ROLE_NOT_AUTHORIZED` / `PRECONDITION_FAILED` | `get_constitution` | live in ConstitutionAuthoringTab, behind an explicit confirmation dialog |
| `get_constitution` | V | anyone | Constitution tab | community_id, version | dict | — | exists | renders rulebook | `PRECONDITION_FAILED` | — | live in CommunityDetail |
| `get_active_constitution_version` | V | anyone | Community detail, case creation eligibility | community_id | int | — | none | renders | `RPC_FAILURE` | — | live in CommunityDetail |
| `create_case` | W | anyone | Community Overview tab (“Submit a case”) | community_id, content | case_id | No | active constitution exists | new case reachable via `get_community_cases` | `PRECONDITION_FAILED` (no active constitution) / `INVALID_INPUT` | `list_communities`/case count | adapter pattern; UI shows tx hash, case_id resolved on reread |
| `get_case` | V | anyone | Case detail (core) | case_id | dict | — | exists | renders | `PRECONDITION_FAILED` | — | live everywhere in CaseDetail |
| `add_context` | W | anyone (case OPEN) | Case detail — Context section (ContextSection.tsx) | case_id, kind, content | none | No | case OPEN | context list grows | `PRECONDITION_FAILED` | `get_context` | live in CaseDetail |
| `get_context` | V | anyone | Case detail | case_id | array | — | none | renders | `RPC_FAILURE` | — | live in CaseDetail |
| `submit_evidence` | W | anyone (case OPEN) | Case detail — Evidence section | case_id, type, reference, category, representation | evidence_id | No | case OPEN | evidence list grows | `INVALID_INPUT` (bad URL/bounds) | `list_evidence` | live in CaseDetail; client-side URL preview via `previewEvidenceUrl` |
| `get_evidence` | V | anyone | Evidence row | case_id, evidence_id | dict | — | exists | renders | `PRECONDITION_FAILED` | — | live in CaseDetail |
| `list_evidence` | V | anyone | Evidence section | case_id | array | — | none | renders | `RPC_FAILURE` | — | live in CaseDetail |
| `acquire_evidence` | W | anyone (permissionless) | Evidence row — “Trigger acquisition” button on PENDING items | case_id, evidence_id | retrieval_status | No | case EVIDENCE_FROZEN, item not TEXT | evidence row's `retrieval_status` leaves PENDING | `EVIDENCE_UNAVAILABLE` | `get_evidence` | live in CaseDetail |
| `freeze_case` | W | reporter or community role-holder | Case detail lifecycle actions | case_id | none | No | case OPEN | `get_case_state` ≠ OPEN | `ROLE_NOT_AUTHORIZED` / `PRECONDITION_FAILED` | `get_case` | adapter pattern + writeAndConfirm test shape |
| `get_case_state` | V | anyone | (internal use — CaseDetail primarily reads full `get_case` instead, since it needs every field; `get_case_state` itself is exercised by the adapter but not separately UI-bound to avoid a redundant call) | case_id | string | — | none | — | — | — | adapter present (`getCaseState`), intentionally not separately wired — documented, not accidental |
| `adjudicate_case` | W | anyone (permissionless) | Case detail lifecycle actions | case_id | status | No | case EVIDENCE_FROZEN, no evidence PENDING | `get_case` shows DECIDED/NEEDS_REVIEW | `EVIDENCE_UNAVAILABLE` | `get_case` | live in CaseDetail |
| `file_challenge` | W | reporter or role-holder | Case detail lifecycle actions | case_id, reason | status | No | case DECIDED, before deadline | `get_case` shows CHALLENGED | `CHALLENGE_WINDOW_CLOSED` / `ROLE_NOT_AUTHORIZED` | `get_case` | live in CaseDetail |
| `resolve_challenge` | W | anyone (permissionless) | Case detail lifecycle actions | case_id | status | No | case CHALLENGED | `get_case` shows FINAL | — | `get_case` | live in CaseDetail |
| `finalize_case` | W | anyone (permissionless) | Case detail lifecycle actions | case_id | status | No | deadline passed | `get_case` shows FINAL | `FINALIZATION_NOT_READY` | `get_case` | live in CaseDetail |
| `get_moderation_receipt` | V | anyone | Case detail — Receipt section (FINAL only) | case_id | dict | — | exists | renders | `RPC_FAILURE` | — | live in CaseDetail |
| `get_community_cases` | V | anyone | Community Cases tab | community_id, offset, limit | array | — | bounded limit | renders paginated list | `INVALID_INPUT` (limit≥50) | — | live in CasesTab; boundary tested via BOUNDS constant |
| `get_community_stats` | V | anyone | Community Transparency tab | community_id | dict | — | none | renders counters | `RPC_FAILURE` | — | live in TransparencyTab |
| `get_case_precedents` | V | anyone | Case detail — Precedent section (FINAL only) | community_id, rule_id, limit | array | — | none | renders, clearly labeled non-authoritative | `RPC_FAILURE` | — | live in CaseDetail; adapter arg-order test |
| `run_fairness_mirror` | W | anyone (permissionless) | Case detail — Fairness Mirror section (FINAL only) | case_id | status | No | case FINAL | `fairness_mirror_status` set | `PRECONDITION_FAILED` | (re-fetch `get_case`) | live in CaseDetail |

## Intentionally not a primary button this stage

- `get_case_state`: subsumed by `get_case` in every UI surface that needs case state, to avoid two calls where one already returns everything. The adapter function exists and is directly tested; wiring a redundant UI call would add no information.
*(Stage 7.1: all six of these are now wired into usable UI — see the update note at the top of this file. No method remains adapter-only except `get_case_state`, documented above.)*
