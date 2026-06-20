# Milestone 3 Evidence: Hunter Reputation System

The automated test suite verifies:
1. Dynamic tracking of submission, confirmation, and rejection counts.
2. Dynamic score calculation: `Score = Confirmed * 100 - Rejected * 30`.
3. Tier progression across `BRONZE`, `SILVER`, `GOLD`, and `DIAMOND`.
4. Gated stake discounts applied on report submission (`50%` for `GOLD`, `75%` for `DIAMOND`).
5. Platform fee waiver/deduction boost applied to rewards based on hunter tier.

## Automated Test Log

```bash
$ pytest -v tests/test_reputation.py
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
collected 1 item

tests/test_reputation.py::test_reputation_progression_and_incentives PASSED [100%]

============================== 1 passed in 0.11s ===============================
```
