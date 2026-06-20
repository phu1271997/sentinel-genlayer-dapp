import pytest
import json
import hashlib
from unittest.mock import patch

def test_domain_extraction(sentinel_contract):
    # Test valid extractions
    assert sentinel_contract._extract_domain("Official site is acme.xyz; official X @acmewallet") == "acme.xyz"
    assert sentinel_contract._extract_domain("Visit us at https://nebula.fi/swap to see NFTs") == "nebula.fi"
    assert sentinel_contract._extract_domain("Official site: pixels.com.") == "pixels.com"
    # Test invalid domain text
    assert sentinel_contract._extract_domain("We never DM seed phrases") == ""

@patch("genlayer.gl.eq_principle.prompt_comparative")
def test_consensus_needs_review_on_low_confidence(mock_comparative, sentinel_contract, direct_vm, accounts):
    from genlayer.py.types import Address
    brand = accounts[0]
    hunter = accounts[1]
    
    # 1. Setup bounty and report
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 1000000
    bounty_id = sentinel_contract.create_bounty("Acme Wallet", "Official site acme.xyz", 500000)
    
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 200000
    report_id = sentinel_contract.submit_report(bounty_id, "http://unsure-acme.xyz")
    
    # Calculate canary
    dt_str = direct_vm._datetime or ""
    token_input = f"{report_id}:{dt_str}"
    expected_canary = hashlib.sha256(token_input.encode('utf-8')).hexdigest()[:8]
    
    # Mock comparative consensus returning low confidence (<60)
    mock_comparative.return_value = json.dumps({
        "verdict": {
            "canary": expected_canary,
            "is_scam": False,
            "scam_type": "none",
            "severity": 0,
            "confidence": 45,
            "reasoning": "Evidence is inconclusive across WayBack and passive scan.",
            "perspectives": {
                "forensic": "No clear signs of phishing kits.",
                "skeptic": "Looks like a normal parked domain.",
                "legal": "No logo abuse detected."
            }
        },
        "sources": ["http://unsure-acme.xyz", "https://urlscan.io/search/#page.url:%22unsure-acme.xyz%22"]
    })
    
    # 2. Evaluate report
    sentinel_contract.evaluate_report(report_id)
    
    # 3. Verify report properties
    report_data = json.loads(sentinel_contract.get_report(report_id))
    
    # Status should be NEEDS_REVIEW (since confidence was 45 < 60)
    assert report_data["status"] == "NEEDS_REVIEW"
    # Verdict payload is stored correctly
    verdict = json.loads(report_data["verdict"])
    assert verdict["confidence"] == 45
    # Sources list is populated
    sources = json.loads(report_data["sources"])
    assert len(sources) == 2
    assert "https://urlscan.io/search/#page.url:%22unsure-acme.xyz%22" in sources

@patch("genlayer.gl.eq_principle.prompt_comparative")
def test_consensus_rejected_on_high_confidence(mock_comparative, sentinel_contract, direct_vm, accounts):
    from genlayer.py.types import Address
    brand = accounts[0]
    hunter = accounts[1]
    
    direct_vm.sender = Address(brand.address)
    direct_vm.value = 1000000
    bounty_id = sentinel_contract.create_bounty("Acme Wallet", "Official site acme.xyz", 500000)
    
    direct_vm.sender = Address(hunter.address)
    direct_vm.value = 200000
    report_id = sentinel_contract.submit_report(bounty_id, "http://legit-acme.xyz")
    
    dt_str = direct_vm._datetime or ""
    token_input = f"{report_id}:{dt_str}"
    expected_canary = hashlib.sha256(token_input.encode('utf-8')).hexdigest()[:8]
    
    # Mock comparative consensus returning high confidence rejected (>=60)
    mock_comparative.return_value = json.dumps({
        "verdict": {
            "canary": expected_canary,
            "is_scam": False,
            "scam_type": "none",
            "severity": 0,
            "confidence": 95,
            "reasoning": "Domain belongs to the brand's verified registrar.",
            "perspectives": {
                "forensic": "Legit SSL certificate.",
                "skeptic": "Matches official design.",
                "legal": "Authorized property."
            }
        },
        "sources": ["http://legit-acme.xyz"]
    })
    
    sentinel_contract.evaluate_report(report_id)
    
    report_data = json.loads(sentinel_contract.get_report(report_id))
    # Status should be REJECTED
    assert report_data["status"] == "REJECTED"
