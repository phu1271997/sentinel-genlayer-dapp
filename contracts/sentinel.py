# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import hashlib


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


class Contract(gl.Contract):
    owner: Address
    platform_fee_bps: u256
    report_stake: u256
    next_bounty_id: u256
    next_report_id: u256

    bounty_brand_of: TreeMap[str, Address]
    bounty_name_of: TreeMap[str, str]
    bounty_identity_of: TreeMap[str, str]
    bounty_pool_of: TreeMap[str, u256]
    bounty_base_reward_of: TreeMap[str, u256]
    bounty_active_of: TreeMap[str, bool]

    report_bounty_of: TreeMap[str, str]
    report_hunter_of: TreeMap[str, Address]
    report_url_of: TreeMap[str, str]
    report_stake_of: TreeMap[str, u256]
    report_status_of: TreeMap[str, str]
    report_severity_of: TreeMap[str, u256]
    report_payout_of: TreeMap[str, u256]
    report_verdict_of: TreeMap[str, str]

    claimed_of: TreeMap[str, bool]

    # Milestone 1: New storage variables
    pending_balance_of: TreeMap[str, u256]
    hunter_index: TreeMap[str, DynArray[str]]

    # Milestone 2: New storage variables
    report_sources_of: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.platform_fee_bps = u256(250)
        self.report_stake = u256(0)
        self.next_bounty_id = u256(0)
        self.next_report_id = u256(0)

    # Helper to normalize addresses to lowercase hex strings
    def _normalize_address(self, addr: Address) -> str:
        return str(addr).lower()

    # Helper to sanitize user inputs to mitigate prompt injection
    def _sanitize_user_text(self, s: str) -> str:
        lines = s.split('\n')
        sanitized_lines = []
        for line in lines:
            trimmed = line.strip()
            lower_trimmed = trimmed.lower()
            if lower_trimmed.startswith("ignore") or lower_trimmed.startswith("system:") or lower_trimmed.startswith("user:"):
                continue
            # Strip backticks to avoid escaping markdown prompt boundaries
            line_clean = line.replace("`", "")
            sanitized_lines.append(line_clean)
        return '\n'.join(sanitized_lines)

    # Helper to extract the first domain-like token from identity text
    def _extract_domain(self, text: str) -> str:
        words = text.split()
        for w in words:
            w_clean = w.strip(".,;:()\"'!?")
            if "://" in w_clean:
                parts = w_clean.split("://")
                if len(parts) > 1:
                    return parts[1].split('/')[0]
            if "." in w_clean and len(w_clean) > 4 and not w_clean.startswith("@"):
                parts = w_clean.split(".")
                last_part = parts[-1].split('/')[0].lower()
                if last_part.isalnum() and 2 <= len(last_part) <= 6:
                    res = w_clean.replace("https://", "").replace("http://", "")
                    return res.split('/')[0]
        return ""

    @gl.public.write
    def set_report_stake(self, amount: u256) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("Only owner")
        self.report_stake = amount

    @gl.public.write
    def set_platform_fee(self, bps: u256) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("Only owner")
        if bps > u256(2000):
            raise gl.vm.UserError("Fee too high")
        self.platform_fee_bps = bps

    @gl.public.write.payable
    def create_bounty(self, brand_name: str, official_identity: str, base_reward: u256) -> str:
        if gl.message.value == u256(0):
            raise gl.vm.UserError("Must fund the bounty pool")
        if base_reward == u256(0):
            raise gl.vm.UserError("base_reward must be > 0")

        bounty_id = str(self.next_bounty_id)
        self.bounty_brand_of[bounty_id] = gl.message.sender_address
        self.bounty_name_of[bounty_id] = self._sanitize_user_text(brand_name)
        self.bounty_identity_of[bounty_id] = self._sanitize_user_text(official_identity)
        self.bounty_pool_of[bounty_id] = gl.message.value
        self.bounty_base_reward_of[bounty_id] = base_reward
        self.bounty_active_of[bounty_id] = True
        
        self.next_bounty_id = self.next_bounty_id + u256(1)
        return bounty_id

    @gl.public.write.payable
    def top_up_bounty(self, bounty_id: str) -> None:
        if not (bounty_id in self.bounty_active_of):
            raise gl.vm.UserError("Unknown bounty")
        bounty_active = self.bounty_active_of[bounty_id] if bounty_id in self.bounty_active_of else False
        if not bounty_active:
            raise gl.vm.UserError("Bounty inactive")
        if gl.message.value == u256(0):
            raise gl.vm.UserError("Must send value")
        
        pool = self.bounty_pool_of[bounty_id] if bounty_id in self.bounty_pool_of else u256(0)
        val = gl.message.value
        if pool > u256(2**255) or val > u256(2**255):
            raise gl.vm.UserError("overflow guard")
        
        self.bounty_pool_of[bounty_id] = pool + val

    @gl.public.write
    def deactivate_and_withdraw(self, bounty_id: str) -> None:
        if not (bounty_id in self.bounty_active_of):
            raise gl.vm.UserError("Unknown bounty")
        bounty_brand = self.bounty_brand_of[bounty_id] if bounty_id in self.bounty_brand_of else Address("0x0000000000000000000000000000000000000000")
        if gl.message.sender_address != bounty_brand:
            raise gl.vm.UserError("Only the brand")

        remaining = self.bounty_pool_of[bounty_id] if bounty_id in self.bounty_pool_of else u256(0)
        self.bounty_pool_of[bounty_id] = u256(0)
        self.bounty_active_of[bounty_id] = False
        
        # Credit to brand's pending balance instead of push-payment
        brand_str = self._normalize_address(bounty_brand)
        if brand_str not in self.pending_balance_of:
            self.pending_balance_of[brand_str] = u256(0)
        
        if remaining > u256(2**255) or self.pending_balance_of[brand_str] > u256(2**255):
            raise gl.vm.UserError("overflow guard")
            
        self.pending_balance_of[brand_str] = self.pending_balance_of[brand_str] + remaining

    @gl.public.write.payable
    def submit_report(self, bounty_id: str, suspicious_url: str) -> str:
        if not (bounty_id in self.bounty_active_of):
            raise gl.vm.UserError("Unknown bounty")
        bounty_active = self.bounty_active_of[bounty_id] if bounty_id in self.bounty_active_of else False
        if not bounty_active:
            raise gl.vm.UserError("Bounty inactive")
        if gl.message.value < self.report_stake:
            raise gl.vm.UserError("Insufficient anti-spam stake")
        if len(suspicious_url) < 8:
            raise gl.vm.UserError("URL is too short")

        report_id = str(self.next_report_id)
        self.report_bounty_of[report_id] = bounty_id
        self.report_hunter_of[report_id] = gl.message.sender_address
        self.report_url_of[report_id] = self._sanitize_user_text(suspicious_url)
        self.report_stake_of[report_id] = gl.message.value
        self.report_status_of[report_id] = "PENDING"
        self.report_severity_of[report_id] = u256(0)
        self.report_payout_of[report_id] = u256(0)
        
        # Index the report under the hunter
        hunter_str = self._normalize_address(gl.message.sender_address)
        self.hunter_index.get_or_insert_default(hunter_str).append(report_id)
        
        self.next_report_id = self.next_report_id + u256(1)
        return report_id

    @gl.public.write
    def evaluate_report(self, report_id: str) -> str:
        if not (report_id in self.report_status_of):
            raise gl.vm.UserError("Unknown report")
        
        status = self.report_status_of[report_id] if report_id in self.report_status_of else ""
        if status != "PENDING":
            raise gl.vm.UserError("Already evaluated or evaluation in progress")

        # Set status to EVALUATING to prevent race condition/re-evaluation
        self.report_status_of[report_id] = "EVALUATING"

        bounty_id = self.report_bounty_of[report_id] if report_id in self.report_bounty_of else ""
        hunter = self.report_hunter_of[report_id] if report_id in self.report_hunter_of else Address("0x0000000000000000000000000000000000000000")
        stake = self.report_stake_of[report_id] if report_id in self.report_stake_of else u256(0)
        url = self.report_url_of[report_id] if report_id in self.report_url_of else ""
        brand_name = self.bounty_name_of[bounty_id] if bounty_id in self.bounty_name_of else ""
        identity = self.bounty_identity_of[bounty_id] if bounty_id in self.bounty_identity_of else ""

        # Parse host for external search queries
        temp_url = url.replace("https://", "").replace("http://", "")
        host = temp_url.split('/')[0].split('?')[0].split(':')[0]
        canonical_domain = self._extract_domain(identity)

        # Deterministic canary token derived from block context
        dt_str = gl.message_raw.get('datetime', '')
        token_input = f"{report_id}:{dt_str}"
        canary = hashlib.sha256(token_input.encode('utf-8')).hexdigest()[:8]

        dedup_key = bounty_id + "|" + url
        already = (dedup_key in self.claimed_of) and self.claimed_of[dedup_key]
        if already:
            self.report_status_of[report_id] = "REJECTED"
            self.report_verdict_of[report_id] = json.dumps(
                {
                    "canary": canary,
                    "is_scam": False,
                    "scam_type": "none",
                    "severity": 0,
                    "confidence": 100,
                    "reasoning": "duplicate of an already-rewarded report",
                    "perspectives": {
                        "forensic": "Duplicate detection triggered.",
                        "skeptic": "Duplicate detection triggered.",
                        "legal": "Duplicate detection triggered."
                    }
                },
                sort_keys=True,
            )
            
            # Credit hunter stake back to pending balance
            hunter_str = self._normalize_address(hunter)
            if hunter_str not in self.pending_balance_of:
                self.pending_balance_of[hunter_str] = u256(0)
            if stake > u256(2**255) or self.pending_balance_of[hunter_str] > u256(2**255):
                raise gl.vm.UserError("overflow guard")
            self.pending_balance_of[hunter_str] = self.pending_balance_of[hunter_str] + stake
            
            return self.report_verdict_of[report_id]

        def leader_fn() -> str:
            sources = []
            
            # 1. Suspect URL (existing)
            try:
                suspect_text = gl.nondet.web.render(url, mode="text")
                sources.append({"name": "Suspect URL Text", "url": url, "text": suspect_text[:1500]})
            except Exception:
                pass
                
            # 2. Wayback Archive
            try:
                wayback_url = f"https://web.archive.org/web/2025/{url}"
                wayback_text = gl.nondet.web.render(wayback_url, mode="text")
                sources.append({"name": "Wayback Archive", "url": wayback_url, "text": wayback_text[:1500]})
            except Exception:
                pass
                
            # 3. urlscan.io
            try:
                urlscan_url = f"https://urlscan.io/search/#page.url:%22{host}%22"
                urlscan_text = gl.nondet.web.render(urlscan_url, mode="text")
                sources.append({"name": "urlscan.io Search", "url": urlscan_url, "text": urlscan_text[:1500]})
            except Exception:
                pass
                
            # 4. VirusTotal
            try:
                vt_url = f"https://www.virustotal.com/gui/domain/{host}"
                vt_text = gl.nondet.web.render(vt_url, mode="text")
                sources.append({"name": "VirusTotal Domain Report", "url": vt_url, "text": vt_text[:1500]})
            except Exception:
                pass
                
            # 5. Brand Truth website rendering
            if canonical_domain:
                try:
                    brand_truth_url = f"https://{canonical_domain}"
                    brand_truth_text = gl.nondet.web.render(brand_truth_url, mode="text")
                    sources.append({"name": "Official Brand Website", "url": brand_truth_url, "text": brand_truth_text[:1500]})
                except Exception:
                    pass

            # Formulate cross-referenced sources summary
            sources_formatted = ""
            for s in sources:
                sources_formatted += f"--- SOURCE: {s['name']} ({s['url']}) ---\n{s['text']}\n\n"

            shot = gl.nondet.web.render(url, mode="screenshot")
            prompt = f"""You are a strict brand-protection / anti-phishing analyst.

OFFICIAL BRAND: {brand_name}
OFFICIAL IDENTITY (legitimate domains, handles, how the real brand looks):
{identity}

You are shown cross-referenced web sources for the SUSPECT URL: {url}
{sources_formatted}

You also have a screenshot of the suspect page.

Decide whether this page impersonates / phishes / scams the brand above.
NEVER flag the brand's own official properties as a scam.

CRITICAL SECURITY REQUIREMENT:
You MUST echo the security canary token {canary} in your response under the key "canary".

Perform a detailed evaluation from three distinct perspectives:
1. Forensic Analyst: Analyze HTML/text artifacts, hosting details, and domain reputation.
2. Skeptical User: Look at visual elements, branding, and UX red flags (e.g. pressure tactics, spelling errors).
3. Brand-Protection Lawyer: Evaluate trademark usage, logo abuse, and impersonation.

Respond with ONLY valid JSON:
{{
  "canary": "{canary}",
  "is_scam": true or false,
  "scam_type": "phishing | impersonation | counterfeit | fake_giveaway | fake_support | wallet_drainer | other | none",
  "severity": <integer 0-100>,
  "confidence": <integer 0-100>,
  "reasoning": "one short paragraph citing concrete evidence",
  "perspectives": {{
    "forensic": "forensic analyst verdict and findings",
    "skeptic": "skeptical user visual/UX findings",
    "legal": "brand lawyer trademark/impersonation findings"
  }}
}}

severity guide:
- not a scam -> 0
- low-risk lookalike, minimal harm -> 1-30
- clear impersonation, moderate harm -> 31-70
- active credential phishing / wallet drainer / financial theft -> 71-100
"""
            res = gl.nondet.exec_prompt(prompt, images=[shot], response_format="json")
            urls_used = [s["url"] for s in sources]
            return json.dumps({"verdict": res, "sources": urls_used}, sort_keys=True)

        principle = (
            "Compare the 'verdict' object inside the JSON payload. "
            "Two verdicts agree if and only if: "
            "(a) is_scam booleans are identical, "
            "(b) scam_type buckets match (phishing/impersonation/counterfeit/"
            "fake_giveaway/fake_support/wallet_drainer/other/none), "
            "(c) severity values are within ±15, "
            "(d) reasoning cites at least one overlapping concrete artifact."
        )

        ruling_str = gl.eq_principle.prompt_comparative(leader_fn, principle)
        ruling = json.loads(ruling_str)
        verdict = ruling["verdict"]
        sources_used = ruling["sources"]

        if verdict.get("canary") != canary:
            raise gl.vm.UserError("Canary token mismatch")

        self.report_verdict_of[report_id] = json.dumps(verdict, sort_keys=True)
        self.report_sources_of[report_id] = json.dumps(sources_used)

        is_scam = bool(verdict.get("is_scam"))
        severity_raw = int(verdict.get("severity", 0))
        if severity_raw < 0:
            severity_raw = 0
        if severity_raw > 100:
            severity_raw = 100
        severity = u256(severity_raw)
        
        confidence = int(verdict.get("confidence", 100))

        if is_scam and severity > u256(0):
            base = self.bounty_base_reward_of[bounty_id] if bounty_id in self.bounty_base_reward_of else u256(0)
            pool = self.bounty_pool_of[bounty_id] if bounty_id in self.bounty_pool_of else u256(0)
            gross = base * severity // u256(100)
            if gross > pool:
                gross = pool
            fee = gross * self.platform_fee_bps // u256(10000)
            net = gross - fee

            self.bounty_pool_of[bounty_id] = pool - gross
            self.report_severity_of[report_id] = severity
            self.report_payout_of[report_id] = net
            self.report_status_of[report_id] = "CONFIRMED"
            self.claimed_of[dedup_key] = True

            # Credit payout to hunter pending balance
            hunter_str = self._normalize_address(hunter)
            owner_str = self._normalize_address(self.owner)

            if hunter_str not in self.pending_balance_of:
                self.pending_balance_of[hunter_str] = u256(0)
            if owner_str not in self.pending_balance_of:
                self.pending_balance_of[owner_str] = u256(0)

            payout_hunter = net + stake
            if payout_hunter > u256(2**255) or self.pending_balance_of[hunter_str] > u256(2**255):
                raise gl.vm.UserError("overflow guard")
            self.pending_balance_of[hunter_str] = self.pending_balance_of[hunter_str] + payout_hunter

            if fee > u256(2**255) or self.pending_balance_of[owner_str] > u256(2**255):
                raise gl.vm.UserError("overflow guard")
            self.pending_balance_of[owner_str] = self.pending_balance_of[owner_str] + fee
        else:
            # If AI is not certain, mark as NEEDS_REVIEW instead of REJECTED
            if confidence < 60:
                self.report_status_of[report_id] = "NEEDS_REVIEW"
                self.report_severity_of[report_id] = u256(0)
                self.report_payout_of[report_id] = u256(0)
                # Stake remains locked in report_stake_of, not forfeited yet
            else:
                self.report_status_of[report_id] = "REJECTED"
                self.report_severity_of[report_id] = u256(0)
                self.report_payout_of[report_id] = u256(0)
                
                pool = self.bounty_pool_of[bounty_id] if bounty_id in self.bounty_pool_of else u256(0)
                if pool > u256(2**255) or stake > u256(2**255):
                    raise gl.vm.UserError("overflow guard")
                self.bounty_pool_of[bounty_id] = pool + stake

        return self.report_verdict_of[report_id]

    # Pull withdrawal method for users to withdraw their pending balances
    @gl.public.write
    def withdraw(self) -> None:
        caller_str = self._normalize_address(gl.message.sender_address)
        if caller_str not in self.pending_balance_of:
            raise gl.vm.UserError("No balance to withdraw")
        
        amount = self.pending_balance_of[caller_str]
        if amount == u256(0):
            raise gl.vm.UserError("Zero balance")

        # Zero balance before calling payment to prevent reentrancy-like issues
        self.pending_balance_of[caller_str] = u256(0)
        self._pay(gl.message.sender_address, amount)

    def _pay(self, to: Address, value: u256) -> None:
        if value > u256(0):
            _Recipient(to).emit_transfer(value=value)

    @gl.public.view
    def get_bounty_count(self) -> u256:
        return self.next_bounty_id

    @gl.public.view
    def get_report_count(self) -> u256:
        return self.next_report_id

    @gl.public.view
    def get_report_stake(self) -> u256:
        return self.report_stake

    @gl.public.view
    def get_platform_fee_bps(self) -> u256:
        return self.platform_fee_bps

    @gl.public.view
    def get_pending_balance(self, addr: str) -> u256:
        addr_str = self._normalize_address(Address(addr))
        return self.pending_balance_of[addr_str] if addr_str in self.pending_balance_of else u256(0)

    # Milestone 1: Get report IDs submitted by a hunter
    @gl.public.view
    def get_hunter_reports(self, addr: str) -> str:
        addr_str = self._normalize_address(Address(addr))
        if addr_str not in self.hunter_index:
            return "[]"
        arr = self.hunter_index[addr_str]
        reports_list = []
        for i in range(len(arr)):
            reports_list.append(arr[i])
        return json.dumps(reports_list)

    @gl.public.view
    def get_bounty(self, bounty_id: str) -> str:
        if not (bounty_id in self.bounty_active_of):
            return "{}"
        data = {
            "bounty_id": bounty_id,
            "brand": str(self.bounty_brand_of[bounty_id]) if bounty_id in self.bounty_brand_of else "",
            "name": self.bounty_name_of[bounty_id] if bounty_id in self.bounty_name_of else "",
            "identity": self.bounty_identity_of[bounty_id] if bounty_id in self.bounty_identity_of else "",
            "pool": str(self.bounty_pool_of[bounty_id]) if bounty_id in self.bounty_pool_of else "0",
            "base_reward": str(self.bounty_base_reward_of[bounty_id]) if bounty_id in self.bounty_base_reward_of else "0",
            "active": self.bounty_active_of[bounty_id] if bounty_id in self.bounty_active_of else False,
        }
        return json.dumps(data)

    @gl.public.view
    def get_report(self, report_id: str) -> str:
        if not (report_id in self.report_status_of):
            return "{}"
        data = {
            "report_id": report_id,
            "bounty_id": self.report_bounty_of[report_id] if report_id in self.report_bounty_of else "",
            "hunter": str(self.report_hunter_of[report_id]) if report_id in self.report_hunter_of else "",
            "url": self.report_url_of[report_id] if report_id in self.report_url_of else "",
            "stake": str(self.report_stake_of[report_id]) if report_id in self.report_stake_of else "0",
            "status": self.report_status_of[report_id] if report_id in self.report_status_of else "",
            "severity": str(self.report_severity_of[report_id]) if report_id in self.report_severity_of else "0",
            "payout": str(self.report_payout_of[report_id]) if report_id in self.report_payout_of else "0",
            "verdict": self.report_verdict_of[report_id] if report_id in self.report_verdict_of else "",
            "sources": self.report_sources_of[report_id] if report_id in self.report_sources_of else "[]",
        }
        return json.dumps(data)
