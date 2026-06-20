import pytest
import json
import hashlib
from unittest.mock import patch

@patch("genlayer.gl.eq_principle.prompt_comparative")
def test_reputation_progression_and_incentives(mock_comparative, sentinel_contract, direct_vm, accounts):
    from genlayer.py.types import Address
    brand = accounts[0]
    hunter = accounts[1]
    
    # Set report stake to 100000 wei
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 0
    sentinel_contract.set_report_stake(100000)
    
    # 1. Setup a bounty
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 50000000
    bounty_id = sentinel_contract.create_bounty("Acme Wallet", "Official site acme.xyz", 500000)
    
    # 2. Check initial profile (should be BRONZE)
    profile = json.loads(sentinel_contract.get_hunter_profile(hunter.address))
    assert profile["tier"] == "BRONZE"
    assert profile["score"] == 0
    
    # 3. Simulate 10 confirmed reports to promote hunter to GOLD (need 10 * 100 = 1000 score)
    for i in range(10):
        # Hunter submits report
        direct_vm.sender = Address(hunter.address)
        direct_vm.value = 100000 # pays 100% stake since BRONZE/SILVER
        report_id = sentinel_contract.submit_report(bounty_id, f"http://fake-acme{i}.xyz")
        
        # Mock LLM verdict
        dt_str = direct_vm._datetime or ""
        token_input = f"{report_id}:{dt_str}"
        expected_canary = hashlib.sha256(token_input.encode('utf-8')).hexdigest()[:8]
        
        mock_comparative.return_value = json.dumps({
            "verdict": {
                "canary": expected_canary,
                "is_scam": True,
                "scam_type": "phishing",
                "severity": 100,
                "confidence": 100,
                "reasoning": "Lookalike domain name",
                "perspectives": {"forensic": "", "skeptic": "", "legal": ""}
            },
            "sources": []
        })
        
        # Evaluate
        sentinel_contract.evaluate_report(report_id)
        
    # Check new profile (should be SILVER or GOLD depending on score)
    # 10 confirmed * 100 = 1000 score, which should promote hunter to SILVER (threshold >= 1000)
    profile = json.loads(sentinel_contract.get_hunter_profile(hunter.address))
    assert profile["score"] == 1000
    assert profile["tier"] == "SILVER"
    assert profile["confirmed"] == 10
    
    # Let's check leaderboard
    leaderboard = json.loads(sentinel_contract.get_leaderboard_top10())
    assert len(leaderboard) == 1
    assert leaderboard[0]["address"] == sentinel_contract._normalize_address(hunter.address)
    assert leaderboard[0]["score"] == 1000
    
    # 4. Now promote hunter to GOLD (need 30 confirmed = 3000 score)
    for i in range(10, 30):
        direct_vm.sender = Address(hunter.address)
        direct_vm.value = 100000
        report_id = sentinel_contract.submit_report(bounty_id, f"http://fake-acme{i}.xyz")
        
        dt_str = direct_vm._datetime or ""
        token_input = f"{report_id}:{dt_str}"
        expected_canary = hashlib.sha256(token_input.encode('utf-8')).hexdigest()[:8]
        mock_comparative.return_value = json.dumps({
            "verdict": {
                "canary": expected_canary,
                "is_scam": True,
                "scam_type": "phishing",
                "severity": 100,
                "confidence": 100,
                "reasoning": "Lookalike domain",
                "perspectives": {"forensic": "", "skeptic": "", "legal": ""}
            },
            "sources": []
        })
        sentinel_contract.evaluate_report(report_id)
        
    profile = json.loads(sentinel_contract.get_hunter_profile(hunter.address))
    assert profile["score"] == 3000
    assert profile["tier"] == "GOLD"
    
    # 5. Verify GOLD tier advantages
    # A. Stake discount (GOLD gets 50% discount)
    # report_stake is 100000, so GOLD should only need 50000 stake.
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 50000 # pays 50%
    # This call should succeed because 50000 is enough for GOLD
    report_id = sentinel_contract.submit_report(bounty_id, "http://fake-acme-discount.xyz")
    report_data = json.loads(sentinel_contract.get_report(report_id))
    assert int(report_data["stake"]) == 50000
    
    # B. Payout boost (GOLD gets +5% boost from platform fee)
    # gross reward: base_reward * severity / 100 = 500000 * 100 / 100 = 500000
    # normal platform fee (2.5%): 500000 * 250 / 10000 = 12500
    # GOLD boost (5%): 500000 * 500 / 10000 = 25000. But wait! Boost cannot exceed platform fee.
    # So boost is capped at 12500. New fee is 12500 - 12500 = 0.
    # Net reward should be gross - fee = 500000 - 0 = 500000.
    # Let's test this:
    dt_str = direct_vm._datetime or ""
    token_input = f"{report_id}:{dt_str}"
    expected_canary = hashlib.sha256(token_input.encode('utf-8')).hexdigest()[:8]
    mock_comparative.return_value = json.dumps({
        "verdict": {
            "canary": expected_canary,
            "is_scam": True,
            "scam_type": "phishing",
            "severity": 100,
            "confidence": 100,
            "reasoning": "Lookalike domain",
            "perspectives": {"forensic": "", "skeptic": "", "legal": ""}
        },
        "sources": []
    })
    
    # Reset pending balances
    direct_vm.sender = Address(hunter.address)
    sentinel_contract.withdraw()
    
    # Evaluate
    sentinel_contract.evaluate_report(report_id)
    
    # Hunter gets net + stake = 500000 + 50000 = 550000
    hunter_bal = sentinel_contract.get_pending_balance(hunter.address)
    assert int(hunter_bal) == 550000
