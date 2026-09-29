"""
Local direct-mode verification for diagnostics/studionet_61999_clean_probe.py
(Stage 6.5 StudioNet 61999 toolchain cleanroom). Pure in-memory gltest.direct,
same execution path as test/test_fairmod.py — proves the minimal probe
deploys and returns its fixed literal locally, under the corrected
(genvm-linter==0.11.0, repo-local genlayer CLI 0.39.1) toolchain. This is NOT
a StudioNet deployment proof — deployment remains manual, per instruction.
"""

from pathlib import Path

CONTRACT_PATH = Path(__file__).resolve().parent / "studionet_61999_clean_probe.py"


def test_clean_probe_returns_expected_literal(direct_deploy):
	contract = direct_deploy(str(CONTRACT_PATH))
	assert contract.get_probe() == "FAIRMOD_61999_CLEANROOM_OK"
