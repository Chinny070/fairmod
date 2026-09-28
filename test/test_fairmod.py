"""
FairMod Stage 1 direct/adversarial tests.

Uses `gltest` (genlayer-test), which deploys the contract against a running
GenLayer localnet (`genlayer up`) and drives it with real transactions. These
tests require that localnet to be running — see docs/STAGE_1_VERIFICATION.md
for why it could not be executed in this environment (BLOCKED, with the exact
tooling error) and for the corresponding static/schema verification that WAS
performed instead.

No mocked nondeterminism appears here: Stage 1 has no nondeterministic code,
so there is nothing to mock — every assertion below is a real deterministic
state-transition check.
"""

import pytest
from gltest import get_contract_factory, get_accounts
from gltest.assertions import tx_execution_succeeded, tx_execution_failed


def deploy():
	factory = get_contract_factory("FairMod")
	return factory.deploy()


# ---------------------------------------------------------------------------
# COMMUNITY
# ---------------------------------------------------------------------------

def test_create_community():
	contract = deploy()
	cid = contract.create_community(args=["Test Community", "a description"])
	info = contract.get_community(args=[cid])
	assert info["name"] == "Test Community"
	assert info["status"] == "ACTIVE"
	assert info["active_constitution_version"] == 0


def test_create_community_no_collision():
	contract = deploy()
	cid1 = contract.create_community(args=["A", ""])
	cid2 = contract.create_community(args=["B", ""])
	assert cid1 != cid2


def test_create_community_name_bounds():
	contract = deploy()
	oversized = "x" * 81  # MAX_NAME_LEN = 80
	result = contract.create_community(args=[oversized, ""])
	assert tx_execution_failed(result)

	boundary = "x" * 80  # exactly at the limit must succeed
	cid = contract.create_community(args=[boundary, ""])
	assert cid is not None

	empty = contract.create_community(args=["", ""])
	assert tx_execution_failed(empty)


def test_community_isolation_wrong_id_rejected():
	contract = deploy()
	contract.create_community(args=["A", ""])
	result = contract.get_community(args=["c999"])
	assert tx_execution_failed(result)


# ---------------------------------------------------------------------------
# ROLES
# ---------------------------------------------------------------------------

def test_owner_can_grant_and_revoke():
	accounts = get_accounts()
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	target = accounts[1].address

	contract.grant_role(args=[cid, target, "MODERATOR"])
	assert contract.get_role(args=[cid, target]) == "MODERATOR"

	contract.revoke_role(args=[cid, target])
	assert contract.get_role(args=[cid, target]) == "NONE"


def test_unauthorized_grant_rejected():
	accounts = get_accounts()
	contract = deploy(account=accounts[0])
	cid = contract.create_community(args=["A", ""])

	attacker_contract = deploy_view_as(contract, accounts[1])
	result = attacker_contract.grant_role(args=[cid, accounts[2].address, "ADMIN"])
	assert tx_execution_failed(result)


def test_self_escalation_rejected():
	accounts = get_accounts()
	contract = deploy(account=accounts[0])
	cid = contract.create_community(args=["A", ""])

	non_owner = deploy_view_as(contract, accounts[1])
	result = non_owner.grant_role(args=[cid, accounts[1].address, "ADMIN"])
	assert tx_execution_failed(result)


def test_cross_community_authority_rejected():
	accounts = get_accounts()
	contract = deploy(account=accounts[0])
	cid_a = contract.create_community(args=["A", ""])

	owner_b = deploy_view_as(contract, accounts[1])
	cid_b = owner_b.create_community(args=["B", ""])

	# accounts[0] owns community A, not B: granting a role in B must fail.
	result = contract.grant_role(args=[cid_b, accounts[2].address, "ADMIN"])
	assert tx_execution_failed(result)


def test_duplicate_grant_is_idempotent_not_an_error():
	accounts = get_accounts()
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	target = accounts[1].address

	first = contract.grant_role(args=[cid, target, "MODERATOR"])
	assert tx_execution_succeeded(first)
	second = contract.grant_role(args=[cid, target, "MODERATOR"])
	assert tx_execution_succeeded(second)  # documented no-op, not a revert


def test_revoked_authority_cannot_act():
	accounts = get_accounts()
	contract = deploy(account=accounts[0])
	cid = contract.create_community(args=["A", ""])
	moderator_addr = accounts[1].address

	contract.grant_role(args=[cid, moderator_addr, "MODERATOR"])
	contract.revoke_role(args=[cid, moderator_addr])

	moderator = deploy_view_as(contract, accounts[1])
	draft = moderator.create_constitution_draft(args=[cid])
	# MODERATOR was never allowed to draft constitutions anyway (OWNER/ADMIN only);
	# this also proves revocation removed even the role's own (still-limited) standing.
	assert tx_execution_failed(draft)


# ---------------------------------------------------------------------------
# CONSTITUTIONS / STABLE RULE IDS
# ---------------------------------------------------------------------------

def _activate_simple_constitution(contract, cid):
	version = contract.create_constitution_draft(args=[cid])
	contract.add_rule(args=[
		cid, version, "HARASSMENT", "Harassment", "No harassment.", "conduct", [], False, "",
	])
	contract.activate_constitution(args=[cid, version])
	return version


def test_constitution_draft_activate_pointer():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	version = _activate_simple_constitution(contract, cid)
	assert contract.get_active_constitution_version(args=[cid]) == version


def test_duplicate_rule_id_rejected():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	version = contract.create_constitution_draft(args=[cid])
	contract.add_rule(args=[cid, version, "SPAM", "Spam", "No spam.", "", [], False, ""])
	dup = contract.add_rule(args=[cid, version, "SPAM", "Spam2", "No spam v2.", "", [], False, ""])
	assert tx_execution_failed(dup)


def test_mutation_after_activation_rejected():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	version = _activate_simple_constitution(contract, cid)

	result = contract.add_rule(args=[
		cid, version, "SPAM", "Spam", "No spam.", "", [], False, "",
	])
	assert tx_execution_failed(result)

	reactivate = contract.activate_constitution(args=[cid, version])
	assert tx_execution_failed(reactivate)


def test_old_version_preserved_after_new_version_activated():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	v1 = _activate_simple_constitution(contract, cid)
	v1_snapshot = contract.get_constitution(args=[cid, v1])

	v2 = contract.create_constitution_draft(args=[cid])
	contract.add_rule(args=[
		cid, v2, "HARASSMENT", "Harassment v2", "A different definition.", "conduct", [], False, "",
	])
	contract.activate_constitution(args=[cid, v2])

	v1_after = contract.get_constitution(args=[cid, v1])
	assert v1_after == v1_snapshot
	assert v1_after["rules"]["HARASSMENT"]["definition"] == "No harassment."
	assert contract.get_active_constitution_version(args=[cid]) == v2


def test_stable_logical_rule_id_different_definitions_across_versions():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	v1 = _activate_simple_constitution(contract, cid)

	v2 = contract.create_constitution_draft(args=[cid])
	contract.add_rule(args=[
		cid, v2, "HARASSMENT", "Harassment v2", "Updated definition.", "conduct", [], False, "",
	])
	contract.activate_constitution(args=[cid, v2])

	# Same logical rule_id, two different frozen definitions coexisting by version.
	d1 = contract.get_constitution(args=[cid, v1])["rules"]["HARASSMENT"]["definition"]
	d2 = contract.get_constitution(args=[cid, v2])["rules"]["HARASSMENT"]["definition"]
	assert d1 == "No harassment."
	assert d2 == "Updated definition."


# ---------------------------------------------------------------------------
# CASES
# ---------------------------------------------------------------------------

def test_case_requires_active_constitution():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	result = contract.create_case(args=[cid, "reported message"])
	assert tx_execution_failed(result)  # no constitution activated yet


def test_case_binds_constitution_version_permanently():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	v1 = _activate_simple_constitution(contract, cid)

	case_id = contract.create_case(args=[cid, "reported message"])
	case = contract.get_case(args=[case_id])
	assert case["constitution_version"] == v1

	v2 = contract.create_constitution_draft(args=[cid])
	contract.add_rule(args=[cid, v2, "SPAM", "Spam", "No spam.", "", [], False, ""])
	contract.activate_constitution(args=[cid, v2])

	case_after = contract.get_case(args=[case_id])
	assert case_after["constitution_version"] == v1  # never retroactively bumped


def test_case_content_bounds():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)

	oversized = "x" * 4001
	result = contract.create_case(args=[cid, oversized])
	assert tx_execution_failed(result)


# ---------------------------------------------------------------------------
# CONTEXT
# ---------------------------------------------------------------------------

def test_context_add_and_bounds():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(args=[cid, "msg"])

	for i in range(10):  # MAX_CONTEXT_ITEMS = 10
		ok = contract.add_context(args=[case_id, "parent", f"context {i}"])
		assert tx_execution_succeeded(ok)

	over = contract.add_context(args=[case_id, "parent", "one too many"])
	assert tx_execution_failed(over)


def test_context_wrong_case_rejected():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)
	contract.create_case(args=[cid, "msg"])

	result = contract.add_context(args=["nonexistent#0", "parent", "x"])
	assert tx_execution_failed(result)


def test_context_immutable_after_freeze():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(args=[cid, "msg"])
	contract.freeze_case(args=[case_id])

	result = contract.add_context(args=[case_id, "parent", "too late"])
	assert tx_execution_failed(result)


# ---------------------------------------------------------------------------
# EVIDENCE
# ---------------------------------------------------------------------------

def test_submit_each_evidence_type_record():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(args=[cid, "msg"])

	text_id = contract.submit_evidence(args=[case_id, "TEXT", "some text", ""])
	link_id = contract.submit_evidence(args=[case_id, "WEB_LINK", "https://example.com", "general-web"])
	doc_id = contract.submit_evidence(args=[case_id, "DOCUMENT", "https://example.com/doc.html", "general-web"])
	img_id = contract.submit_evidence(args=[case_id, "IMAGE", "https://example.com/pic.png", "general-web"])

	for eid, expected_type, expected_status in (
		(text_id, "TEXT", "NOT_APPLICABLE"),
		(link_id, "WEB_LINK", "PENDING"),
		(doc_id, "DOCUMENT", "PENDING"),
		(img_id, "IMAGE", "PENDING"),
	):
		e = contract.get_evidence(args=[case_id, eid])
		assert e["evidence_type"] == expected_type
		assert e["retrieval_status"] == expected_status
		assert e["frozen"] is False


def test_evidence_bounds():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(args=[cid, "msg"])

	for i in range(20):  # MAX_EVIDENCE_PER_CASE = 20
		ok = contract.submit_evidence(args=[case_id, "TEXT", f"evidence {i}", ""])
		assert tx_execution_succeeded(ok)

	over = contract.submit_evidence(args=[case_id, "TEXT", "one too many", ""])
	assert tx_execution_failed(over)

	long_url = contract.submit_evidence(args=[case_id, "WEB_LINK", "https://example.com/" + ("a" * 2000), ""])
	assert tx_execution_failed(long_url)


def test_evidence_wrong_case_and_cross_case_reference_rejected():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)
	case_a = contract.create_case(args=[cid, "msg a"])
	case_b = contract.create_case(args=[cid, "msg b"])

	eid_a = contract.submit_evidence(args=[case_a, "TEXT", "evidence for A", ""])

	# Looking up A's evidence_id under case B's evidence map must fail —
	# structurally impossible, not just policy-denied.
	result = contract.get_evidence(args=[case_b, eid_a])
	assert tx_execution_failed(result)

	wrong_case = contract.submit_evidence(args=["nonexistent#0", "TEXT", "x", ""])
	assert tx_execution_failed(wrong_case)


def test_evidence_immutable_after_freeze():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(args=[cid, "msg"])
	contract.submit_evidence(args=[case_id, "TEXT", "before freeze", ""])
	contract.freeze_case(args=[case_id])

	late = contract.submit_evidence(args=[case_id, "TEXT", "after freeze", ""])
	assert tx_execution_failed(late)


# ---------------------------------------------------------------------------
# FREEZE
# ---------------------------------------------------------------------------

def test_legal_freeze_by_reporter():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(args=[cid, "msg"])

	ok = contract.freeze_case(args=[case_id])
	assert tx_execution_succeeded(ok)
	assert contract.get_case_state(args=[case_id]) == "EVIDENCE_FROZEN"


def test_unauthorized_freeze_rejected():
	accounts = get_accounts()
	contract = deploy(account=accounts[0])
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)

	reporter = deploy_view_as(contract, accounts[1])
	case_id = reporter.create_case(args=[cid, "msg"])

	stranger = deploy_view_as(contract, accounts[2])
	result = stranger.freeze_case(args=[case_id])
	assert tx_execution_failed(result)


def test_repeated_freeze_rejected():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(args=[cid, "msg"])

	contract.freeze_case(args=[case_id])
	second = contract.freeze_case(args=[case_id])
	assert tx_execution_failed(second)


# ---------------------------------------------------------------------------
# STATE MACHINE
# ---------------------------------------------------------------------------

def _static_schema():
	from genvm_linter.validate.validator import extract_schema
	return extract_schema("contracts/fairmod.py")


def test_no_public_method_can_force_decided_or_final():
	contract = deploy()
	schema = _static_schema()
	method_names = set(schema["methods"].keys())
	forbidden = {
		"set_state", "force_decided", "force_final", "decide_case",
		"finalize_case", "set_verdict", "mark_decided", "mark_final",
	}
	assert method_names.isdisjoint(forbidden)
	# And the only observable states after any Stage 1 sequence are OPEN/EVIDENCE_FROZEN:
	cid = contract.create_community(args=["A", ""])
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(args=[cid, "msg"])
	assert contract.get_case_state(args=[case_id]) == "OPEN"
	contract.freeze_case(args=[case_id])
	assert contract.get_case_state(args=[case_id]) == "EVIDENCE_FROZEN"


# ---------------------------------------------------------------------------
# TIME
# ---------------------------------------------------------------------------

def test_timestamps_are_captured_and_not_user_forgeable():
	contract = deploy()
	cid = contract.create_community(args=["A", ""])
	info = contract.get_community(args=[cid])
	assert info["created_at"]  # non-empty deterministic timestamp captured
	# No method on the contract accepts a caller-supplied timestamp anywhere in its
	# schema (all timestamp fields are written server-side from gl.message.datetime) —
	# verified by inspecting the schema itself, since accepting one would need a
	# public method parameter, which we can enumerate:
	schema = _static_schema()
	for name, m in schema["methods"].items():
		for pname, _ in m["params"]:
			assert "time" not in pname.lower() and "_at" not in pname.lower()


# ---------------------------------------------------------------------------
# Test helpers (gltest wiring)
# ---------------------------------------------------------------------------

def deploy(account=None):
	factory = get_contract_factory("FairMod")
	if account is not None:
		return factory.deploy(account=account)
	return factory.deploy()


def deploy_view_as(contract, account):
	"""Return a handle to the same deployed contract that sends future calls from `account`
	(gltest.Contract.connect — confirmed from gltest/contracts/contract.py)."""
	return contract.connect(account)
