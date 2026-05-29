# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


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

    def __init__(self):
        self.owner = gl.message.sender_address
        self.platform_fee_bps = u256(250)
        self.report_stake = u256(0)
        self.next_bounty_id = u256(0)
        self.next_report_id = u256(0)

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
        self.bounty_name_of[bounty_id] = brand_name
        self.bounty_identity_of[bounty_id] = official_identity
        self.bounty_pool_of[bounty_id] = gl.message.value
        self.bounty_base_reward_of[bounty_id] = base_reward
        self.bounty_active_of[bounty_id] = True
        self.next_bounty_id = self.next_bounty_id + u256(1)
        return bounty_id

    @gl.public.write.payable
    def top_up_bounty(self, bounty_id: str) -> None:
        if not (bounty_id in self.bounty_active_of):
            raise gl.vm.UserError("Unknown bounty")
        if not self.bounty_active_of[bounty_id]:
            raise gl.vm.UserError("Bounty inactive")
        if gl.message.value == u256(0):
            raise gl.vm.UserError("Must send value")
        self.bounty_pool_of[bounty_id] = self.bounty_pool_of[bounty_id] + gl.message.value

    @gl.public.write
    def deactivate_and_withdraw(self, bounty_id: str) -> None:
        if not (bounty_id in self.bounty_active_of):
            raise gl.vm.UserError("Unknown bounty")
        if gl.message.sender_address != self.bounty_brand_of[bounty_id]:
            raise gl.vm.UserError("Only the brand")

        remaining = self.bounty_pool_of[bounty_id]
        self.bounty_pool_of[bounty_id] = u256(0)
        self.bounty_active_of[bounty_id] = False
        self._pay(self.bounty_brand_of[bounty_id], remaining)

    @gl.public.write.payable
    def submit_report(self, bounty_id: str, suspicious_url: str) -> str:
        if not (bounty_id in self.bounty_active_of):
            raise gl.vm.UserError("Unknown bounty")
        if not self.bounty_active_of[bounty_id]:
            raise gl.vm.UserError("Bounty inactive")
        if gl.message.value < self.report_stake:
            raise gl.vm.UserError("Insufficient anti-spam stake")
        if len(suspicious_url) < 8:
            raise gl.vm.UserError("URL is too short")

        report_id = str(self.next_report_id)
        self.report_bounty_of[report_id] = bounty_id
        self.report_hunter_of[report_id] = gl.message.sender_address
        self.report_url_of[report_id] = suspicious_url
        self.report_stake_of[report_id] = gl.message.value
        self.report_status_of[report_id] = "PENDING"
        self.report_severity_of[report_id] = u256(0)
        self.report_payout_of[report_id] = u256(0)
        self.next_report_id = self.next_report_id + u256(1)
        return report_id

    @gl.public.write
    def evaluate_report(self, report_id: str) -> str:
        if not (report_id in self.report_status_of):
            raise gl.vm.UserError("Unknown report")
        if self.report_status_of[report_id] != "PENDING":
            raise gl.vm.UserError("Already evaluated")

        bounty_id = self.report_bounty_of[report_id]
        hunter = self.report_hunter_of[report_id]
        stake = self.report_stake_of[report_id]
        url = self.report_url_of[report_id]
        brand_name = self.bounty_name_of[bounty_id]
        identity = self.bounty_identity_of[bounty_id]

        dedup_key = bounty_id + "|" + url
        already = (dedup_key in self.claimed_of) and self.claimed_of[dedup_key]
        if already:
            self.report_status_of[report_id] = "REJECTED"
            self.report_verdict_of[report_id] = json.dumps(
                {
                    "is_scam": False,
                    "scam_type": "none",
                    "severity": 0,
                    "reasoning": "duplicate of an already-rewarded report",
                },
                sort_keys=True,
            )
            self._pay(hunter, stake)
            return self.report_verdict_of[report_id]

        def leader_fn():
            page_text = gl.nondet.web.render(url, mode="text")
            shot = gl.nondet.web.render(url, mode="screenshot")
            prompt = f"""You are a strict brand-protection / anti-phishing analyst.

OFFICIAL BRAND: {brand_name}
OFFICIAL IDENTITY (legitimate domains, handles, how the real brand looks):
{identity}

You are shown a SUSPECT web page (rendered text + a screenshot).
SUSPECT URL: {url}
SUSPECT PAGE TEXT:
{page_text}

Decide whether this page impersonates / phishes / scams the brand above
(fake login, lookalike domain, fake giveaway, counterfeit store, fake support, wallet drainer, etc).
NEVER flag the brand's own official properties as a scam.

Respond with ONLY valid JSON:
{{
  "is_scam": true or false,
  "scam_type": "phishing | impersonation | counterfeit | fake_giveaway | fake_support | wallet_drainer | other | none",
  "severity": <integer 0-100>,
  "reasoning": "one short paragraph citing concrete evidence from the page"
}}

severity guide:
- not a scam -> 0
- low-risk lookalike, minimal harm -> 1-30
- clear impersonation, moderate harm -> 31-70
- active credential phishing / wallet drainer / financial theft -> 71-100
"""
            return gl.nondet.exec_prompt(prompt, images=[shot], response_format="json")

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                mine = leader_fn()
                theirs = leader_result.calldata
                if bool(mine["is_scam"]) != bool(theirs["is_scam"]):
                    return False
                return abs(int(mine["severity"]) - int(theirs["severity"])) <= 20
            except Exception:
                return False

        verdict = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        self.report_verdict_of[report_id] = json.dumps(verdict, sort_keys=True)

        is_scam = bool(verdict["is_scam"])
        severity_raw = int(verdict["severity"])
        if severity_raw < 0:
            severity_raw = 0
        if severity_raw > 100:
            severity_raw = 100
        severity = u256(severity_raw)

        if is_scam and severity > u256(0):
            base = self.bounty_base_reward_of[bounty_id]
            pool = self.bounty_pool_of[bounty_id]
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

            self._pay(hunter, net + stake)
            self._pay(self.owner, fee)
        else:
            self.report_status_of[report_id] = "REJECTED"
            self.report_severity_of[report_id] = u256(0)
            self.report_payout_of[report_id] = u256(0)
            self.bounty_pool_of[bounty_id] = self.bounty_pool_of[bounty_id] + stake

        return self.report_verdict_of[report_id]

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
    def get_bounty(self, bounty_id: str) -> str:
        if not (bounty_id in self.bounty_active_of):
            return "{}"
        data = {
            "bounty_id": bounty_id,
            "brand": str(self.bounty_brand_of[bounty_id]),
            "name": self.bounty_name_of[bounty_id],
            "identity": self.bounty_identity_of[bounty_id],
            "pool": str(self.bounty_pool_of[bounty_id]),
            "base_reward": str(self.bounty_base_reward_of[bounty_id]),
            "active": self.bounty_active_of[bounty_id],
        }
        return json.dumps(data)

    @gl.public.view
    def get_report(self, report_id: str) -> str:
        if not (report_id in self.report_status_of):
            return "{}"
        data = {
            "report_id": report_id,
            "bounty_id": self.report_bounty_of[report_id],
            "hunter": str(self.report_hunter_of[report_id]),
            "url": self.report_url_of[report_id],
            "stake": str(self.report_stake_of[report_id]),
            "status": self.report_status_of[report_id],
            "severity": str(self.report_severity_of[report_id]),
            "payout": str(self.report_payout_of[report_id]),
            "verdict": self.report_verdict_of[report_id] if report_id in self.report_verdict_of else "",
        }
        return json.dumps(data)
