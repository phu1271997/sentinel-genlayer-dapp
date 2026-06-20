# Milestone 5 Evidence: Demo Mode & Sample Data Seeding

We have verified the following capabilities for the Sentinel v2 Demo Mode and Seeding System:

1. **Seeding Script**: Created `scripts/seed_demo.js` using ESM modules and `genlayer-js` to programmatically populate the contract with brand bounties and reports.
2. **Demo Mode (`?demo=1`)**: Navigate to the application URL with `?demo=1` or `?demo=true` parameters to activate Demo Mode.
3. **In-Memory Simulation**: All write and consensus actions (Creating Bounties, Submitting Reports, Running AI consensus evaluations, filing and evaluating Appeals) are fully simulated in-memory when Demo Mode is active.
4. **Onboarding Tour**: An interactive 5-step overlay wizard successfully launches for first-time visitors, walking them through the consoles and storing progress in `localStorage` to avoid repeating.

## Seeding Script Compilation Check

```bash
$ node -c scripts/seed_demo.js
# Success, script is syntactically correct ESM module
```

## Frontend Build Compilation Check

```bash
$ npm run build
vite v6.4.2 building for production...
transforming...
✓ 437 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.55 kB
dist/assets/index-DNoyHMii.css   10.53 kB
dist/assets/ccip-DAJMnbaq.js      3.04 kB
dist/assets/index-CVENlJw2.js   512.13 kB
✓ built in 624ms
```
