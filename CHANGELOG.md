# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning.

## [v2.M2] — AI Consensus Upgrade — 2026-06-20
### Added
- Integrated `gl.eq_principle.prompt_comparative` consensus model using a strict semantic comparison principle.
- Multi-source rendering gathering DOM text from suspect URL, Wayback, urlscan.io, VirusTotal, and official Brand Truth.
- Multi-perspective prompting acting as Forensic Analyst, Skeptical User, and Brand Lawyer.
- Added confidence gating: reports with confidence < 60 transition to `NEEDS_REVIEW` and retain stakes, unlocking appeal paths.
- Added `report_sources_of` TreeMap to record which URLs were queried during consensus.
- Automated consensus test suite `tests/test_consensus.py` verifying domain extraction, confidence gating, and status transitions.
- Frontend details expansion: collapsible perspectives panel, confidence meter bar, and source list links in Verdict Card.

### Evidence
- Pytest execution: 8/8 tests passed in 0.11s.
- Detailed architecture documented in `docs/AI_CONSENSUS.md`.

## [v2.M1] — Security Hardening Bundle v1 — 2026-06-20
### Added
- Deterministic prompt injection canary tokens generated from block context to prevent LLM instructions hijacking.
- Input text sanitization helper `_sanitize_user_text` to strip markdown formatting and prompt directive keywords.
- User report index TreeMap `hunter_index` mapped to `DynArray[str]` for transparent hunter submission tracking.
- Safe TreeMap lookup checks to prevent key-errors during storage mapping access.
- Pull-withdrawal pattern (`pending_balance_of` credit mapping and `withdraw()` method) replacing risky push payments.
- Explicit `u256` arithmetic overflow check guards.
- Double-evaluation locking mechanism (`EVALUATING` status) to mitigate race conditions.
- Automated security testing suite under `tests/test_security.py`.
- Frontend pending balance indicator and "Claim" button in the operator header.

### Evidence
- Pytest execution log showing 5/5 tests passing.
- Threat modeling documented in `SECURITY.md`.
