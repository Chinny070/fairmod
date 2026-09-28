"""
FairMod Stage 1 direct (in-memory) tests.

Uses `gltest.direct` (the `gltest_direct` pytest plugin, part of the
installed `genlayer-test` 0.29.2 package) — a native Python contract
runner that executes the contract's real code directly against a
Foundry-style in-memory VM (`VMContext`), with NO WASM runtime, NO
Docker, and NO local/hosted node. This is the genuinely fast, official
"direct test" path referenced in the Stage 0/1 briefs, as opposed to
the `gltest.contracts` / `get_contract_factory` path used by the
official `football_bets` example, which drives a real localnet over
JSON-RPC and therefore requires `genlayer up` (Docker).

Category: PURE IN-MEMORY DIRECT TESTS. Not GLSim, not local-node
integration, not hosted integration. Confirmed by reading
`gltest/direct/vm.py` and `gltest/direct/loader.py` directly: contract
storage lives in an `InmemManager` (a plain Python dict-backed byte
store), `_genlayer_wasi` is replaced with a Python mock
(`gltest/direct/wasi_mock.py`), and the contract's `__init__`/methods
are invoked as ordinary Python calls — there is no subprocess, no
socket, no container involved anywhere in this path.

Stage 1 has no nondeterministic code, so none of `VMContext`'s
mock_web/mock_llm/run_validator cheatcodes are exercised here — there
is nothing to mock. Authorization failures and bound violations raise
a plain `Exception` from the contract's own `_require()` helper, which
this file asserts with `pytest.raises`.
"""

from pathlib import Path

import pytest

CONTRACT_PATH = Path(__file__).resolve().parent.parent / "contracts" / "fairmod.py"


def _deploy(direct_deploy):
	return direct_deploy(str(CONTRACT_PATH))


def _hex(addr):
	"""
	Normalize a gltest.direct test address to a hex string.

	`create_address()` (the source of the direct_alice/direct_bob/... fixtures)
	returns a real `genlayer.py.types.Address` once `genlayer` is already
	imported in the process, but falls back to raw bytes if called before any
	contract has been deployed in this test (i.e. before genlayer's first
	import) — both are observed depending on fixture/test ordering, so this
	normalizes either shape to the "0x..." string the contract's own
	`Address(target)` constructor expects.
	"""
	if hasattr(addr, 'as_hex'):
		return addr.as_hex
	return '0x' + addr.hex()


def _activate_simple_constitution(contract, cid):
	version = contract.create_constitution_draft(cid)
	contract.add_rule(
		cid, version, "HARASSMENT", "Harassment", "No harassment.", "conduct", [], False, "",
	)
	contract.activate_constitution(cid, version)
	return version


# ---------------------------------------------------------------------------
# COMMUNITY
# ---------------------------------------------------------------------------

def test_create_community(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("Test Community", "a description")
	info = contract.get_community(cid)
	assert info["name"] == "Test Community"
	assert info["status"] == "ACTIVE"
	assert info["active_constitution_version"] == 0


def test_create_community_no_collision(direct_deploy):
	contract = _deploy(direct_deploy)
	cid1 = contract.create_community("A", "")
	cid2 = contract.create_community("B", "")
	assert cid1 != cid2


def test_create_community_name_bounds(direct_deploy):
	contract = _deploy(direct_deploy)

	with pytest.raises(Exception):
		contract.create_community("x" * 81, "")  # MAX_NAME_LEN = 80

	cid = contract.create_community("x" * 80, "")  # exactly at the limit
	assert cid is not None

	with pytest.raises(Exception):
		contract.create_community("", "")


def test_community_isolation_wrong_id_rejected(direct_deploy):
	contract = _deploy(direct_deploy)
	contract.create_community("A", "")
	with pytest.raises(Exception):
		contract.get_community("c999")


# ---------------------------------------------------------------------------
# ROLES
# ---------------------------------------------------------------------------

def test_owner_can_grant_and_revoke(direct_deploy, direct_vm, direct_alice):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")

	contract.grant_role(cid, _hex(direct_alice), "MODERATOR")
	assert contract.get_role(cid, _hex(direct_alice)) == "MODERATOR"

	contract.revoke_role(cid, _hex(direct_alice))
	assert contract.get_role(cid, _hex(direct_alice)) == "NONE"


def test_unauthorized_grant_rejected(direct_deploy, direct_vm, direct_alice, direct_bob):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")  # owner = default sender

	with direct_vm.prank(direct_alice):  # alice is not the owner
		with pytest.raises(Exception):
			contract.grant_role(cid, _hex(direct_bob), "ADMIN")


def test_self_escalation_rejected(direct_deploy, direct_vm, direct_alice):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")

	with direct_vm.prank(direct_alice):  # alice is not the owner
		with pytest.raises(Exception):
			contract.grant_role(cid, _hex(direct_alice), "ADMIN")


def test_cross_community_authority_rejected(direct_deploy, direct_vm, direct_alice, direct_bob):
	contract = _deploy(direct_deploy)
	cid_a = contract.create_community("A", "")  # owned by default sender

	with direct_vm.prank(direct_alice):
		cid_b = contract.create_community("B", "")  # owned by alice

	# default sender owns A, not B: granting a role in B must fail.
	with pytest.raises(Exception):
		contract.grant_role(cid_b, _hex(direct_bob), "ADMIN")


def test_duplicate_grant_is_idempotent_not_an_error(direct_deploy, direct_alice):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")

	contract.grant_role(cid, _hex(direct_alice), "MODERATOR")
	contract.grant_role(cid, _hex(direct_alice), "MODERATOR")  # must NOT raise
	assert contract.get_role(cid, _hex(direct_alice)) == "MODERATOR"


def test_revoked_authority_cannot_act(direct_deploy, direct_vm, direct_alice):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")

	contract.grant_role(cid, _hex(direct_alice), "MODERATOR")
	contract.revoke_role(cid, _hex(direct_alice))

	with direct_vm.prank(direct_alice):
		# MODERATOR was never allowed to draft constitutions (OWNER/ADMIN only);
		# revocation must leave alice with no standing at all.
		with pytest.raises(Exception):
			contract.create_constitution_draft(cid)


# ---------------------------------------------------------------------------
# CONSTITUTIONS / STABLE RULE IDS
# ---------------------------------------------------------------------------

def test_constitution_draft_activate_pointer(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	version = _activate_simple_constitution(contract, cid)
	assert contract.get_active_constitution_version(cid) == version


@pytest.mark.parametrize("bad_id", [
	" HARASSMENT ", "Harassment", "harassment", "../../HARASSMENT",
	"HARASSMENT!", "", "HARASS MENT", "HARASSMENT\n",
])
def test_malformed_rule_id_rejected_not_normalized(direct_deploy, bad_id):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	version = contract.create_constitution_draft(cid)
	with pytest.raises(Exception):
		contract.add_rule(cid, version, bad_id, "Title", "Definition.", "", [], False, "")
	# And, crucially, it must not have been silently normalized and stored
	# under a different valid key either — the whole add_rule call reverts.
	snapshot = contract.get_constitution(cid, version)
	assert snapshot["rules"] == {}


@pytest.mark.parametrize("good_id", ["HARASSMENT", "SPAM", "MALICIOUS_LINK", "RULE_12", "A", "A" * 40])
def test_canonical_rule_id_accepted(direct_deploy, good_id):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	version = contract.create_constitution_draft(cid)
	contract.add_rule(cid, version, good_id, "Title", "Definition.", "", [], False, "")
	snapshot = contract.get_constitution(cid, version)
	assert good_id in snapshot["rules"]


def test_rule_id_over_max_length_rejected(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	version = contract.create_constitution_draft(cid)
	with pytest.raises(Exception):
		contract.add_rule(cid, version, "A" * 41, "Title", "Definition.", "", [], False, "")  # MAX_RULE_ID_LEN = 40


def test_duplicate_rule_id_rejected(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	version = contract.create_constitution_draft(cid)
	contract.add_rule(cid, version, "SPAM", "Spam", "No spam.", "", [], False, "")
	with pytest.raises(Exception):
		contract.add_rule(cid, version, "SPAM", "Spam2", "No spam v2.", "", [], False, "")


def test_mutation_after_activation_rejected(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	version = _activate_simple_constitution(contract, cid)

	with pytest.raises(Exception):
		contract.add_rule(cid, version, "SPAM", "Spam", "No spam.", "", [], False, "")

	with pytest.raises(Exception):
		contract.activate_constitution(cid, version)


def test_old_version_preserved_after_new_version_activated(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	v1 = _activate_simple_constitution(contract, cid)
	v1_before = contract.get_constitution(cid, v1)
	assert v1_before["status"] == "ACTIVE"

	v2 = contract.create_constitution_draft(cid)
	contract.add_rule(cid, v2, "HARASSMENT", "Harassment v2", "A different definition.", "conduct", [], False, "")
	contract.activate_constitution(cid, v2)

	# v1 is now RETIRED (by design: exactly one ACTIVE version at a time —
	# see activate_constitution's docstring), but its RULE CONTENT — the
	# actual thing "preservation" is about — must be byte-for-byte unchanged.
	v1_after = contract.get_constitution(cid, v1)
	assert v1_after["status"] == "RETIRED"
	assert v1_after["retired_at"] != ""
	assert v1_after["rules"] == v1_before["rules"]
	assert v1_after["rules"]["HARASSMENT"]["definition"] == "No harassment."
	assert contract.get_active_constitution_version(cid) == v2


def test_stable_logical_rule_id_different_definitions_across_versions(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	v1 = _activate_simple_constitution(contract, cid)

	v2 = contract.create_constitution_draft(cid)
	contract.add_rule(cid, v2, "HARASSMENT", "Harassment v2", "Updated definition.", "conduct", [], False, "")
	contract.activate_constitution(cid, v2)

	d1 = contract.get_constitution(cid, v1)["rules"]["HARASSMENT"]["definition"]
	d2 = contract.get_constitution(cid, v2)["rules"]["HARASSMENT"]["definition"]
	assert d1 == "No harassment."
	assert d2 == "Updated definition."


# ---------------------------------------------------------------------------
# CASES
# ---------------------------------------------------------------------------

def test_case_requires_active_constitution(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	with pytest.raises(Exception):
		contract.create_case(cid, "reported message")


def test_case_binds_constitution_version_permanently(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	v1 = _activate_simple_constitution(contract, cid)

	case_id = contract.create_case(cid, "reported message")
	assert contract.get_case(case_id)["constitution_version"] == v1

	v2 = contract.create_constitution_draft(cid)
	contract.add_rule(cid, v2, "SPAM", "Spam", "No spam.", "", [], False, "")
	contract.activate_constitution(cid, v2)

	assert contract.get_case(case_id)["constitution_version"] == v1  # unchanged


def test_case_content_bounds(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	with pytest.raises(Exception):
		contract.create_case(cid, "x" * 4001)


def test_case_cross_community_isolation(direct_deploy, direct_vm, direct_alice):
	contract = _deploy(direct_deploy)
	cid_a = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid_a)

	with direct_vm.prank(direct_alice):
		cid_b = contract.create_community("B", "")
		_activate_simple_constitution(contract, cid_b)
		case_b = contract.create_case(cid_b, "case in B")

	case_a = contract.create_case(cid_a, "case in A")
	assert contract.get_case(case_a)["community_id"] == cid_a
	assert contract.get_case(case_b)["community_id"] == cid_b
	assert case_a != case_b


# ---------------------------------------------------------------------------
# CONTEXT
# ---------------------------------------------------------------------------

def test_context_add_and_bounds(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(cid, "msg")

	for i in range(10):  # MAX_CONTEXT_ITEMS = 10
		contract.add_context(case_id, "parent", f"context {i}")

	with pytest.raises(Exception):
		contract.add_context(case_id, "parent", "one too many")


def test_context_wrong_case_rejected(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	contract.create_case(cid, "msg")

	with pytest.raises(Exception):
		contract.add_context("nonexistent#0", "parent", "x")


def test_context_immutable_after_freeze(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(cid, "msg")
	contract.freeze_case(case_id)

	with pytest.raises(Exception):
		contract.add_context(case_id, "parent", "too late")


# ---------------------------------------------------------------------------
# EVIDENCE
# ---------------------------------------------------------------------------

def test_submit_each_evidence_type_record(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(cid, "msg")

	text_id = contract.submit_evidence(case_id, "TEXT", "some text", "")
	link_id = contract.submit_evidence(case_id, "WEB_LINK", "https://example.com", "general-web")
	doc_id = contract.submit_evidence(case_id, "DOCUMENT", "https://example.com/doc.html", "general-web")
	img_id = contract.submit_evidence(case_id, "IMAGE", "https://example.com/pic.png", "general-web")

	for eid, expected_type, expected_status in (
		(text_id, "TEXT", "NOT_APPLICABLE"),
		(link_id, "WEB_LINK", "PENDING"),
		(doc_id, "DOCUMENT", "PENDING"),
		(img_id, "IMAGE", "PENDING"),
	):
		e = contract.get_evidence(case_id, eid)
		assert e["evidence_type"] == expected_type
		assert e["retrieval_status"] == expected_status
		assert e["frozen"] is False


def test_evidence_bounds(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(cid, "msg")

	for i in range(20):  # MAX_EVIDENCE_PER_CASE = 20
		contract.submit_evidence(case_id, "TEXT", f"evidence {i}", "")

	with pytest.raises(Exception):
		contract.submit_evidence(case_id, "TEXT", "one too many", "")

	with pytest.raises(Exception):
		contract.submit_evidence(case_id, "WEB_LINK", "https://example.com/" + ("a" * 2000), "")


def test_evidence_wrong_case_and_cross_case_reference_rejected(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	case_a = contract.create_case(cid, "msg a")
	case_b = contract.create_case(cid, "msg b")

	eid_a = contract.submit_evidence(case_a, "TEXT", "evidence for A", "")

	with pytest.raises(Exception):
		contract.get_evidence(case_b, eid_a)  # cross-case reference must fail

	with pytest.raises(Exception):
		contract.submit_evidence("nonexistent#0", "TEXT", "x", "")


def test_evidence_immutable_after_freeze(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(cid, "msg")
	contract.submit_evidence(case_id, "TEXT", "before freeze", "")
	contract.freeze_case(case_id)

	with pytest.raises(Exception):
		contract.submit_evidence(case_id, "TEXT", "after freeze", "")


# ---------------------------------------------------------------------------
# FREEZE
# ---------------------------------------------------------------------------

def test_legal_freeze_by_reporter(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(cid, "msg")

	contract.freeze_case(case_id)
	assert contract.get_case_state(case_id) == "EVIDENCE_FROZEN"


def test_unauthorized_freeze_rejected(direct_deploy, direct_vm, direct_alice, direct_bob):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)

	with direct_vm.prank(direct_alice):
		case_id = contract.create_case(cid, "msg")  # alice is the reporter

	with direct_vm.prank(direct_bob):  # bob is neither reporter nor a role holder
		with pytest.raises(Exception):
			contract.freeze_case(case_id)


def test_repeated_freeze_rejected(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(cid, "msg")

	contract.freeze_case(case_id)
	with pytest.raises(Exception):
		contract.freeze_case(case_id)


def test_freeze_produces_immutable_snapshot(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(cid, "msg")
	eid = contract.submit_evidence(case_id, "TEXT", "evidence", "")

	contract.freeze_case(case_id)

	e = contract.get_evidence(case_id, eid)
	assert e["frozen"] is True
	case = contract.get_case(case_id)
	assert case["frozen_at"] != ""
	assert case["content"] == "msg"  # unchanged


# ---------------------------------------------------------------------------
# STATE MACHINE
# ---------------------------------------------------------------------------

def _static_schema():
	"""
	Extract the contract's schema via a fresh subprocess, not an in-process
	import. Calling `genvm_linter` in-process (inside the same pytest run as
	`gltest.direct` tests) was found to corrupt shared global state — it sets
	`GENERATING_DOCS=true` and leaves a stub `genlayer.gl` module resident in
	`sys.modules` for the rest of the process, causing every later `direct_vm`
	test in the same session to see `gl.message_raw` as the literal `...`
	placeholder instead of the real message dict. A subprocess avoids this
	entirely — see docs/STAGE_1_VERIFICATION.md.
	"""
	import json
	import subprocess
	import sys

	result = subprocess.run(
		[
			sys.executable, "-c",
			"import json, sys; from genvm_linter.validate.validator import extract_schema; "
			"print(json.dumps(extract_schema(sys.argv[1])))",
			str(CONTRACT_PATH),
		],
		capture_output=True, text=True, check=True,
	)
	return json.loads(result.stdout)


def test_no_public_method_can_force_decided_or_final(direct_deploy):
	schema = _static_schema()
	method_names = set(schema["methods"].keys())
	forbidden = {
		"set_state", "force_decided", "force_final", "decide_case",
		"finalize_case", "set_verdict", "mark_decided", "mark_final",
	}
	assert method_names.isdisjoint(forbidden)

	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	_activate_simple_constitution(contract, cid)
	case_id = contract.create_case(cid, "msg")
	assert contract.get_case_state(case_id) == "OPEN"
	contract.freeze_case(case_id)
	assert contract.get_case_state(case_id) == "EVIDENCE_FROZEN"


# ---------------------------------------------------------------------------
# TIME
# ---------------------------------------------------------------------------

def test_timestamps_are_captured_and_not_user_forgeable(direct_deploy):
	contract = _deploy(direct_deploy)
	cid = contract.create_community("A", "")
	info = contract.get_community(cid)
	assert info["created_at"]  # non-empty deterministic timestamp captured

	schema = _static_schema()
	for name, m in schema["methods"].items():
		for pname, _ in m["params"]:
			assert "time" not in pname.lower() and "_at" not in pname.lower()


def test_warp_cheatcode_does_not_affect_this_generations_message_raw(direct_deploy, direct_vm):
	"""
	Documents a real, verified limitation rather than asserting a false claim.

	`VMContext.warp()`/`_refresh_gl_message()` (gltest/direct/vm.py) only
	refreshes `gl.message`'s sender/origin/value/chain_id and
	`gl.message_raw['sender_address'/'origin_address']` — it does not update
	`gl.message_raw['datetime']` for this pinned SDK generation (Generation A,
	see docs/STAGE_1_VERIFICATION.md). Since this contract's `_now()` reads
	`gl.message_raw['datetime']` (the only field this generation exposes it
	on), `warp()` has no effect on captured timestamps in direct-mode tests.
	This is a test-tooling characteristic to know about, not a contract bug —
	real GenVM's own deterministic transaction time is not sourced from this
	cheatcode either way. `test_timestamps_are_captured_and_not_user_forgeable`
	is what actually verifies "caller cannot forge protocol time".
	"""
	contract = _deploy(direct_deploy)
	direct_vm.warp("2030-01-01T00:00:00Z")
	cid = contract.create_community("A", "")
	info = contract.get_community(cid)
	assert not info["created_at"].startswith("2030-01-01")


# ---------------------------------------------------------------------------
# STORAGE / RUNTIME INVARIANT CHECK (closure Section 6)
# ---------------------------------------------------------------------------

def test_storage_runtime_invariants(direct_deploy, direct_vm, direct_alice):
	"""One consolidated pass over every invariant listed in the closure task."""
	contract = _deploy(direct_deploy)

	# Counters increment exactly once per call, IDs do not alias.
	cid_a = contract.create_community("A", "")
	cid_b = contract.create_community("B", "")
	assert cid_a == "c0" and cid_b == "c1"

	v1a = contract.create_constitution_draft(cid_a)
	v1b = contract.create_constitution_draft(cid_b)
	assert v1a == 1 and v1b == 1  # independent per-community version counters, no aliasing

	# Community A state cannot affect Community B.
	contract.add_rule(cid_a, v1a, "SPAM", "Spam", "No spam.", "", [], False, "")
	contract.activate_constitution(cid_a, v1a)
	assert contract.get_active_constitution_version(cid_a) == v1a
	assert contract.get_active_constitution_version(cid_b) == 0  # untouched by A's activation

	# Role revocation persists (not just within one call).
	contract.grant_role(cid_a, _hex(direct_alice), "MODERATOR")
	assert contract.get_role(cid_a, _hex(direct_alice)) == "MODERATOR"
	contract.revoke_role(cid_a, _hex(direct_alice))
	assert contract.get_role(cid_a, _hex(direct_alice)) == "NONE"
	# Re-read again (fresh view call) to make sure it's a persisted write, not a cached value.
	assert contract.get_role(cid_a, _hex(direct_alice)) == "NONE"

	# Activated constitutions remain immutable; activation pointer correct;
	# superseding activation does not rewrite the previous version.
	before = contract.get_constitution(cid_a, v1a)
	v2a = contract.create_constitution_draft(cid_a)
	contract.add_rule(cid_a, v2a, "SPAM", "Spam v2", "Different.", "", [], False, "")
	contract.activate_constitution(cid_a, v2a)
	assert contract.get_active_constitution_version(cid_a) == v2a  # pointer moved to v2a
	after = contract.get_constitution(cid_a, v1a)
	assert after["rules"] == before["rules"]  # v1a's own rule content untouched
	assert after["status"] == "RETIRED"

	# case.constitution_version remains unchanged across later activations.
	case_id = contract.create_case(cid_a, "msg")
	assert contract.get_case(case_id)["constitution_version"] == v2a
	v3a = contract.create_constitution_draft(cid_a)
	contract.add_rule(cid_a, v3a, "SPAM", "Spam v3", "Different again.", "", [], False, "")
	contract.activate_constitution(cid_a, v3a)
	assert contract.get_case(case_id)["constitution_version"] == v2a  # unchanged

	# Evidence belongs to exactly one case.
	other_case = contract.create_case(cid_a, "other msg")
	eid = contract.submit_evidence(case_id, "TEXT", "evidence", "")
	assert eid in contract.list_evidence(case_id)
	assert eid not in contract.list_evidence(other_case)

	# Freeze persists; all frozen objects remain immutable.
	contract.freeze_case(case_id)
	assert contract.get_case_state(case_id) == "EVIDENCE_FROZEN"
	assert contract.get_evidence(case_id, eid)["frozen"] is True
	with pytest.raises(Exception):
		contract.submit_evidence(case_id, "TEXT", "too late", "")
	with pytest.raises(Exception):
		contract.add_context(case_id, "parent", "too late")

	# Failed-write atomicity: an add_rule call that reverts partway through
	# (duplicate rule_id, caught after canonical-format validation but before
	# the rule is stored) must not have mutated rule_order.
	order_before = len(contract.get_constitution(cid_a, v3a)["rules"])
	with pytest.raises(Exception):
		contract.add_rule(cid_a, v3a, "SPAM", "dup", "dup.", "", [], False, "")  # SPAM already exists in v3a
	order_after = len(contract.get_constitution(cid_a, v3a)["rules"])
	assert order_after == order_before  # no partial mutation from the failed call
