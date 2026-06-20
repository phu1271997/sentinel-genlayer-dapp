# Hunter Reputation System (Milestone 3)

The Sentinel Hunter Reputation System incentivizes high-quality phishing and scam reports while penalizing spam or incorrect filings. Hunters earn or lose reputation points based on the final consensus outcome of their reports.

## Reputation Score Formula

A hunter's reputation score is computed dynamically based on their history of evaluated reports:

$$\text{Reputation Score} = (\text{Confirmed Reports} \times 100) - (\text{Rejected Reports} \times 30)$$

- **Confirmed Report**: $+100$ points.
- **Rejected Report**: $-30$ points.
- **Pending/Needs Review**: $0$ points (no reputation change until a final decision is reached).
- A hunter's reputation score is bounded at a minimum of $0$ to prevent negative balances.

---

## Reputation Tiers

Hunters are classified into four distinct tiers depending on their current reputation score:

| Tier | Score Threshold | Stake Discount | Payout Boost / Fee Waived |
| :--- | :--- | :--- | :--- |
| **BRONZE** | $0 - 999$ | $0\%$ (Full Stake Required) | None (Standard $2.5\%$ platform fee) |
| **SILVER** | $1,000 - 2,999$ | $0\%$ (Full Stake Required) | None (Standard $2.5\%$ platform fee) |
| **GOLD** | $3,000 - 9,999$ | **$50\%$ Discount** | **Fee Waived** (Saves $2.5\%$ fee, up to reward value) |
| **DIAMOND**| $\ge 10,000$ | **$75\%$ Discount** | **Fee Waived** (Saves $2.5\%$ fee, up to reward value) |

---

## Economic Benefits

### 1. Stake Gating Discount
To submit a report, hunters must place a collateral stake (to discourage spam). Lower-tier hunters must lock $100\%$ of the current dynamic stake.
- **GOLD hunters** receive a **$50\%$ discount**, meaning they only need to stake half of the standard amount.
- **DIAMOND hunters** receive a **$75\%$ discount**, needing only one-quarter of the standard stake.

### 2. Payout Boost (Fee Deductions Waived)
The contract charges a $2.5\%$ platform fee on successful bounty payouts.
- For **GOLD** and **DIAMOND** hunters, this platform fee deduction is **waived** (re-routed back to the hunter as a payout boost), up to the total fee amount.
- This ensures top-performing hunters retain $100\%$ of their earned bounty rewards.
