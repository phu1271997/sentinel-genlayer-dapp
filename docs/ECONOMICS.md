# Token Economics & Fee Models

Sentinel's economic structure balances anti-spam protection (collateral stakes) with rewards for accurate reports (bounty payouts) and protocol sustainability (platform fees).

---

## 1. Dynamic Stake Gating

Hunters must lock a collateral stake to submit reports. The dynamic stake requirement is configured by the contract owner:

$$S_{\text{required}} = \text{report\_stake}$$

Reputation tiers grant discounts on the required stake:

$$S_{\text{hunter}} = S_{\text{required}} \times (1 - D_{\text{tier}})$$

Where $D_{\text{tier}}$ represents the stake discount percentage:

$$D_{\text{tier}} = \begin{cases} 
0\% & \text{for BRONZE/SILVER} \\ 
50\% & \text{for GOLD} \\ 
75\% & \text{for DIAMOND} 
\end{cases}$$

---

## 2. Payout Allocation

When a report is confirmed as a scam, the gross payout ($P_{\text{gross}}$) is calculated using the brand's base reward ($R_{\text{base}}$) and the AI jury's severity rating ($V_{\text{sev}} \in [0, 100]$):

$$P_{\text{gross}} = \min\left( \frac{R_{\text{base}} \times V_{\text{sev}}}{100}, \text{Bounty Pool} \right)$$

---

## 3. Platform Fees & Payout Boosts

A standard platform fee is charged on payouts for contract maintenance and protocol growth:

$$F_{\text{standard}} = P_{\text{gross}} \times \text{platform\_fee\_bps}$$

Where the default platform fee is set to $2.5\%$ ($\text{platform\_fee\_bps} = 250$):

$$F_{\text{standard}} = P_{\text{gross}} \times 0.025$$

Reputation tier boosts reduce the platform fee deductions (or waive them entirely) by refunding a portion of the fee back to the hunter as a payout boost:

$$\text{Boost} = P_{\text{gross}} \times B_{\text{tier}}$$

Where $B_{\text{tier}}$ represents the payout boost percentage:

$$B_{\text{tier}} = \begin{cases} 
0\% & \text{for BRONZE/SILVER} \\ 
5\% & \text{for GOLD} \\ 
10\% & \text{for DIAMOND} 
\end{cases}$$

The final fee deducted ($F_{\text{final}}$) and net hunter payout ($P_{\text{net}}$) are:

$$F_{\text{final}} = \max(0, F_{\text{standard}} - \text{Boost})$$

$$P_{\text{net}} = P_{\text{gross}} - F_{\text{final}}$$

---

## 4. Appeal Fee Economics

Filing an appeal locks an appeal fee equal to the report's original stake:

$$F_{\text{appeal}} = S_{\text{hunter}}$$

- **Overturned (Hunter wins)**: Hunter receives $P_{\text{net}} + S_{\text{hunter}} + F_{\text{appeal}}$.
- **Upheld (Hunter loses)**: $F_{\text{appeal}}$ (and $S_{\text{hunter}}$ if report was in `NEEDS_REVIEW`) are forfeited directly to the brand's bounty pool to reward the brand for the false alarm.
