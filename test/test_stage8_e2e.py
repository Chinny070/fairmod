"""
FairMod Stage 8 — full end-to-end lifecycle verification.

Same execution path as every prior stage's test file (gltest.direct, pure
in-memory, no WASM/Docker/hosted node). Stages 1-6 already built extensive
per-feature adversarial coverage (see test_fairmod.py, test_stage2.py,
test_stage3.py, test_stage4.py, test_stage5.py, and
docs/STAGE_6_ADVERSARIAL_AUDIT.md) — this file's distinct contribution is a
single coherent narrative exercising the ENTIRE FairMod lifecycle in one
continuous flow (community -> constitution -> case -> context -> evidence ->
freeze -> adjudication -> challenge -> resolution -> finalization -> receipt
-> precedent -> Fairness Mirror -> transparency counters -> pagination),
proving the pieces compose correctly together, not just individually.

Per Stage 8 §7: this is local/direct-mode verification only. It proves
nothing about real hosted StudioNet validator behavior (real
gl.nondet.web.get, real cross-validator consensus, real GenVM
finality) — that remains BLOCKED by genlayerlabs/genvm-manager#50, honestly
marked as such in docs/FRONTEND_HOSTED_VERIFICATION_MATRIX.md and
docs/STAGE_8_HOSTED_STUDIONET_TEST_PLAN.md, never claimed here.
"""

import json

import pytest

from test.test_fairmod import _deploy, _static_schema
from test.test_stage3 import _llm
from test.test_stage4 import _challenge_llm, _set_time


def test_full_lifecycle_flagged_challenged_overturned(direct_deploy, direct_vm):
	"""
	The complete lifecycle in one narrative, verifying state/actors/inputs at
	every transition (Stage 8 §8's required PRECONDITION/ACTOR/INPUT/STATE
	BEFORE/ACTION/RESULT/STATE AFTER format, expressed as inline assertions).
	"""
	contract = _deploy(direct_deploy)

	# --- COMMUNITY CREATION ---
	# PRECONDITION: none. ACTOR: any address. STATE BEFORE: no communities.
	assert contract.list_communities() == []
	cid = contract.create_community("Riverside Forum", "A neighborhood discussion board.")
	# STATE AFTER: exactly one community, owned by the deploying/calling address.
	assert contract.list_communities() == [cid]
	community = contract.get_community(cid)
	assert community["case_counter"] == 0
	assert community["active_constitution_version"] == 0

	# --- ROLE MANAGEMENT ---
	# PRECONDITION: caller must be owner. ACTOR: owner. INPUT: target, role.
	assert contract.get_role(cid, community["owner"]) == "OWNER"
	moderator_addr = "0x2222222222222222222222222222222222222222"
	assert contract.get_role(cid, moderator_addr) == "NONE"
	contract.grant_role(cid, moderator_addr, "MODERATOR")
	assert contract.get_role(cid, moderator_addr) == "MODERATOR"
	# Idempotent re-grant is a no-op, not an error.
	contract.grant_role(cid, moderator_addr, "MODERATOR")
	assert contract.get_role(cid, moderator_addr) == "MODERATOR"

	# --- CONSTITUTION DRAFT + RULE ADDITION ---
	# PRECONDITION: caller has OWNER/ADMIN. STATE BEFORE: no active constitution.
	version = contract.create_constitution_draft(cid)
	assert version == 1
	contract.add_rule(
		cid, version, "HARASSMENT", "Harassment",
		"No targeted abusive conduct against another user.", "conduct", [], False, "",
	)
	contract.add_rule(
		cid, version, "SPAM", "Spam",
		"No repeated unsolicited promotional content.", "conduct", [], False, "",
	)
	constitution = contract.get_constitution(cid, version)
	assert constitution["status"] == "DRAFT"
	assert set(constitution["rules"].keys()) == {"HARASSMENT", "SPAM"}

	# --- CONSTITUTION ACTIVATION ---
	# ACTION: activate. STATE AFTER: community's active version updates; constitution status ACTIVE.
	contract.activate_constitution(cid, version)
	assert contract.get_active_constitution_version(cid) == 1
	assert contract.get_constitution(cid, version)["status"] == "ACTIVE"

	# --- CASE CREATION ---
	# PRECONDITION: community has an active constitution. STATE BEFORE: case_counter 0.
	case_id = contract.create_case(cid, "You're a worthless idiot, everyone should attack your account.")
	assert case_id == f"{cid}#0"
	case = contract.get_case(case_id)
	assert case["state"] == "OPEN"
	assert case["constitution_version"] == 1  # bound at creation time
	assert contract.get_community(cid)["case_counter"] == 1

	# --- CONTEXT ADDITION ---
	contract.add_context(case_id, "prior-warning", "This user was warned about similar conduct last month.")
	assert len(contract.get_context(case_id)) == 1

	# --- EVIDENCE ADDITION (TEXT — deterministic, no acquisition step) ---
	evidence_id = contract.submit_evidence(case_id, "TEXT", "Screenshot transcript: same abusive message repeated three times.", "chat-log")
	assert evidence_id == f"{case_id}:e0"
	ev = contract.get_evidence(case_id, evidence_id)
	assert ev["retrieval_status"] == "ACQUIRED"  # TEXT is immediately settled
	assert ev["frozen"] is False

	# --- EVIDENCE FREEZE (via freeze_case) ---
	# PRECONDITION: case OPEN. ACTOR: reporter or community role-holder.
	contract.freeze_case(case_id)
	assert contract.get_case_state(case_id) == "EVIDENCE_FROZEN"
	assert contract.get_evidence(case_id, evidence_id)["frozen"] is True

	# INVALID REPEAT: freezing twice is rejected, not silently re-applied.
	with pytest.raises(Exception):
		contract.freeze_case(case_id)

	# UNAUTHORIZED ATTEMPT downstream of freeze: no further evidence may be added.
	with pytest.raises(Exception):
		contract.submit_evidence(case_id, "TEXT", "late evidence", "")

	# --- ADJUDICATION (permissionless) ---
	# STATE BEFORE: EVIDENCE_FROZEN, no verdict.
	direct_vm.mock_llm(r".*", _llm("FLAGGED", ["HARASSMENT"], "Directly targets and calls for pile-on against another user."))
	status = contract.adjudicate_case(case_id)
	assert status == "DECIDED"
	case = contract.get_case(case_id)
	assert case["verdict"] == "FLAGGED"
	assert case["violated_rule_ids"] == ["HARASSMENT"]
	assert case["challenge_deadline"] != ""

	# INVALID REPEAT: re-adjudicating an already-DECIDED case is an idempotent no-op, never a re-decision.
	direct_vm.clear_mocks()
	direct_vm.mock_llm(r".*", _llm("ALLOWED"))  # if this were consulted, verdict would flip — it must not be
	status_again = contract.adjudicate_case(case_id)
	assert status_again == "DECIDED"
	assert contract.get_case(case_id)["verdict"] == "FLAGGED"  # unchanged

	# --- CHALLENGE ---
	# PRECONDITION: DECIDED, within window. ACTOR: reporter or role-holder.
	contract.file_challenge(case_id, "This was heated criticism, not coordinated harassment.")
	assert contract.get_case_state(case_id) == "CHALLENGED"

	# UNAUTHORIZED/INVALID REPEAT: a second challenge on the same case is rejected.
	with pytest.raises(Exception):
		contract.file_challenge(case_id, "second attempt")

	# --- CHALLENGE RESOLUTION -> OVERTURN ---
	direct_vm.clear_mocks()
	direct_vm.mock_llm(r".*", _challenge_llm("OVERTURN", "ALLOWED", []))
	status = contract.resolve_challenge(case_id)
	assert status == "FINAL"
	case = contract.get_case(case_id)
	assert case["challenge_outcome"] == "OVERTURN"
	assert case["final_verdict"] == "ALLOWED"
	assert case["verdict"] == "FLAGGED"  # ORIGINAL decision immutable even though overturned

	# INVALID REPEAT: resolving an already-FINAL case is an idempotent no-op.
	status_again = contract.resolve_challenge(case_id)
	assert status_again == "FINAL"

	# --- RECEIPT ---
	receipt = contract.get_moderation_receipt(case_id)
	assert receipt["content_fingerprint"] != ""
	assert receipt["verdict"] == "FLAGGED"
	assert receipt["final_verdict"] == "ALLOWED"
	assert receipt["challenge_outcome"] == "OVERTURN"

	# --- HISTORY / PAGINATION ---
	page = contract.get_community_cases(cid, 0, 10)
	assert len(page) == 1
	assert page[0]["case_id"] == case_id

	# --- PRECEDENT (non-authoritative; this overturned-to-ALLOWED case is NOT precedent for HARASSMENT since final_verdict is ALLOWED with no rule ids) ---
	precedents = contract.get_case_precedents(cid, "HARASSMENT", 20)
	assert precedents == []  # correctly excluded: final_verdict ALLOWED carries no rule citation

	# --- FAIRNESS MIRROR (non-authoritative) ---
	direct_vm.clear_mocks()
	direct_vm.mock_llm(r".*", json.dumps({
		"consistency": "CONSISTENT",
		"explanation": "No constitutionally-irrelevant cue was material to the outcome.",
		"material_basis": "",
	}))
	fm_status = contract.run_fairness_mirror(case_id)
	assert fm_status == "CONSISTENT"
	final_case = contract.get_case(case_id)
	assert final_case["final_verdict"] == "ALLOWED"  # Fairness Mirror never mutated the binding decision
	assert final_case["verdict"] == "FLAGGED"

	# --- TRANSPARENCY COUNTERS ---
	stats = contract.get_community_stats(cid)
	assert stats["total_cases"] == 1
	assert stats["total_initial_flagged"] == 1
	assert stats["total_challenged"] == 1
	assert stats["total_overturned"] == 1
	assert stats["total_finalized"] == 1
	assert stats["total_final_allowed"] == 1
	assert stats["total_final_flagged"] == 0
	assert stats["total_final_undetermined"] == 0


def test_full_lifecycle_needs_review_timeout_to_undetermined(direct_deploy, direct_vm):
	"""Second narrative: the NEEDS_REVIEW -> permissionless-timeout -> UNDETERMINED path, untouched by the first test."""
	contract = _deploy(direct_deploy)
	cid = contract.create_community("Second Community", "")
	version = contract.create_constitution_draft(cid)
	contract.add_rule(cid, version, "SPAM", "Spam", "No unsolicited promotional content.", "", [], False, "")
	contract.activate_constitution(cid, version)
	case_id = contract.create_case(cid, "ambiguous borderline message")
	contract.freeze_case(case_id)

	direct_vm.mock_llm(r".*", _llm("NEEDS_REVIEW"))
	status = contract.adjudicate_case(case_id)
	assert status == "NEEDS_REVIEW"
	case = contract.get_case(case_id)
	assert case["review_deadline"] != ""

	# Too early: finalize_case must reject before the review deadline passes.
	with pytest.raises(Exception):
		contract.finalize_case(case_id)

	_set_time(case["review_deadline"])
	status = contract.finalize_case(case_id)
	assert status == "FINAL"
	final_case = contract.get_case(case_id)
	assert final_case["final_verdict"] == "UNDETERMINED"

	stats = contract.get_community_stats(cid)
	assert stats["total_initial_needs_review"] == 1
	assert stats["total_final_undetermined"] == 1
	assert stats["total_challenged"] == 0  # never challenged — NEEDS_REVIEW has no challenge path


def test_multi_community_full_isolation_across_entire_lifecycle(direct_deploy, direct_vm):
	"""
	Two communities, same Rule ID reused deliberately, run through the full
	lifecycle independently — every read for community A must be unaffected
	by community B's state at every stage (Stage 8 §9).
	"""
	contract = _deploy(direct_deploy)

	cid_a = contract.create_community("Community A", "")
	cid_b = contract.create_community("Community B", "")

	for cid in (cid_a, cid_b):
		v = contract.create_constitution_draft(cid)
		contract.add_rule(cid, v, "HARASSMENT", "Harassment", "No targeted abuse.", "", [], False, "")
		contract.activate_constitution(cid, v)

	case_a = contract.create_case(cid_a, "abusive content in community A")
	case_b = contract.create_case(cid_b, "unrelated content in community B")

	# Role granted in A must not exist in B for the same address.
	target = "0x3333333333333333333333333333333333333333"
	contract.grant_role(cid_a, target, "MODERATOR")
	assert contract.get_role(cid_a, target) == "MODERATOR"
	assert contract.get_role(cid_b, target) == "NONE"

	contract.freeze_case(case_a)
	contract.freeze_case(case_b)

	direct_vm.mock_llm(r".*", _llm("FLAGGED", ["HARASSMENT"]))
	contract.adjudicate_case(case_a)
	assert contract.get_case(case_b)["state"] == "EVIDENCE_FROZEN"  # B untouched by A's adjudication

	direct_vm.clear_mocks()
	direct_vm.mock_llm(r".*", _llm("ALLOWED"))
	contract.adjudicate_case(case_b)

	deadline_a = contract.get_case(case_a)["challenge_deadline"]
	_set_time(deadline_a)
	contract.finalize_case(case_a)
	# B's case is independently DECIDED with its own, later deadline — finalizing A must not finalize B.
	assert contract.get_case_state(case_b) == "DECIDED"

	# History/pagination must never leak across communities.
	assert [c["case_id"] for c in contract.get_community_cases(cid_a, 0, 10)] == [case_a]
	assert [c["case_id"] for c in contract.get_community_cases(cid_b, 0, 10)] == [case_b]

	# Precedent for the shared HARASSMENT rule id must be scoped per community
	# even though B's own case never finalized with that rule cited.
	assert [p["case_id"] for p in contract.get_case_precedents(cid_a, "HARASSMENT", 20)] == [case_a]
	assert contract.get_case_precedents(cid_b, "HARASSMENT", 20) == []

	# Counters must be independent.
	stats_a = contract.get_community_stats(cid_a)
	stats_b = contract.get_community_stats(cid_b)
	assert stats_a["total_finalized"] == 1
	assert stats_b["total_finalized"] == 0
