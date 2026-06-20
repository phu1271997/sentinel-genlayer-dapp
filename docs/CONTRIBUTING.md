# Contributing Guide & Local Setup

Thank you for contributing to Sentinel! This guide helps you set up a local development environment to run and test the Sentinel smart contract and frontend.

## Prerequisites

- **Python**: `3.10` up to `3.13`
- **Node.js**: `v18` or higher
- **npm**: `v9` or higher

---

## Smart Contract Setup

1. **Install Python dependencies**:
   ```bash
   pip install pytest pytest-asyncio
   # Install the GenLayer testing simulator plugin
   pip install genlayer-test
   ```

2. **Run contract unit tests**:
   ```bash
   pytest -v tests/
   ```

---

## Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**:
   Create a file `frontend/.env` and specify the contract address from your GenLayer Studio deployment:
   ```env
   VITE_CONTRACT_ADDRESS=0x8991e9eAC3446C4836F99796bbC7Ad8ED44D1668
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Run in Demo Mode**:
   To test frontend features without installing a local blockchain node or deploying the contract, navigate to:
   ```text
   http://localhost:5173/?demo=1
   ```

---

## Seeding Sample Data

To seed the local contract state for testing:
1. Ensure your contract is deployed and `VITE_CONTRACT_ADDRESS` is set in `frontend/.env`.
2. Run the seeding script:
   ```bash
   node scripts/seed_demo.js
   ```
