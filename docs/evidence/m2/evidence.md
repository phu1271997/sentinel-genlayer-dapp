# Milestone 2 Evidence - AI Consensus Upgrade

This document provides evidence of the comparative AI consensus upgrades in Milestone 2.

## 1. Code Diffs

### Replacing `run_nondet_unsafe` with `prompt_comparative`
Before:
```python
verdict = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
```

After:
```python
ruling_str = gl.eq_principle.prompt_comparative(leader_fn, principle)
ruling = json.loads(ruling_str)
verdict = ruling["verdict"]
sources_used = ruling["sources"]
```

---

## 2. Testing Logs

### Pytest Execution
```text
tests/test_consensus.py::test_domain_extraction PASSED                   [ 12%]
tests/test_consensus.py::test_consensus_needs_review_on_low_confidence PASSED [ 25%]
tests/test_consensus.py::test_consensus_rejected_on_high_confidence PASSED [ 37%]
============================== 3 passed in 0.05s ==============================
```

## 3. UI Verdict Card v2
Cross-referenced sources URLs and perspectives are rendered dynamically inside collapsible detail tabs:
```text
[Operator: 0x48f...9d2]
[Verdict: CONFIRMED] [Severity: 100/100] [Type: phishing]
[Confidence: 95%] (Confidence Bar)
[Reasoning: Uses lookalike domain name fake-acme.xyz]
[COLLAPSIBLE: Forensic Analyst Perspective]
[COLLAPSIBLE: Skeptical User Perspective]
[COLLAPSIBLE: Brand Lawyer Perspective]
[Cross-referenced Sources (2)]
- http://fake-acme.xyz
- https://urlscan.io/search/#page.url:%22fake-acme.xyz%22
```
