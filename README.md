# Sentinel

Sentinel is a GenLayer Intelligent Contract dApp for decentralized anti-scam and brand impersonation bounties.

A brand funds a bounty pool and records its legitimate identity. Hunters submit suspected phishing, impersonation, counterfeit, fake giveaway, fake support, or wallet-drainer URLs. The GenLayer contract renders the suspect page as text, captures a screenshot, asks an LLM for a JSON verdict, and automatically pays a severity-scaled reward when consensus confirms a scam.

Sentinel is defensive tooling only. The UI renders suspect URLs as inert text and never auto-opens them.

## Project Layout

```text
contracts/
  storage_test.py
  sentinel.py
frontend/
  index.html
  package.json
  vite.config.js
  src/
    genlayer.js
    main.js
    styles.css
DEPLOYMENT_RULES.md
README.md
```

## Verified GenLayer APIs

The current GenLayer value-transfer docs show:

- Receive value with `@gl.public.write.payable` and `gl.message.value`.
- Send value to an EOA or EVM account via an `@gl.evm.contract_interface` proxy and `emit_transfer(value=...)`.

The current GenLayerJS contract docs show `writeContract` and `readContract` using `address`, `functionName`, `args`, and `value`; deployment scripts call `initializeConsensusSmartContract()` before contract interactions. The frontend does this when the method exists.

## Deploy In GenLayer Studio

Open [GenLayer Studio](https://studio.genlayer.com/run-debug).

1. Settings -> Reset Storage -> Confirm.
2. Hard refresh the Studio tab.
3. Deploy `contracts/storage_test.py`.
4. Click the transaction and confirm `Result: SUCCESS`.
5. Exercise `bump`, `set_note`, `get_counter`, and `get_note`.
6. Deploy `contracts/sentinel.py`.
7. Click the transaction and confirm `Result: SUCCESS`.
8. Copy the deployed Sentinel address.
9. Set it in `frontend/.env` as `VITE_CONTRACT_ADDRESS`.

Current Studio deployment:

```text
VITE_CONTRACT_ADDRESS=0x8991e9eAC3446C4836F99796bbC7Ad8ED44D1668
```

## End-To-End Studio Test

Use two Studio accounts.

1. Account A creates a bounty:

```text
create_bounty(
  "Acme Wallet",
  "Official site acme.xyz; official X @acmewallet; we never DM seed phrases; no giveaways",
  <base_reward>
)
```

Send pool funding with the call. Note the returned bounty ID, usually `0`.

2. Account B submits a report:

```text
submit_report("0", "<a clearly fake or phishing-looking URL>")
```

Send the configured stake if the owner raised it. Note the returned report ID.

3. Any account evaluates it:

```text
evaluate_report("0")
```

If the AI confirms a scam, the hunter receives `base_reward * severity / 100 - fee` plus stake refund, and the pool decreases by the gross reward.

4. Negative test:

```text
submit_report("0", "https://example.com")
evaluate_report("<new_report_id>")
```

Expect `REJECTED`; any stake is forfeited into the bounty pool.

5. Dedup test: resubmit an already-confirmed URL for the same bounty. Expect `REJECTED` as a duplicate with stake refunded.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The app has three consoles:

- Brand Console: create bounties, top up pools, deactivate and withdraw leftovers.
- Hunter Console: browse active bounties and submit suspect URLs with stake.
- Investigate: run the AI investigation and render the verdict card.

Amounts are entered as GEN and converted to wei before contract calls.

## Milestones

List of completed upgrades and tagged releases for the GenLayer Builder Program:

- **[v2.M1] — Security Hardening Bundle v1** (2026-06-20): Added prompt injection canary defense, input sanitization, safe TreeMap access, arithmetic overflow guards, pull-withdrawal pattern, double-evaluate lock, and automated unit tests. [Changelog](CHANGELOG.md#v2m1-security-hardening-bundle-v1-2026-06-20)
- **[v2.M2] — AI Consensus Upgrade** (2026-06-20): Replaced standard leader evaluation with `gl.eq_principle.prompt_comparative` multi-node consensus, integrated 5 cross-referenced rendering sources (Wayback, urlscan, VirusTotal, Brand Truth), added 3 analyst perspectives (forensic, skeptic, legal), and implemented confidence gating. [Changelog](CHANGELOG.md#v2m2-ai-consensus-upgrade-2026-06-20)
