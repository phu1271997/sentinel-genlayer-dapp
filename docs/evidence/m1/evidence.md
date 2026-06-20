# Milestone 1 Evidence - Security Hardening Bundle v1

This document provides code diffs and documentation of the security improvements introduced in Milestone 1.

## 1. Code Diffs

### Pull Withdrawal Pattern
Before:
```python
self._pay(hunter, net + stake)
self._pay(self.owner, fee)
```

After:
```python
# Credit payout to hunter pending balance
hunter_str = self._normalize_address(hunter)
owner_str = self._normalize_address(self.owner)

if hunter_str not in self.pending_balance_of:
    self.pending_balance_of[hunter_str] = u256(0)
if owner_str not in self.pending_balance_of:
    self.pending_balance_of[owner_str] = u256(0)

payout_hunter = net + stake
if payout_hunter > u256(2**255) or self.pending_balance_of[hunter_str] > u256(2**255):
    raise gl.vm.UserError("overflow guard")
self.pending_balance_of[hunter_str] = self.pending_balance_of[hunter_str] + payout_hunter
```

### Deterministic Canary Defense
Canary token is derived deterministically from the block datetime and report ID:
```python
dt_str = gl.message_raw.get('datetime', '')
token_input = f"{report_id}:{dt_str}"
canary = hashlib.sha256(token_input.encode('utf-8')).hexdigest()[:8]
```

It is passed to the prompt and validated inside both the leader and validator:
```python
def validator_fn(leader_result) -> bool:
    if not isinstance(leader_result, gl.vm.Return):
        return False
    try:
        mine = leader_fn()
        theirs = leader_result.calldata
        if theirs.get("canary") != canary:
            return False
        ...
```

---

## 2. Screenshots & Testing Logs

### Pytest Execution Log
```text
tests/test_security.py::test_sanitizer PASSED                            [ 20%]
tests/test_security.py::test_canary_defense_success PASSED               [ 40%]
tests/test_security.py::test_canary_defense_failure PASSED               [ 60%]
tests/test_security.py::test_double_evaluate PASSED                      [ 80%]
tests/test_security.py::test_pull_withdrawal_lifecycle PASSED            [100%]
============================== 5 passed in 0.08s ===============================
```

### UI Claim Earnings Panel
```text
[Operator: 0x48f...9d2]
[Earnings: 0.590000 GEN] [Claim Button]
```
