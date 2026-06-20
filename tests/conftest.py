import pytest
from pathlib import Path
from gltest.direct.sdk_loader import setup_sdk_paths

@pytest.fixture(autouse=True)
def init_paths():
    setup_sdk_paths(Path("contracts/sentinel.py"), None)

@pytest.fixture
def sentinel_contract(direct_deploy, direct_vm, accounts):
    # Set the default sender to accounts[0]
    from genlayer.py.types import Address
    deployer = accounts[0]
    direct_vm.sender = Address(deployer.address)
    contract = direct_deploy("contracts/sentinel.py")
    return contract
