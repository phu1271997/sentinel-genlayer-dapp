# Sentinel GenLayer Deployment Rules

These rules are deliberately strict because small Python or SDK mismatches can prevent GenLayer Studio deployment.

1. The first three lines of every contract must be:

```python
# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
```

2. Never reassign `TreeMap()` or `DynArray()` in `__init__`. GenVM auto-initializes them.
3. Do not use `float` in public signatures or storage. Money is integer `u256` in wei.
4. Public param and return types must be deploy-safe: `str`, `bool`, `bytes`, `int`, sized ints, `Address`, `DynArray[T]`, or `TreeMap[K,V]`.
5. Storage collections must use fully-instantiated `TreeMap[K,V]` or `DynArray[T]`.
6. The main class must be named exactly `Contract` and extend `gl.Contract`.
7. Every `gl.nondet.*` call must be inside a `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` block.
8. Do not read `self.*` inside non-deterministic functions. Copy storage values into locals first.
9. Persisted integer storage should use `u256` or another sized integer, not plain `int`.
10. For JSON LLM calls, validators should re-run the leader function and compare against `leader_result.calldata`.
11. Value transfers were verified against current GenLayer docs: receive value with `@gl.public.write.payable` and `gl.message.value`; send value to EOAs through an `@gl.evm.contract_interface` proxy with `_Recipient(address).emit_transfer(value=value)`.
12. Model bounties and reports as parallel `TreeMap`s keyed by string IDs.

Pre-deploy checklist:

- Confirm line 1 is `# v0.2.16`.
- Confirm line 2 is the `Depends` comment.
- Confirm `__init__` only sets scalar fields.
- Confirm there are no floats, bare `list`/`dict` public types, or uninstantiated generics.
- Confirm no `self.*` appears in `leader_fn` or `validator_fn`.
- Confirm every outbound payout uses the documented `emit_transfer(value=...)` path.
