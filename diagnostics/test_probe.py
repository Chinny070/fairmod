from pathlib import Path

CONTRACT_PATH = Path(__file__).resolve().parent / "studionet_runtime_probe.py"


def test_probe_deploys_and_returns_expected_value(direct_deploy):
	contract = direct_deploy(str(CONTRACT_PATH))
	assert contract.get_probe() == "FAIRMOD_RUNTIME_OK"
