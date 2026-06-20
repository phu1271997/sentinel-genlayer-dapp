# System Architecture

Sentinel is a decentralized anti-scam bounty registry operating on GenLayer. This document outlines the component architecture and sequence flows.

## Component Diagram

```mermaid
graph TD
    User([User Browser]) -->|HTTP / JS| Frontend[Vite Frontend]
    Frontend -->|GenLayerJS| GenLayer[GenLayer Node / Studio]
    GenLayer -->|Execute Smart Contract| Contract[Sentinel Contract]
    Contract -->|nondet.web.render| Renderer[Web Rendering Nodes]
    Contract -->|nondet.exec_prompt| LLM[AI Consensus Engine]
```

---

## Core Workflows

### 1. Bounty Creation & Reporting

```mermaid
sequenceDiagram
    autonumber
    actor Brand
    actor Hunter
    participant Contract as Sentinel Contract
    
    Brand ->> Contract: create_bounty(name, identity, base_reward) + Fund pool
    Contract -->> Brand: bounty_id
    Hunter ->> Contract: submit_report(bounty_id, suspect_url) + Lock stake
    Contract -->> Hunter: report_id
```

---

### 2. On-Chain AI Consensus Evaluation

When a user calls `evaluate_report(report_id)`, GenLayer nodes execute the consensus sequence:

```mermaid
sequenceDiagram
    autonumber
    participant Caller
    participant Contract as Sentinel Contract
    participant Renderer as Web Rendering Nodes
    participant LLM as AI Consensus Jury
    
    Caller ->> Contract: evaluate_report(report_id)
    Contract ->> Contract: Assert PENDING & Lock status to EVALUATING
    Contract ->> Renderer: nondet.web.render(suspect_url, Wayback, urlscan, VT)
    Renderer -->> Contract: rendered page texts
    Contract ->> LLM: nondet.exec_prompt(Jury prompt with Canary Token)
    LLM -->> Contract: JSON Verdict (canary, is_scam, severity, perspectives)
    Contract ->> Contract: Run comparative agreement principles
    Contract ->> Contract: Calculate payouts, update hunter rep tier
    Contract -->> Caller: JSON Verdict result
```

---

### 3. Appeal & Re-Evaluation Sequence

If a verdict returns `REJECTED` or `NEEDS_REVIEW` due to low confidence, the hunter can file an appeal:

```mermaid
sequenceDiagram
    autonumber
    actor Hunter
    participant Contract as Sentinel Contract
    participant LLM as AI Appeal Jury
    
    Hunter ->> Contract: file_appeal(report_id) + Lock appeal fee
    Contract ->> Contract: Change status to APPEALED
    Hunter ->> Contract: evaluate_appeal(appeal_id)
    Contract ->> LLM: nondet.exec_prompt(Senior Appeal prompt)
    LLM -->> Contract: JSON verdict (is_scam, severity)
    Contract ->> Contract: Overturn or Uphold
    alt Overturned
        Contract ->> Hunter: Credit original stake + appeal fee + scale reward
    else Upheld
        Contract ->> Contract: Forfeit fees to bounty pool
    end
```
