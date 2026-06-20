import pytest
import json
import hashlib
from unittest.mock import patch

@patch("genlayer.gl.eq_principle.prompt_comparative")
def test_file_appeal_validation(mock_comparative, sentinel_contract, direct_vm, accounts):
    from genlayer.py.types import Address
    brand = accounts[0]
    hunter = accounts[1]
    other = accounts[2]
    
    # 1. Setup report stake
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 0
    sentinel_contract.set_report_stake(150000)
    
    # 2. Create bounty
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 2000000
    bounty_id = sentinel_contract.create_bounty("Acme Corp", "Official site acme.xyz", 400000)
    
    # 3. Hunter submits report
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 150000
    report_id = sentinel_contract.submit_report(bounty_id, "https://fake-acme.xyz")
    
    # 4. Try to appeal PENDING report (should fail)
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 150000
    with pytest.raises(Exception) as exc:
        sentinel_contract.file_appeal(report_id)
    assert "Report is not eligible for appeal" in str(exc.value)

    # 5. Evaluate to make it NEEDS_REVIEW (confidence < 60)
    dt_str = direct_vm._datetime or ""
    token_input = f"{report_id}:{dt_str}"
    expected_canary = hashlib.sha256(token_input.encode('utf-8')).hexdigest()[:8]
    mock_comparative.return_value = json.dumps({
        "verdict": {
            "canary": expected_canary,
            "is_scam": False,
            "scam_type": "none",
            "severity": 0,
            "confidence": 40,
            "reasoning": "Uncertain verdict, needs manual look.",
            "perspectives": {"forensic": "", "skeptic": "", "legal": ""}
        },
        "sources": []
    })
    sentinel_contract.evaluate_report(report_id)
    
    # Check report status is indeed NEEDS_REVIEW
    report_data = json.loads(sentinel_contract.get_report(report_id))
    assert report_data["status"] == "NEEDS_REVIEW"
    
    # 6. Try to appeal by unauthorized caller (should fail)
    direct_vm.sender = Address(other.address)
    direct_vm.value = 150000
    with pytest.raises(Exception) as exc:
        sentinel_contract.file_appeal(report_id)
    assert "Only the hunter who submitted the report can appeal" in str(exc.value)
    
    # 7. Try to appeal with wrong fee (should fail)
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 100000 # too low
    with pytest.raises(Exception) as exc:
        sentinel_contract.file_appeal(report_id)
    assert "Appeal fee must be exactly equal to the original report stake" in str(exc.value)

    # 8. Successful appeal filing
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 150000
    appeal_id = sentinel_contract.file_appeal(report_id)
    
    assert appeal_id == "0"
    
    # Check report status is now APPEALED
    report_data = json.loads(sentinel_contract.get_report(report_id))
    assert report_data["status"] == "APPEALED"
    
    # Check appeal record
    appeal_data = json.loads(sentinel_contract.get_appeal(appeal_id))
    assert appeal_data["appeal_id"] == appeal_id
    assert appeal_data["report_id"] == report_id
    assert appeal_data["status"] == "PENDING"
    assert int(appeal_data["fee"]) == 150000
    assert appeal_data["original_status"] == "NEEDS_REVIEW"


@patch("genlayer.gl.eq_principle.prompt_comparative")
def test_evaluate_appeal_overturned_needs_review(mock_comparative, sentinel_contract, direct_vm, accounts):
    from genlayer.py.types import Address
    brand = accounts[0]
    hunter = accounts[1]
    
    # Setup stake, bounty, and report
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 0
    sentinel_contract.set_report_stake(100000)
    
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 10000000
    bounty_id = sentinel_contract.create_bounty("Acme Corp", "Official site acme.xyz", 1000000)
    
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 100000
    report_id = sentinel_contract.submit_report(bounty_id, "https://fake-acme.xyz")
    
    # Evaluate to NEEDS_REVIEW
    dt_str = direct_vm._datetime or ""
    expected_canary = hashlib.sha256(f"{report_id}:{dt_str}".encode('utf-8')).hexdigest()[:8]
    mock_comparative.return_value = json.dumps({
        "verdict": {
            "canary": expected_canary,
            "is_scam": False,
            "scam_type": "none",
            "severity": 0,
            "confidence": 50,
            "reasoning": "Awaiting manual review",
            "perspectives": {"forensic": "", "skeptic": "", "legal": ""}
        },
        "sources": []
    })
    sentinel_contract.evaluate_report(report_id)
    
    # Hunter files appeal
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 100000
    appeal_id = sentinel_contract.file_appeal(report_id)
    
    # Clear mock
    mock_comparative.reset_mock()
    
    # Re-evaluate appeal: Overturn to CONFIRMED (is_scam = True, severity = 80)
    dt_str = direct_vm._datetime or ""
    expected_appeal_canary = hashlib.sha256(f"appeal:{appeal_id}:{dt_str}".encode('utf-8')).hexdigest()[:8]
    mock_comparative.return_value = json.dumps({
        "verdict": {
            "canary": expected_appeal_canary,
            "is_scam": True,
            "scam_type": "phishing",
            "severity": 80,
            "confidence": 95,
            "reasoning": "Definitely a scam domain",
            "perspectives": {"forensic": "", "skeptic": "", "legal": ""}
        }
    })
    
    sentinel_contract.evaluate_appeal(appeal_id)
    
    # Verify report status is CONFIRMED and payout calculated
    report_data = json.loads(sentinel_contract.get_report(report_id))
    assert report_data["status"] == "CONFIRMED"
    assert int(report_data["severity"]) == 80
    
    # Verify appeal status is OVERTURNED
    appeal_data = json.loads(sentinel_contract.get_appeal(appeal_id))
    assert appeal_data["status"] == "OVERTURNED"
    
    # Calculate payout: gross = 1000000 * 80 / 100 = 800000
    # platform fee (2.5%) = 800000 * 250 / 10000 = 20000
    # hunter is BRONZE, no boost. fee = 20000, net = 780000
    # refund: original_stake (100000) + appeal_fee (100000) + net (780000) = 980000
    hunter_bal = sentinel_contract.get_pending_balance(hunter.address)
    assert int(hunter_bal) == 980000
    
    # Verify reputation adjusted: conf +1, rej 0
    profile = json.loads(sentinel_contract.get_hunter_profile(hunter.address))
    assert profile["confirmed"] == 1
    assert profile["rejected"] == 0
    assert profile["score"] == 100


@patch("genlayer.gl.eq_principle.prompt_comparative")
def test_evaluate_appeal_overturned_rejected(mock_comparative, sentinel_contract, direct_vm, accounts):
    from genlayer.py.types import Address
    brand = accounts[0]
    hunter = accounts[1]
    
    # Setup stake, bounty, and report
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 0
    sentinel_contract.set_report_stake(100000)
    
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 10000000
    bounty_id = sentinel_contract.create_bounty("Acme Corp", "Official site acme.xyz", 1000000)
    
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 100000
    report_id = sentinel_contract.submit_report(bounty_id, "https://fake-acme.xyz")
    
    # Evaluate to REJECTED (is_scam = False, confidence = 100)
    dt_str = direct_vm._datetime or ""
    expected_canary = hashlib.sha256(f"{report_id}:{dt_str}".encode('utf-8')).hexdigest()[:8]
    mock_comparative.return_value = json.dumps({
        "verdict": {
            "canary": expected_canary,
            "is_scam": False,
            "scam_type": "none",
            "severity": 0,
            "confidence": 100,
            "reasoning": "Not a scam",
            "perspectives": {"forensic": "", "skeptic": "", "legal": ""}
        },
        "sources": []
    })
    sentinel_contract.evaluate_report(report_id)
    
    # Confirm hunter got penalized
    profile = json.loads(sentinel_contract.get_hunter_profile(hunter.address))
    assert profile["rejected"] == 1
    assert profile["score"] == 0 # capped at 0 minimum
    
    # Hunter files appeal
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 100000
    appeal_id = sentinel_contract.file_appeal(report_id)
    
    # Re-evaluate appeal: Overturn to CONFIRMED (is_scam = True, severity = 100)
    dt_str = direct_vm._datetime or ""
    expected_appeal_canary = hashlib.sha256(f"appeal:{appeal_id}:{dt_str}".encode('utf-8')).hexdigest()[:8]
    mock_comparative.return_value = json.dumps({
        "verdict": {
            "canary": expected_appeal_canary,
            "is_scam": True,
            "scam_type": "phishing",
            "severity": 100,
            "confidence": 100,
            "reasoning": "Lookalike impersonation",
            "perspectives": {"forensic": "", "skeptic": "", "legal": ""}
        }
    })
    
    sentinel_contract.evaluate_appeal(appeal_id)
    
    # Verify report status is CONFIRMED
    report_data = json.loads(sentinel_contract.get_report(report_id))
    assert report_data["status"] == "CONFIRMED"
    
    # Verify reputation corrected: conf +1, rej -1 (so 0)
    profile = json.loads(sentinel_contract.get_hunter_profile(hunter.address))
    assert profile["confirmed"] == 1
    assert profile["rejected"] == 0
    assert profile["score"] == 100


@patch("genlayer.gl.eq_principle.prompt_comparative")
def test_evaluate_appeal_upheld_needs_review(mock_comparative, sentinel_contract, direct_vm, accounts):
    from genlayer.py.types import Address
    brand = accounts[0]
    hunter = accounts[1]
    
    # Setup stake, bounty, and report
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 0
    sentinel_contract.set_report_stake(100000)
    
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 10000000
    bounty_id = sentinel_contract.create_bounty("Acme Corp", "Official site acme.xyz", 1000000)
    
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 100000
    report_id = sentinel_contract.submit_report(bounty_id, "https://fake-acme.xyz")
    
    # Evaluate to NEEDS_REVIEW
    dt_str = direct_vm._datetime or ""
    expected_canary = hashlib.sha256(f"{report_id}:{dt_str}".encode('utf-8')).hexdigest()[:8]
    mock_comparative.return_value = json.dumps({
        "verdict": {
            "canary": expected_canary,
            "is_scam": False,
            "scam_type": "none",
            "severity": 0,
            "confidence": 50,
            "reasoning": "Uncertain outcome",
            "perspectives": {"forensic": "", "skeptic": "", "legal": ""}
        },
        "sources": []
    })
    sentinel_contract.evaluate_report(report_id)
    
    # Hunter files appeal
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 100000
    appeal_id = sentinel_contract.file_appeal(report_id)
    
    # Re-evaluate appeal: Uphold (is_scam = False)
    dt_str = direct_vm._datetime or ""
    expected_appeal_canary = hashlib.sha256(f"appeal:{appeal_id}:{dt_str}".encode('utf-8')).hexdigest()[:8]
    mock_comparative.return_value = json.dumps({
        "verdict": {
            "canary": expected_appeal_canary,
            "is_scam": False,
            "scam_type": "none",
            "severity": 0,
            "confidence": 100,
            "reasoning": "Not a scam",
            "perspectives": {"forensic": "", "skeptic": "", "legal": ""}
        }
    })
    
    sentinel_contract.evaluate_appeal(appeal_id)
    
    # Verify report status is now REJECTED
    report_data = json.loads(sentinel_contract.get_report(report_id))
    assert report_data["status"] == "REJECTED"
    
    # Verify appeal status is UPHELD
    appeal_data = json.loads(sentinel_contract.get_appeal(appeal_id))
    assert appeal_data["status"] == "UPHELD"
    
    # Verify reputation adjusted: rej +1, conf 0
    profile = json.loads(sentinel_contract.get_hunter_profile(hunter.address))
    assert profile["confirmed"] == 0
    assert profile["rejected"] == 1
    assert profile["score"] == 0
    
    # Verify hunter got 0 refund
    hunter_bal = sentinel_contract.get_pending_balance(hunter.address)
    assert int(hunter_bal) == 0
