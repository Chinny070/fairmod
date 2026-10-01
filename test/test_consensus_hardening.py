"""Targeted regression tests for FairMod's adjudication consensus policy.

`gltest.direct` executes the adjudication closure but does not implement the
hosted ``EqComparative`` leader/validator judge. These tests therefore pin the
binding policy supplied to that judge, while the direct execution test below
continues to prove the contract's fail-closed malformed-output transition.
They deliberately do not claim to simulate a hosted validator vote.
"""

import ast
import json
from pathlib import Path

from test.test_stage3 import _frozen_case


CONTRACT_PATH = Path(__file__).resolve().parent.parent / "contracts" / "fairmod.py"


def _adjudication_principle() -> str:
	"""Extract the literal passed by ``adjudicate_case`` to EqComparative."""
	tree = ast.parse(CONTRACT_PATH.read_text(encoding="utf-8"))
	method = next(
		node for node in ast.walk(tree)
		if isinstance(node, ast.FunctionDef) and node.name == "adjudicate_case"
	)
	assignment = next(
		node for node in method.body
		if isinstance(node, ast.Assign)
		and any(isinstance(target, ast.Name) and target.id == "principle" for target in node.targets)
	)
	return ast.literal_eval(assignment.value)


def test_consensus_policy_rejects_leader_flagged_validator_allowed() -> None:
	"""A verdict-only similarity cannot allow FLAGGED versus ALLOWED to agree."""
	principle = _adjudication_principle()
	assert "verdict must be exactly identical" in principle
	assert "ALLOWED is never equivalent to FLAGGED" in principle


def test_consensus_policy_rejects_different_flagged_rule_sets() -> None:
	"""FLAGGED/HARASSMENT and FLAGGED/SPAM remain materially different."""
	principle = _adjudication_principle()
	assert "violated_rule_ids must be the exact same set of Rule IDs" in principle
	assert "FLAGGED/HARASSMENT is not equivalent to FLAGGED/SPAM" in principle


def test_consensus_policy_rejects_partial_evidence_overlap() -> None:
	"""Different material evidence provenance must not silently finalize."""
	principle = _adjudication_principle()
	assert "evidence_used must be the exact same set of evidence IDs" in principle
	assert "Partial or material overlap of evidence_used is NOT sufficient" in principle


def test_consensus_policy_allows_prose_but_not_conflicting_material_facts() -> None:
	"""The policy retains semantic prose tolerance without making facts optional."""
	principle = _adjudication_principle()
	assert "same non-contradictory, decision-driving facts" in principle
	assert "Differences only in explanation wording" in principle
	assert "non-contradictory phrasing/detail" in principle


def test_malformed_model_output_still_fails_closed_to_needs_review(direct_deploy, direct_vm) -> None:
	"""Structured-output rejection remains an authoritative safe fallback."""
	contract, _community_id, case_id = _frozen_case(direct_deploy, "message")
	direct_vm.mock_llm(r".*", json.dumps({"verdict": "FLAGGED", "violated_rule_ids": "HARASSMENT"}))

	assert contract.adjudicate_case(case_id) == "NEEDS_REVIEW"
	case = contract.get_case(case_id)
	assert case["verdict"] == "NEEDS_REVIEW"
	assert case["needs_review_reason"] == "MALFORMED_MODEL_OUTPUT"
