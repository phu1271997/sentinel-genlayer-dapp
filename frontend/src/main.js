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
} from "./genlayer.js";

const app = document.querySelector("#app");

const state = {
  activeView: "brand",
  bounties: [],
  reports: [],
  reportStake: 0n,
  selectedBounty: "",
  selectedReport: "",
  busy: "",
  error: "",
  notice: "",
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
    const result = await action();
    state.notice = transactionSummary(result);
    await refreshData();
  } catch (error) {
    state.error = error?.message || String(error);
  } finally {
    state.busy = "";
    render();
  }
}

async function refreshData() {
  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;
  const [bountyTotal, reportTotal, stake] = await Promise.all([bountyCount(), reportCount(), getReportStake()]);
  const bountyIds = Array.from({ length: Number(bountyTotal) }, (_, index) => String(index));
  const reportIds = Array.from({ length: Number(reportTotal) }, (_, index) => String(index));
  const [bounties, reports] = await Promise.all([
    Promise.all(bountyIds.map((id) => getBounty(id).catch(() => ({})))),
    Promise.all(reportIds.map((id) => getReport(id).catch(() => ({})))),
  ]);
  state.bounties = bounties.filter((item) => item && item.bounty_id !== undefined);
  state.reports = reports.filter((item) => item && item.report_id !== undefined);
  state.reportStake = stake;
  if (!state.selectedBounty && state.bounties.length) state.selectedBounty = state.bounties[0].bounty_id;
}

function shell(content) {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">GenLayer Intelligent Contract dApp</p>
        <h1>Sentinel</h1>
      </div>
      <div class="account">
        <span>Operator</span>
        <strong>${escapeHtml(getAccountAddress())}</strong>
      </div>
    </header>
    <nav class="tabs" aria-label="Sentinel consoles">
      ${tabButton("brand", "Brand Console")}
      ${tabButton("hunter", "Hunter Console")}
      ${tabButton("investigate", "Investigate")}
    </nav>
    ${contractWarning()}
    ${state.busy ? `<div class="banner pulse">${escapeHtml(state.busy)}</div>` : ""}
    ${state.error ? `<div class="banner error">${escapeHtml(state.error)}</div>` : ""}
    ${state.notice ? `<div class="banner success">${escapeHtml(state.notice)}</div>` : ""}
    <main>${content}</main>
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
  return shell(`
    <section class="grid hunter-grid">
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
      <div class="bounty-cards">
        ${state.bounties.length ? state.bounties.map(bountyCard).join("") : emptyState("No active bounties loaded yet.")}
      </div>
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
      <p class="reasoning">${escapeHtml(verdict.reasoning || "Awaiting investigation.")}</p>
      <div class="inert-url"><span>Suspect URL</span><code>${escapeHtml(report.url)}</code></div>
    </article>
  `;
}

function emptyState(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function render() {
  if (state.activeView === "hunter") app.innerHTML = hunterView();
  else if (state.activeView === "investigate") app.innerHTML = investigateView();
  else app.innerHTML = brandView();
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.activeView = viewButton.dataset.view;
      render();
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
  });

  document.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);

    if (form.id === "createBountyForm") {
      run("Funding bounty pool and writing brand identity...", () =>
        createBounty(data.get("name"), data.get("identity"), toWei(data.get("baseReward")), toWei(data.get("fund"))),
      );
    }

    if (form.id === "manageBountyForm") {
      const action = event.submitter?.value;
      if (action === "withdraw") {
        run("Deactivating bounty and withdrawing remaining pool...", () => withdraw(data.get("id")));
      } else {
        run("Adding funds to bounty pool...", () => topUp(data.get("id"), toWei(data.get("fund"))));
      }
    }

    if (form.id === "submitReportForm") {
      run("Submitting suspect URL with anti-spam stake...", () =>
        submitReport(data.get("bountyId"), data.get("url"), toWei(data.get("stake"))),
      );
    }

    if (form.id === "evaluateForm") {
      const reportId = data.get("reportId");
      state.selectedReport = reportId;
      run("Sentinel is fetching the page, screenshotting it, asking the AI jury, and reaching consensus...", () => evaluate(reportId));
    }
  });
}

bindEvents();
render();
refreshData()
  .catch((error) => {
    state.error = error?.message || String(error);
  })
  .finally(render);
