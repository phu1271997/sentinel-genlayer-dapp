# Security Policy & Threat Model

This document outlines the security architecture and threat model of Sentinel v2.

## Threat Model

### Actors
- **Hunter**: An external user submitting URLs suspected of phishing or impersonation.
- **Brand**: The creator of a bounty pool who provides brand identity guidelines.
- **Attacker**: A malicious entity attempting to drain the bounty pool, hijack rewards, or bypass validation logic.

### STRIDE Threat Matrix & Mitigations

| Threat Category | Specific Threat | Sentinel v2 Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Attacker claims rewards of another hunter | Payouts are tied strictly to the normalized message sender (`gl.message.sender_address`) and credited directly to their own account. |
| **Tampering** | User-controlled URLs or identity text contain prompt injection | 1. Input values are sanitized via `_sanitize_user_text` to strip prompt control symbols (e.g. `System:`, `Ignore`, etc.) and block formatting backticks.<br>2. A deterministic 8-hex character canary token derived from block context is injected into the LLM prompt and verified upon output. |
| **Repudiation** | Hunters claim they submitted reports that weren't indexed | The `hunter_index` TreeMap records every submitted report ID per hunter for transparent historical tracking. |
| **Information Disclosure** | Leakage of evaluation metadata | All evaluations, screenshot renderings, and verdicts are recorded on-chain, ensuring auditable, tamper-proof brand logs. |
| **Denial of Service** | 1. Reentrancy/payment failures block evaluation consensus.<br>2. Double evaluation transaction spam. | 1. Migrated payments to a **pull-withdrawal pattern** so failures during outbound transfers do not block contract execution.<br>2. Implemented race condition locks (`report_status_of = "EVALUATING"`) before executing non-deterministic blocks. |
| **Elevation of Privilege** | Normal users deactivating bounties or altering parameters | Strict ownership checks (`sender_address == self.owner` or `sender_address == bounty_brand`) guard all administrative and pool functions. |

---

## Detailed Mitigation Architecture

### 1. Prompt Injection Canary Defense
To prevent adversarial instructions in suspect web pages or brand configurations from hijacking the AI verdict (e.g., instructing the LLM to output `is_scam: true` for a legitimate brand property), Sentinel v2 generates a deterministic, per-evaluation canary token:
$$\text{canary} = \text{SHA-256}(\text{report\_id} \mathbin{\Vert} \text{block datetime})[0:8]$$

This canary token is injected into the prompt as a secret key, and the model is instructed to output it in the JSON verdict. The validator nodes re-run the leader logic and verify the returned canary token. If the canary token does not match, the transaction is reverted.

### 2. Pull-Withdrawal Pattern
Immediate push-payments (`_pay` calls) during contract functions like `evaluate_report` are highly risky because:
- If a payee is a contract that reverts on receipt, the entire transaction reverts, blocking consensus.
- In GenLayer, consensus execution must be deterministic and robust against network and transfer failures.

Sentinel v2 credits payouts to `pending_balance_of`. Payees must invoke `withdraw()`, which employs a zero-before-transfer check-effects-interactions flow:
```python
self.pending_balance_of[caller] = u256(0)
self._pay(gl.message.sender_address, amount)
```

### 3. Safe Map Reads & Arithmetic Overflow Guards
- To prevent unexpected crashes or slot errors, every storage map lookup checks key existence first:
  ```python
  value = self.map_name[key] if key in self.map_name else default
  ```
- Before adding values to pool balances or pending balances, arguments are verified against overflow limits ($> 2^{255}$).
