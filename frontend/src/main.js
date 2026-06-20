import "./styles.css";
import {
  bountyCount,
  CONTRACT_ADDRESS,
  createBounty,
  evaluate,
  getAccountAddress,
  getBounty,
  getReport,
  getReportStake,
  reportCount,
  submitReport,
  topUp,
  withdraw,
  claimEarnings,
  getPendingBalance,
  getLeaderboard,
  getHunterProfile,
  fileAppeal,
  evaluateAppeal,
  getAppeal,
  getAppealCount,
} from "./genlayer.js";

const app = document.querySelector("#app");

const state = {
  activeView: "brand",
  bounties: [],
  reports: [],
  reportStake: 0n,
  pendingBalance: 0n,
  leaderboard: [],
  hunterProfile: { score: 0, tier: "BRONZE", submitted: 0, confirmed: 0, rejected: 0, accuracy_pct: 0 },
  appeals: [],
  selectedBounty: "",
  selectedReport: "",
  busy: "",
  error: "",
  notice: "",
  demoMode: false,
  tourStep: 0,
};

function formatWei(value) {
  try {
    const wei = BigInt(value || 0);
    const whole = wei / 10n ** 18n;
    const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 6);
    return `${whole}.${fraction} GEN`;
  } catch {
    return `${value} wei`;
  }
}

function toWei(value) {
  const text = String(value || "0").trim();
  if (!text) return 0n;
  const [whole, fraction = ""] = text.split(".");
  const safeWhole = whole === "" ? "0" : whole;
  const safeFraction = fraction.padEnd(18, "0").slice(0, 18);
  return BigInt(safeWhole) * 10n ** 18n + BigInt(safeFraction || "0");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statusClass(status) {
  if (status === "CONFIRMED") return "danger";
  if (status === "REJECTED") return "clear";
  if (status === "NEEDS_REVIEW") return "warning";
  return "pending";
}

function severityColor(severity) {
  const n = Number(severity || 0);
  if (n >= 71) return "var(--red)";
  if (n >= 31) return "var(--amber)";
  return "var(--green)";
}

function parseVerdict(report) {
  if (!report?.verdict) return {};
  try {
    return JSON.parse(report.verdict);
  } catch {
    return {};
  }
}

function transactionSummary(receipt) {
  if (!receipt) return "Transaction submitted.";
  const status = receipt.statusName || receipt.status || "finalized";
  return `Transaction ${status}.`;
}

async function run(label, action) {
  state.busy = label;
  state.error = "";
  state.notice = "";
  render();
  try {
    if (state.demoMode) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await action();
      state.notice = "Simulated action completed successfully under Demo Mode.";
    } else {
      const result = await action();
      state.notice = transactionSummary(result);
      await refreshData();
    }
  } catch (error) {
    state.error = error?.message || String(error);
  } finally {
    state.busy = "";
    render();
  }
}

async function refreshData() {
  const urlParams = new URLSearchParams(window.location.search);
  state.demoMode = urlParams.get("demo") === "1" || urlParams.get("demo") === "true";

  if (state.demoMode) {
    if (state.bounties.length === 0) {
      state.bounties = [
        {
          bounty_id: "0",
          brand: "0xBrand1Address...",
          name: "Acme Wallet",
          identity: "Official website: acme-wallet.xyz. Legitimate app download is only via google play store / app store. We never DM or ask for recovery phrases.",
          pool: 1000000000000000000n,
          base_reward: 200000000000000000n,
          active: true
        },
        {
          bounty_id: "1",
          brand: "0xBrand2Address...",
          name: "Jupiter Exchange",
          identity: "Official domain: jup.ag. We only launch tokens through our official site. Watch out for fake lookalike domains on X (Twitter).",
          pool: 1500000000000000000n,
          base_reward: 300000000000000000n,
          active: true
        },
        {
          bounty_id: "2",
          brand: "0xBrand3Address...",
          name: "Solana Devs",
          identity: "Official dev portal: solana.com/developers. We never run random token distributions via DMs.",
          pool: 0n,
          base_reward: 100000000000000000n,
          active: false
        }
      ];

      state.reports = [
        {
          report_id: "0",
          bounty_id: "0",
          hunter: getAccountAddress(),
          url: "https://login-acme-wallets.xyz",
          stake: 50000000000000000n,
          status: "CONFIRMED",
          severity: "85",
          payout: 170000000000000000n,
          verdict: JSON.stringify({
            canary: "abc12345",
            is_scam: true,
            scam_type: "phishing",
            severity: 85,
            confidence: 95,
            reasoning: "Impersonates Acme Wallet with a lookalike domain name and fake login UI.",
            perspectives: {
              forensic: "Domain registered 2 days ago under dynamic DNS. Hosting is flagged.",
              skeptic: "The branding looks correct, but it immediately asks for seed phrase.",
              legal: "Clear trademark violation of Acme Wallet logo and brand assets."
            }
          }),
          sources: JSON.stringify(["https://urlscan.io", "https://virustotal.com"])
        },
        {
          report_id: "1",
          bounty_id: "0",
          hunter: "0xHunter2Address...",
          url: "https://acme-wallet.xyz",
          stake: 50000000000000000n,
          status: "REJECTED",
          severity: "0",
          payout: 0n,
          verdict: JSON.stringify({
            canary: "def67890",
            is_scam: false,
            scam_type: "none",
            severity: 0,
            confidence: 100,
            reasoning: "This is the legitimate official Acme Wallet domain.",
            perspectives: {
              forensic: "Clean WHOIS, registered 6 years ago.",
              skeptic: "Legitimate website, no phishing indicators.",
              legal: "Legitimate brand property."
            }
          }),
          sources: JSON.stringify(["https://acme-wallet.xyz"])
        },
        {
          report_id: "2",
          bounty_id: "1",
          hunter: getAccountAddress(),
          url: "https://jup-tokens.xyz",
          stake: 50000000000000000n,
          status: "NEEDS_REVIEW",
          severity: "0",
          payout: 0n,
          verdict: JSON.stringify({
            canary: "xyz98765",
            is_scam: true,
            scam_type: "fake_giveaway",
            severity: 70,
            confidence: 55,
            reasoning: "Claims to offer token giveaways, but domain is newly registered. Low confidence on impersonation intent.",
            perspectives: {
              forensic: "Hosted on cloudflare, domain registered today.",
              skeptic: "Presents a countdown timer and claiming button, which is suspicious.",
              legal: "No direct brand logo abuse, but uses word 'jup' in domain."
            }
          }),
          sources: JSON.stringify(["https://urlscan.io"])
        },
        {
          report_id: "3",
          bounty_id: "1",
          hunter: getAccountAddress(),
          url: "https://jup-claims.net",
          stake: 50000000000000000n,
          status: "REJECTED",
          severity: "0",
          payout: 0n,
          verdict: JSON.stringify({
            canary: "app77777",
            is_scam: false,
            scam_type: "none",
            severity: 0,
            confidence: 90,
            reasoning: "Unclear domain content, flagged as safe.",
            perspectives: {
              forensic: "Unable to render suspect page content.",
              skeptic: "Shows a blank page or cloudflare block.",
              legal: "No visual trademark abuse detected."
            }
          }),
          sources: JSON.stringify([])
        }
      ];

      state.appeals = [];
      state.reportStake = 50000000000000000n;
      state.pendingBalance = 120000000000000000n;
      state.leaderboard = [
        { address: getAccountAddress(), score: 1450, tier: "SILVER", submitted: 15, confirmed: 15, rejected: 1, accuracy_pct: 93 },
        { address: "0xHunter2Address...", score: 850, tier: "BRONZE", submitted: 9, confirmed: 9, rejected: 1, accuracy_pct: 90 },
        { address: "0xHunter3Address...", score: 3200, tier: "GOLD", submitted: 32, confirmed: 32, rejected: 0, accuracy_pct: 100 }
      ];
      state.hunterProfile = { score: 1450, tier: "SILVER", submitted: 15, confirmed: 15, rejected: 1, accuracy_pct: 93 };
    }
    
    if (!state.selectedBounty && state.bounties.length) state.selectedBounty = state.bounties[0].bounty_id;
    return;
  }

  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;
  const address = getAccountAddress();
  try {
    const [bountyTotal, reportTotal, stake, pendingBal, leaderboard, profile, appealTotal] = await Promise.all([
      bountyCount(),
      reportCount(),
      getReportStake(),
      getPendingBalance(address).catch(() => 0n),
      getLeaderboard().catch(() => []),
      getHunterProfile(address).catch(() => ({ score: 0, tier: "BRONZE", submitted: 0, confirmed: 0, rejected: 0, accuracy_pct: 0 })),
      getAppealCount().catch(() => 0n),
    ]);
    const bountyIds = Array.from({ length: Number(bountyTotal) }, (_, index) => String(index));
    const reportIds = Array.from({ length: Number(reportTotal) }, (_, index) => String(index));
    const appealIds = Array.from({ length: Number(appealTotal) }, (_, index) => String(index));
    const [bounties, reports, appeals] = await Promise.all([
      Promise.all(bountyIds.map((id) => getBounty(id).catch(() => ({})))),
      Promise.all(reportIds.map((id) => getReport(id).catch(() => ({})))),
      Promise.all(appealIds.map((id) => getAppeal(id).catch(() => ({})))),
    ]);
    state.bounties = bounties.filter((item) => item && item.bounty_id !== undefined);
    state.reports = reports.filter((item) => item && item.report_id !== undefined);
    state.appeals = appeals.filter((item) => item && item.appeal_id !== undefined);
    state.reportStake = stake;
    state.pendingBalance = pendingBal;
    state.leaderboard = leaderboard || [];
    state.hunterProfile = profile || { score: 0, tier: "BRONZE", submitted: 0, confirmed: 0, rejected: 0, accuracy_pct: 0 };
    if (!state.selectedBounty && state.bounties.length) state.selectedBounty = state.bounties[0].bounty_id;
  } catch (err) {
    console.error("Contract queries failed, staying on last state or empty.", err);
  }
}

function onboardingWizard() {
  if (!state.tourStep) return "";
  
  const steps = [
    {
      title: "Welcome to Sentinel v2",
      text: "Sentinel is a decentralized anti-scam registry powered by GenLayer. Learn how to protect brands and earn rewards.",
      view: "brand"
    },
    {
      title: "1. Brand Console",
      text: "Brands write their brand identity details and fund bounty pools. This provides the 'ground truth' for our AI Consensus jury.",
      view: "brand"
    },
    {
      title: "2. Hunter Console",
      text: "Hunters search for suspect URLs, submit them with an anti-spam stake, and file appeals if they dispute a verdict.",
      view: "hunter"
    },
    {
      title: "3. Investigate Console",
      text: "Run AI Consensus on-chain. Sentinel fetches page text, screenshots, asks the AI jury, and reaches consensus dynamically.",
      view: "investigate"
    },
    {
      title: "4. Leaderboard",
      text: "Earn reputation points to level up through Bronze, Silver, Gold, and Diamond. Unlock stake discounts and platform fee waivers!",
      view: "leaderboard"
    }
  ];

  const current = steps[state.tourStep - 1];
  if (!current) return "";

  return `
    <div class="tour-overlay">
      <div class="tour-card">
        <div class="tour-progress">Step ${state.tourStep} of ${steps.length}</div>
        <h3>${escapeHtml(current.title)}</h3>
        <p>${escapeHtml(current.text)}</p>
        <div class="tour-buttons">
          ${state.tourStep > 1 
            ? `<button class="secondary claim-btn" id="tourPrevBtn" type="button">Back</button>` 
            : `<button class="ghost claim-btn danger-text" id="tourSkipBtn" type="button">Skip</button>`
          }
          ${state.tourStep < steps.length
            ? `<button class="primary claim-btn" id="tourNextBtn" type="button">Next</button>`
            : `<button class="primary claim-btn" id="tourFinishBtn" type="button">Finish Tour</button>`
          }
        </div>
      </div>
    </div>
  `;
}

function shell(content) {
  const showClaim = state.pendingBalance > 0n;
  const demoBanner = state.demoMode
    ? `
    <div class="banner warning" style="border-color: rgba(255, 184, 77, 0.45); background: rgba(255, 184, 77, 0.08); color: #ffeab9; display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px;">
      <span><strong>Demo Mode Active:</strong> Simulating in-memory operations with pre-seeded mockup data.</span>
      <a href="?" style="color: var(--blue); font-weight: bold; text-decoration: none;">Exit Demo</a>
    </div>
    `
    : "";
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">GenLayer Intelligent Contract dApp</p>
        <h1>Sentinel</h1>
      </div>
      <div class="account-actions">
        ${
          showClaim
            ? `
            <div class="claim-panel">
              <span>Earnings: <strong>${formatWei(state.pendingBalance)}</strong></span>
              <button class="primary claim-btn" id="claimEarningsBtn">Claim</button>
            </div>
            `
            : ""
        }
        <div class="account">
          <span>Operator [${state.hunterProfile.tier} — ${state.hunterProfile.score} pts]</span>
          <strong>${escapeHtml(getAccountAddress())}</strong>
        </div>
      </div>
    </header>
    <nav class="tabs" aria-label="Sentinel consoles">
      ${tabButton("brand", "Brand Console")}
      ${tabButton("hunter", "Hunter Console")}
      ${tabButton("investigate", "Investigate")}
      ${tabButton("leaderboard", "Leaderboard")}
    </nav>
    ${demoBanner}
    ${state.demoMode ? "" : contractWarning()}
    ${state.busy ? `<div class="banner pulse">${escapeHtml(state.busy)}</div>` : ""}
    ${state.error ? `<div class="banner error">${escapeHtml(state.error)}</div>` : ""}
    ${state.notice ? `<div class="banner success">${escapeHtml(state.notice)}</div>` : ""}
    <main>${content}</main>
    ${onboardingWizard()}
  `;
}

function contractWarning() {
  if (CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") return "";
  return `
    <div class="banner error">
      Contract address is still the placeholder. Deploy contracts/sentinel.py in GenLayer Studio, then set VITE_CONTRACT_ADDRESS in frontend/.env.
    </div>
  `;
}

function tabButton(id, label) {
  return `<button class="tab ${state.activeView === id ? "active" : ""}" data-view="${id}">${label}</button>`;
}

function brandView() {
  const brandReports = state.reports.filter((report) => {
    const bounty = state.bounties.find((item) => item.bounty_id === report.bounty_id);
    return Boolean(bounty);
  });
  return shell(`
    <section class="grid two">
      <form class="panel" id="createBountyForm">
        <div class="panel-title">
          <span class="signal"></span>
          <h2>Create bounty</h2>
        </div>
        <label>Brand name<input name="name" placeholder="Acme Wallet" required /></label>
        <label>Official identity<textarea name="identity" rows="6" placeholder="Official site acme.xyz; official X @acmewallet; we never DM seed phrases; no giveaways" required></textarea></label>
        <div class="form-grid">
          <label>Base reward at severity 100<input name="baseReward" inputmode="decimal" placeholder="0.05" required /></label>
          <label>Initial pool funding<input name="fund" inputmode="decimal" placeholder="1.0" required /></label>
        </div>
        <button class="primary" type="submit">Fund Bounty</button>
      </form>
      <form class="panel" id="manageBountyForm">
        <div class="panel-title">
          <span class="signal blue"></span>
          <h2>Manage pool</h2>
        </div>
        <label>Bounty id<input name="id" placeholder="0" required /></label>
        <label>Top-up amount<input name="fund" inputmode="decimal" placeholder="0.25" /></label>
        <div class="button-row">
          <button class="secondary" name="action" value="topup" type="submit">Top Up</button>
          <button class="ghost danger-text" name="action" value="withdraw" type="submit">Deactivate & Withdraw</button>
        </div>
        <p class="metric">Required report stake: <strong>${formatWei(state.reportStake)}</strong></p>
      </form>
    </section>
    <section class="section-block">
      <div class="section-heading">
        <h2>Bounty ledger</h2>
        <button class="icon-button" id="refreshButton" type="button" title="Refresh">Refresh</button>
      </div>
      ${bountyTable(state.bounties)}
    </section>
    <section class="section-block">
      <div class="section-heading"><h2>Reports</h2></div>
      ${reportTable(brandReports)}
    </section>
  `);
}

function hunterView() {
  const currentAddress = getAccountAddress();
  // Filter reports that this user submitted and can appeal (status is REJECTED or NEEDS_REVIEW)
  const appealableReports = state.reports.filter(
    (r) => r.hunter.toLowerCase() === currentAddress.toLowerCase() && (r.status === "REJECTED" || r.status === "NEEDS_REVIEW")
  );
  
  // Also filter appeals submitted by this hunter
  const myAppeals = state.appeals.filter((a) => {
    const report = state.reports.find((r) => r.report_id === a.report_id);
    return report && report.hunter.toLowerCase() === currentAddress.toLowerCase();
  });

  return shell(`
    <section class="grid hunter-grid">
      <div style="display: flex; flex-direction: column; gap: 18px;">
        <form class="panel" id="submitReportForm">
          <div class="panel-title">
            <span class="signal amber"></span>
            <h2>Submit suspect URL</h2>
          </div>
          <label>Bounty id
            <select name="bountyId" required>
              ${state.bounties
                .filter((bounty) => bounty.active)
                .map((bounty) => `<option value="${escapeHtml(bounty.bounty_id)}">#${escapeHtml(bounty.bounty_id)} ${escapeHtml(bounty.name)}</option>`)
                .join("")}
            </select>
          </label>
          <label>Suspect URL<input name="url" placeholder="https://login-acme-wallet.example" required /></label>
          <label>Stake<input name="stake" inputmode="decimal" value="${formatStakeInput()}" /></label>
          <button class="primary" type="submit">Submit Report</button>
        </form>

        <form class="panel" id="fileAppealForm">
          <div class="panel-title">
            <span class="signal red"></span>
            <h2>File appeal</h2>
          </div>
          <p class="hint" style="margin-top: 0; margin-bottom: 12px; font-size: 0.82rem;">
            Dispute a REJECTED or NEEDS_REVIEW verdict. Requires an appeal fee equal to the original report stake.
          </p>
          <label>Report ID
            <select name="reportId" required>
              ${appealableReports.length > 0 
                ? appealableReports.map(r => `<option value="${escapeHtml(r.report_id)}" ${state.selectedReport === r.report_id ? "selected" : ""}>Report #${escapeHtml(r.report_id)} (${escapeHtml(r.status)})</option>`).join("")
                : `<option value="">No eligible reports to appeal</option>`
              }
            </select>
          </label>
          <button class="secondary" type="submit" ${appealableReports.length === 0 ? "disabled" : ""}>File Appeal</button>
        </form>
      </div>

      <div class="bounty-cards">
        ${state.bounties.length ? state.bounties.map(bountyCard).join("") : emptyState("No active bounties loaded yet.")}
      </div>
    </section>

    <section class="section-block">
      <div class="section-heading"><h2>My Appeals</h2></div>
      ${appealTable(myAppeals)}
    </section>
  `);
}

function formatStakeInput() {
  if (state.reportStake === 0n) return "0";
  const whole = state.reportStake / 10n ** 18n;
  const fraction = (state.reportStake % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function investigateView() {
  const report = state.selectedReport
    ? state.reports.find((item) => item.report_id === state.selectedReport)
    : state.reports.at(-1);
  return shell(`
    <section class="grid investigate-grid">
      <form class="panel" id="evaluateForm">
        <div class="panel-title">
          <span class="signal red"></span>
          <h2>Run AI investigation</h2>
        </div>
        <label>Report id<input name="reportId" placeholder="0" value="${escapeHtml(report?.report_id ?? "")}" required /></label>
        <button class="primary alert" type="submit">Run AI Investigation</button>
        <p class="hint">Sentinel fetches rendered page text, captures a screenshot, asks the AI jury, reaches consensus, then pays or rejects on-chain.</p>
      </form>
      <div>${report ? verdictCard(report) : emptyState("Choose or evaluate a report to see the verdict.")}</div>
    </section>
    <section class="section-block">
      <div class="section-heading"><h2>Report queue</h2></div>
      ${reportTable(state.reports)}
    </section>
  `);
}

function bountyTable(bounties) {
  if (!bounties.length) return emptyState("No bounties loaded yet.");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Brand</th><th>Pool</th><th>Base Reward</th><th>Status</th></tr></thead>
        <tbody>
          ${bounties
            .map(
              (bounty) => `
                <tr>
                  <td>#${escapeHtml(bounty.bounty_id)}</td>
                  <td><strong>${escapeHtml(bounty.name)}</strong><span>${escapeHtml(bounty.brand)}</span></td>
                  <td>${formatWei(bounty.pool)}</td>
                  <td>${formatWei(bounty.base_reward)}</td>
                  <td><span class="chip ${bounty.active ? "pending" : "clear"}">${bounty.active ? "ACTIVE" : "INACTIVE"}</span></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function reportTable(reports) {
  if (!reports.length) return emptyState("No reports loaded yet.");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Bounty</th><th>Suspect URL</th><th>Status</th><th>Payout</th></tr></thead>
        <tbody>
          ${reports
            .map(
              (report) => `
                <tr class="clickable" data-report-id="${escapeHtml(report.report_id)}">
                  <td>#${escapeHtml(report.report_id)}</td>
                  <td>#${escapeHtml(report.bounty_id)}</td>
                  <td><code>${escapeHtml(report.url)}</code></td>
                  <td><span class="chip ${statusClass(report.status)}">${escapeHtml(report.status)}</span></td>
                  <td>${formatWei(report.payout)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function bountyCard(bounty) {
  return `
    <article class="bounty-card">
      <div>
        <span class="chip ${bounty.active ? "pending" : "clear"}">${bounty.active ? "ACTIVE" : "INACTIVE"}</span>
        <h3>#${escapeHtml(bounty.bounty_id)} ${escapeHtml(bounty.name)}</h3>
      </div>
      <p>${escapeHtml(bounty.identity)}</p>
      <dl>
        <div><dt>Pool</dt><dd>${formatWei(bounty.pool)}</dd></div>
        <div><dt>Severity 100</dt><dd>${formatWei(bounty.base_reward)}</dd></div>
      </dl>
    </article>
  `;
}

function verdictCard(report) {
  const verdict = parseVerdict(report);
  const severity = Number(report.severity || verdict.severity || 0);
  const confidence = Number(verdict.confidence || 0);
  const perspectives = verdict.perspectives || {};

  let perspectivesHtml = "";
  if (perspectives.forensic || perspectives.skeptic || perspectives.legal) {
    perspectivesHtml = `
      <div class="perspectives">
        <details class="perspective">
          <summary>Forensic Analyst Perspective</summary>
          <p>${escapeHtml(perspectives.forensic || "No analysis available.")}</p>
        </details>
        <details class="perspective">
          <summary>Skeptical User Perspective</summary>
          <p>${escapeHtml(perspectives.skeptic || "No analysis available.")}</p>
        </details>
        <details class="perspective">
          <summary>Brand Lawyer Perspective</summary>
          <p>${escapeHtml(perspectives.legal || "No analysis available.")}</p>
        </details>
      </div>
    `;
  }

  let confidenceHtml = "";
  if (verdict.confidence !== undefined) {
    confidenceHtml = `
      <div class="confidence-meter" title="AI Consensus Confidence">
        <span>Confidence</span>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${confidence}%"></div>
        </div>
        <strong>${confidence}%</strong>
      </div>
    `;
  }

  let sourcesListHtml = "";
  if (report.sources) {
    try {
      const sources = JSON.parse(report.sources);
      if (sources && sources.length > 0) {
        sourcesListHtml = `
          <div class="sources-list">
            <span>Cross-referenced Sources (${sources.length})</span>
            <ul>
              ${sources.map(src => `<li><a href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src)}</a></li>`).join("")}
            </ul>
          </div>
        `;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  let appealBtnHtml = "";
  const currentAddress = getAccountAddress();
  const isMyReport = report.hunter.toLowerCase() === currentAddress.toLowerCase();
  if (isMyReport && (report.status === "REJECTED" || report.status === "NEEDS_REVIEW")) {
    appealBtnHtml = `
      <div class="verdict-appeal-box" style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.82rem; color: var(--muted);">Disputed verdict? File an appeal to trigger re-evaluation.</span>
        <button class="secondary claim-btn file-appeal-direct-btn" data-report-id="${escapeHtml(report.report_id)}" data-stake="${escapeHtml(report.stake)}" type="button">Appeal Verdict</button>
      </div>
    `;
  }

  let appealStatusHtml = "";
  if (report.status === "APPEALED") {
    const appeal = state.appeals.find((a) => a.report_id === report.report_id);
    if (appeal) {
      appealStatusHtml = `
        <div class="verdict-appeal-box" style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.82rem; color: var(--muted);">Appeal #${escapeHtml(appeal.appeal_id)} is pending re-evaluation.</span>
          ${appeal.status === "PENDING"
            ? `<button class="primary claim-btn evaluate-appeal-btn" data-appeal-id="${escapeHtml(appeal.appeal_id)}" type="button">Evaluate Appeal</button>`
            : `<span class="badge badge-${appeal.status === "OVERTURNED" ? "gold" : "silver"}">${escapeHtml(appeal.status)}</span>`
          }
        </div>
      `;
    }
  }

  return `
    <article class="verdict">
      <div class="verdict-head">
        <div>
          <p class="eyebrow">Report #${escapeHtml(report.report_id)}</p>
          <h2>Verdict</h2>
        </div>
        <span class="chip ${statusClass(report.status)}">${escapeHtml(report.status)}</span>
      </div>
      <div class="gauge" style="--severity:${severity}; --severity-color:${severityColor(severity)}">
        <span></span>
      </div>
      <div class="verdict-grid">
        <div><span>Severity</span><strong>${severity}/100</strong></div>
        <div><span>Type</span><strong>${escapeHtml(verdict.scam_type || "pending")}</strong></div>
        <div><span>Payout</span><strong>${formatWei(report.payout)}</strong></div>
      </div>
      ${confidenceHtml}
      <p class="reasoning">${escapeHtml(verdict.reasoning || "Awaiting investigation.")}</p>
      ${perspectivesHtml}
      <div class="inert-url"><span>Suspect URL</span><code>${escapeHtml(report.url)}</code></div>
      ${sourcesListHtml}
      ${appealBtnHtml}
      ${appealStatusHtml}
    </article>
  `;
}

function emptyState(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function appealTable(appeals) {
  if (!appeals || !appeals.length) return emptyState("No appeals filed yet.");
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Appeal ID</th>
            <th>Report ID</th>
            <th>Original Status</th>
            <th>Locked Fee</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${appeals
            .map((appeal) => {
              const showEval = appeal.status === "PENDING";
              return `
                <tr>
                  <td>#${escapeHtml(appeal.appeal_id)}</td>
                  <td>#${escapeHtml(appeal.report_id)}</td>
                  <td><span class="chip warning">${escapeHtml(appeal.original_status)}</span></td>
                  <td>${formatWei(appeal.fee)}</td>
                  <td><span class="chip ${appeal.status === "OVERTURNED" ? "success" : appeal.status === "UPHELD" ? "clear" : "pending"}">${escapeHtml(appeal.status)}</span></td>
                  <td>
                    ${showEval 
                      ? `<button class="primary claim-btn evaluate-appeal-btn" data-appeal-id="${escapeHtml(appeal.appeal_id)}">Evaluate</button>`
                      : `<span class="muted-text">Completed</span>`
                    }
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}


function leaderboardTable(leaderboard) {
  if (!leaderboard || !leaderboard.length) return emptyState("No hunters on the leaderboard yet.");
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Hunter Address</th>
            <th>Reputation Score</th>
            <th>Tier</th>
            <th>Accuracy</th>
            <th>Outcome (Conf/Rej)</th>
          </tr>
        </thead>
        <tbody>
          ${leaderboard
            .map((h, i) => {
              const currentAddress = getAccountAddress();
              const isMe = h.address.toLowerCase() === currentAddress.toLowerCase();
              const rank = i + 1;
              let rankText = `#${rank}`;
              if (rank === 1) rankText = "🥇 #1";
              else if (rank === 2) rankText = "🥈 #2";
              else if (rank === 3) rankText = "🥉 #3";
              
              return `
                <tr class="${isMe ? "active-row" : ""}">
                  <td><strong>${rankText}</strong></td>
                  <td><code>${escapeHtml(h.address)}</code> ${isMe ? '<span class="me-tag">(You)</span>' : ""}</td>
                  <td><strong>${h.score} pts</strong></td>
                  <td><span class="badge badge-${h.tier.toLowerCase()}">${escapeHtml(h.tier)}</span></td>
                  <td>${h.accuracy_pct}%</td>
                  <td>${h.confirmed} / ${h.rejected}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function leaderboardView() {
  const profile = state.hunterProfile;
  const currentAddress = getAccountAddress();
  
  let tierInfo = "";
  if (profile.tier === "BRONZE") {
    tierInfo = "BRONZE Tier: standard 100% stake required. Earn points to level up!";
  } else if (profile.tier === "SILVER") {
    tierInfo = "SILVER Tier (threshold &gt;= 1000): standard 100% stake required. Earn points to reach GOLD!";
  } else if (profile.tier === "GOLD") {
    tierInfo = "GOLD Tier (threshold &gt;= 3000): <strong>50% stake discount</strong> & payout fee deductions fully waived!";
  } else if (profile.tier === "DIAMOND") {
    tierInfo = "DIAMOND Tier (threshold &gt;= 10000): <strong>75% stake discount</strong> & payout fee deductions fully waived!";
  }
  
  return shell(`
    <section class="grid hunter-grid">
      <div class="panel">
        <div class="panel-title">
          <span class="signal blue"></span>
          <h2>My Reputation</h2>
        </div>
        <div class="profile-card">
          <div class="profile-tier-badge badge-${profile.tier.toLowerCase()}">${escapeHtml(profile.tier)}</div>
          <div class="profile-stat">
            <span>Reputation Score</span>
            <strong>${profile.score} pts</strong>
          </div>
          <div class="profile-stat">
            <span>Accuracy Rate</span>
            <strong>${profile.accuracy_pct}%</strong>
          </div>
          <div class="profile-stat">
            <span>Submitted Reports</span>
            <strong>${profile.submitted} total</strong>
          </div>
          <div class="profile-stat-sub">
            <span>Confirmed: ${profile.confirmed} &bull; Rejected: ${profile.rejected}</span>
          </div>
          <p class="hint">${tierInfo}</p>
        </div>
      </div>
      
      <section class="section-block" style="margin-top: 0;">
        <div class="section-heading" style="margin-bottom: 18px;">
          <h2>Top 10 Hunters Leaderboard</h2>
          <button class="icon-button" id="refreshButton" type="button" title="Refresh">Refresh</button>
        </div>
        ${leaderboardTable(state.leaderboard)}
      </section>
    </section>
  `);
}


function render() {
  if (state.activeView === "hunter") app.innerHTML = hunterView();
  else if (state.activeView === "investigate") app.innerHTML = investigateView();
  else if (state.activeView === "leaderboard") app.innerHTML = leaderboardView();
  else app.innerHTML = brandView();
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    // Tour Buttons
    if (event.target.closest("#tourNextBtn")) {
      state.tourStep += 1;
      const stepsViews = ["brand", "brand", "hunter", "investigate", "leaderboard"];
      state.activeView = stepsViews[state.tourStep - 1];
      render();
      return;
    }

    if (event.target.closest("#tourPrevBtn")) {
      state.tourStep -= 1;
      const stepsViews = ["brand", "brand", "hunter", "investigate", "leaderboard"];
      state.activeView = stepsViews[state.tourStep - 1];
      render();
      return;
    }

    if (event.target.closest("#tourSkipBtn") || event.target.closest("#tourFinishBtn")) {
      state.tourStep = 0;
      localStorage.setItem("sentinel_onboarding_completed", "true");
      render();
      return;
    }

    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.activeView = viewButton.dataset.view;
      render();
      return;
    }

    const evalAppealBtn = event.target.closest(".evaluate-appeal-btn");
    if (evalAppealBtn) {
      const appealId = evalAppealBtn.dataset.appealId;
      if (state.demoMode) {
        run("Evaluating appeal consensus...", async () => {
          const appeal = state.appeals.find((a) => a.appeal_id === appealId);
          if (appeal) {
            const report = state.reports.find((r) => r.report_id === appeal.report_id);
            if (report) {
              const isScam = true;
              const severity = 90;
              const confidence = 98;
              
              report.status = "CONFIRMED";
              report.severity = String(severity);
              appeal.status = "OVERTURNED";
              
              const bounty = state.bounties.find((b) => b.bounty_id === report.bounty_id);
              let payout = 0n;
              if (bounty) {
                payout = (bounty.base_reward * BigInt(severity)) / 100n;
                if (payout > bounty.pool) payout = bounty.pool;
                bounty.pool -= payout;
              }
              report.payout = payout;
              
              if (appeal.original_status === "REJECTED") {
                state.hunterProfile.rejected = Math.max(0, state.hunterProfile.rejected - 1);
              }
              state.hunterProfile.confirmed += 1;
              state.hunterProfile.score += 100;
              
              const total = state.hunterProfile.confirmed + state.hunterProfile.rejected;
              state.hunterProfile.accuracy_pct = total > 0 ? Math.floor((state.hunterProfile.confirmed * 100) / total) : 0;
              
              if (state.hunterProfile.score >= 10000) state.hunterProfile.tier = "DIAMOND";
              else if (state.hunterProfile.score >= 3000) state.hunterProfile.tier = "GOLD";
              else if (state.hunterProfile.score >= 1000) state.hunterProfile.tier = "SILVER";
              else state.hunterProfile.tier = "BRONZE";
              
              report.verdict = JSON.stringify({
                canary: "demoappealcanary",
                is_scam: isScam,
                scam_type: "phishing",
                severity: severity,
                confidence: confidence,
                reasoning: `Appeal re-evaluation confirmed scam indicators on ${report.url} that were previously obscured.`,
                perspectives: {
                  forensic: "Deep inspection resolved lookalike obfuscation.",
                  skeptic: "Interactive prompts validated visual threats.",
                  legal: "Unauthorized trademark use confirmed."
                }
              });
              appeal.verdict = report.verdict;
            }
          }
        });
      } else {
        run("Evaluating appeal consensus...", async () => {
          await evaluateAppeal(appealId);
        });
      }
      return;
    }

    const fileAppealDirectBtn = event.target.closest(".file-appeal-direct-btn");
    if (fileAppealDirectBtn) {
      const reportId = fileAppealDirectBtn.dataset.reportId;
      const stake = fileAppealDirectBtn.dataset.stake;
      if (state.demoMode) {
        run("Filing appeal and locking appeal fee...", async () => {
          const newId = String(state.appeals.length);
          const report = state.reports.find((r) => r.report_id === reportId);
          if (report) {
            state.appeals.push({
              appeal_id: newId,
              report_id: reportId,
              status: "PENDING",
              fee: report.stake,
              original_status: report.status,
              verdict: ""
            });
            report.status = "APPEALED";
          }
        });
      } else {
        run("Filing appeal and locking appeal fee...", async () => {
          await fileAppeal(reportId, BigInt(stake));
        });
      }
      return;
    }

    const reportRow = event.target.closest("[data-report-id]");
    if (reportRow) {
      state.selectedReport = reportRow.dataset.reportId;
      state.activeView = "investigate";
      render();
      return;
    }

    if (event.target.closest("#refreshButton")) {
      run("Refreshing on-chain state...", async () => {
        await refreshData();
      });
    }

    if (event.target.closest("#claimEarningsBtn")) {
      run("Claiming pending earnings...", async () => {
        if (state.demoMode) {
          state.pendingBalance = 0n;
        } else {
          await claimEarnings();
        }
      });
    }
  });

  document.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);

    if (form.id === "createBountyForm") {
      if (state.demoMode) {
        run("Funding bounty pool and writing brand identity...", async () => {
          const newId = String(state.bounties.length);
          state.bounties.push({
            bounty_id: newId,
            brand: getAccountAddress(),
            name: data.get("name"),
            identity: data.get("identity"),
            pool: toWei(data.get("fund")),
            base_reward: toWei(data.get("baseReward")),
            active: true
          });
          state.selectedBounty = newId;
        });
      } else {
        run("Funding bounty pool and writing brand identity...", () =>
          createBounty(data.get("name"), data.get("identity"), toWei(data.get("baseReward")), toWei(data.get("fund"))),
        );
      }
    }

    if (form.id === "manageBountyForm") {
      const action = event.submitter?.value;
      const bId = data.get("id");
      if (state.demoMode) {
        run(action === "withdraw" ? "Deactivating bounty..." : "Topping up...", async () => {
          const bounty = state.bounties.find((b) => b.bounty_id === bId);
          if (bounty) {
            if (action === "withdraw") {
              bounty.active = false;
              bounty.pool = 0n;
            } else {
              bounty.pool += toWei(data.get("fund"));
            }
          }
        });
      } else {
        if (action === "withdraw") {
          run("Deactivating bounty and withdrawing remaining pool...", () => withdraw(bId));
        } else {
          run("Adding funds to bounty pool...", () => topUp(bId, toWei(data.get("fund"))));
        }
      }
    }

    if (form.id === "submitReportForm") {
      if (state.demoMode) {
        run("Submitting suspect URL with anti-spam stake...", async () => {
          const newId = String(state.reports.length);
          state.reports.push({
            report_id: newId,
            bounty_id: data.get("bountyId"),
            hunter: getAccountAddress(),
            url: data.get("url"),
            stake: toWei(data.get("stake")),
            status: "PENDING",
            severity: "0",
            payout: 0n,
            verdict: "",
            sources: "[]"
          });
          state.hunterProfile.submitted += 1;
        });
      } else {
        run("Submitting suspect URL with anti-spam stake...", () =>
          submitReport(data.get("bountyId"), data.get("url"), toWei(data.get("stake"))),
        );
      }
    }

    if (form.id === "fileAppealForm") {
      const reportId = data.get("reportId");
      if (!reportId) {
        state.error = "Please select a report to appeal.";
        render();
        return;
      }
      const report = state.reports.find((r) => r.report_id === reportId);
      if (!report) {
        state.error = "Selected report not found.";
        render();
        return;
      }
      if (state.demoMode) {
        run("Filing appeal and locking appeal fee...", async () => {
          const newId = String(state.appeals.length);
          state.appeals.push({
            appeal_id: newId,
            report_id: reportId,
            status: "PENDING",
            fee: report.stake,
            original_status: report.status,
            verdict: ""
          });
          report.status = "APPEALED";
        });
      } else {
        run("Filing appeal and locking appeal fee...", () =>
          fileAppeal(reportId, BigInt(report.stake))
        );
      }
    }

    if (form.id === "evaluateForm") {
      const reportId = data.get("reportId");
      state.selectedReport = reportId;
      if (state.demoMode) {
        run("Sentinel is fetching the page, screenshotting it, asking the AI jury, and reaching consensus...", async () => {
          const r = state.reports.find((item) => item.report_id === reportId);
          if (r) {
            const isScam = r.url.includes("fake") || r.url.includes("phish") || r.url.includes("claim") || Math.random() > 0.5;
            const severity = isScam ? Math.floor(Math.random() * 50) + 50 : 0;
            const confidence = Math.floor(Math.random() * 30) + 70;
            
            r.status = isScam ? "CONFIRMED" : "REJECTED";
            r.severity = String(severity);
            
            if (isScam) {
              const bounty = state.bounties.find((b) => b.bounty_id === r.bounty_id);
              let payout = 0n;
              if (bounty) {
                payout = (bounty.base_reward * BigInt(severity)) / 100n;
                if (payout > bounty.pool) payout = bounty.pool;
                bounty.pool -= payout;
              }
              r.payout = payout;
              state.hunterProfile.confirmed += 1;
              state.hunterProfile.score += 100;
            } else {
              r.payout = 0n;
              state.hunterProfile.rejected += 1;
              state.hunterProfile.score = Math.max(0, state.hunterProfile.score - 30);
            }
            
            const total = state.hunterProfile.confirmed + state.hunterProfile.rejected;
            state.hunterProfile.accuracy_pct = total > 0 ? Math.floor((state.hunterProfile.confirmed * 100) / total) : 0;
            
            if (state.hunterProfile.score >= 10000) state.hunterProfile.tier = "DIAMOND";
            else if (state.hunterProfile.score >= 3000) state.hunterProfile.tier = "GOLD";
            else if (state.hunterProfile.score >= 1000) state.hunterProfile.tier = "SILVER";
            else state.hunterProfile.tier = "BRONZE";
            
            r.verdict = JSON.stringify({
              canary: "demo1234",
              is_scam: isScam,
              scam_type: isScam ? "phishing" : "none",
              severity: severity,
              confidence: confidence,
              reasoning: isScam 
                ? `Demo consensus verified that ${r.url} is an active credential phishing page impersonating the official brand.` 
                : "Demo consensus confirmed this page contains no threat artifacts.",
              perspectives: {
                forensic: isScam ? "Suspicious WHOIS details matched active threats." : "WHOIS and DNS indicators are valid.",
                skeptic: isScam ? "Branding copycat elements detected." : "Normal user workflow.",
                legal: isScam ? "Trademark abuse and unauthorized brand usage detected." : "No trademark violations."
              }
            });
            r.sources = JSON.stringify(["https://urlscan.io", "https://virustotal.com"]);
          }
        });
      } else {
        run("Sentinel is fetching the page, screenshotting it, asking the AI jury, and reaching consensus...", () => evaluate(reportId));
      }
    }
  });
}

bindEvents();
render();

const urlParams = new URLSearchParams(window.location.search);
state.demoMode = urlParams.get("demo") === "1" || urlParams.get("demo") === "true";
if (state.demoMode && !localStorage.getItem("sentinel_demo_onboarded")) {
  state.tourStep = 1;
  localStorage.setItem("sentinel_demo_onboarded", "true");
} else if (!localStorage.getItem("sentinel_onboarding_completed")) {
  state.tourStep = 1;
}

refreshData()
  .catch((error) => {
    state.error = error?.message || String(error);
  })
  .finally(render);

