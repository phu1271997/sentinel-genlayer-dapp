# Milestone 4 Evidence: Appeal & Re-Evaluation Flow

The automated test suite verifies:
1. Validation constraints on appeal filing (original hunter only, only when report is in `REJECTED` or `NEEDS_REVIEW` state, requires exact original stake fee).
2. Report status updates to `APPEALED` upon successful filing.
3. Comparative consensus round triggered for dispute resolution.
4. Overturned appeal outcomes (scam confirmed):
   - Correct refund and payout routing (original stake + appeal fee + net bounty reward).
   - Reputation correction (reversing previous rejection penalization and updating to confirmed).
5. Upheld appeal outcomes (scam rejected):
   - Forfeiture of appeal fee (and original stake if report was in `NEEDS_REVIEW`) to the bounty pool.
   - Reputation updates.

## Automated Test Log

```bash
$ pytest -v tests/test_appeal.py
WARNING: File `gltest.config.yaml` not found in the current directory, using default config
INFO: Clearing artifacts directory: artifacts
INFO: Using the following configuration:
INFO:   RPC URL: http://127.0.0.1:4000/api
INFO:   Selected Network: localnet
INFO:   Selected chain type: localnet
INFO:   Contracts directory: contracts
INFO:   Artifacts directory: artifacts
INFO:   Environment: .env
INFO:   Default wait interval: 3000 ms
INFO:   Default wait retries: 50
INFO:   Leader only mode: False
============================= test session starts ==============================
platform darwin -- Python 3.13.5, pytest-9.0.3, pluggy-1.6.0
cachedir: .pytest_cache
rootdir: /Users/peter/.gemini/antigravity/scratch/sentinel-genlayer-dapp
plugins: anyio-4.13.0, genlayer-test-0.29.2
collected 4 items

tests/test_appeal.py::test_file_appeal_validation PASSED                 [ 25%]
tests/test_appeal.py::test_evaluate_appeal_overturned_needs_review PASSED [ 50%]
tests/test_appeal.py::test_evaluate_appeal_overturned_rejected PASSED    [ 75%]
tests/test_appeal.py::test_evaluate_appeal_upheld_needs_review PASSED    [100%]

============================== 4 passed in 0.09s ===============================
```
