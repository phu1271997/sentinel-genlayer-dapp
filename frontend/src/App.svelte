<script>
  import { onMount } from "svelte";
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

  import BrandConsole from "./BrandConsole.svelte";
  import HunterConsole from "./HunterConsole.svelte";
  import InvestigateConsole from "./InvestigateConsole.svelte";
  import LeaderboardConsole from "./LeaderboardConsole.svelte";

  // State Management using Svelte 5 Runes
  let state = $state({
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
  });

  let theme = $state("dark");
  let toasts = $state([]);

  const currentAddress = getAccountAddress();

  function addToast(message, type = "info", duration = 4000) {
    const id = Date.now() + Math.random();
    toasts.push({ id, message, type });
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
    }, duration);
  }

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("sentinel_theme", theme);
  }

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

  function transactionSummary(receipt) {
    if (!receipt) return "Transaction submitted.";
    const status = receipt.statusName || receipt.status || "finalized";
    return `Transaction ${status}.`;
  }

  async function run(label, action) {
    state.busy = label;
    state.error = "";
    state.notice = "";
    try {
      if (state.demoMode) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await action();
        state.notice = "Simulated action completed successfully under Demo Mode.";
        addToast(state.notice, "success");
      } else {
        const result = await action();
        state.notice = transactionSummary(result);
        addToast(state.notice, "success");
        await refreshData();
      }
    } catch (error) {
      state.error = error?.message || String(error);
      addToast(state.error, "error");
    } finally {
      state.busy = "";
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
            hunter: currentAddress,
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
            hunter: currentAddress,
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
            hunter: currentAddress,
            url: "https://jup-claims.net",
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
          { address: currentAddress, score: 1450, tier: "SILVER", submitted: 15, confirmed: 15, rejected: 1, accuracy_pct: 93 },
          { address: "0xHunter2Address...", score: 850, tier: "BRONZE", submitted: 9, confirmed: 9, rejected: 1, accuracy_pct: 90 },
          { address: "0xHunter3Address...", score: 3200, tier: "GOLD", submitted: 32, confirmed: 32, rejected: 0, accuracy_pct: 100 }
        ];
        state.hunterProfile = { score: 1450, tier: "SILVER", submitted: 15, confirmed: 15, rejected: 1, accuracy_pct: 93 };
      }
      
      if (!state.selectedBounty && state.bounties.length) state.selectedBounty = state.bounties[0].bounty_id;
      return;
    }

    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;
    try {
      const [bountyTotal, reportTotal, stake, pendingBal, leaderboard, profile, appealTotal] = await Promise.all([
        bountyCount(),
        reportCount(),
        getReportStake(),
        getPendingBalance(currentAddress).catch(() => 0n),
        getLeaderboard().catch(() => []),
        getHunterProfile(currentAddress).catch(() => ({ score: 0, tier: "BRONZE", submitted: 0, confirmed: 0, rejected: 0, accuracy_pct: 0 })),
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

  // --- ACTIONS ---

  function handleCreateBounty(name, identity, baseReward, fund) {
    if (state.demoMode) {
      run("Funding bounty pool and writing brand identity...", async () => {
        const newId = String(state.bounties.length);
        state.bounties.push({
          bounty_id: newId,
          brand: currentAddress,
          name,
          identity,
          pool: toWei(fund),
          base_reward: toWei(baseReward),
          active: true
        });
        state.selectedBounty = newId;
      });
    } else {
      run("Funding bounty pool and writing brand identity...", () =>
        createBounty(name, identity, toWei(baseReward), toWei(fund))
      );
    }
  }

  function handleManageBounty(action, id, fund) {
    if (state.demoMode) {
      run(action === "withdraw" ? "Deactivating bounty..." : "Topping up...", async () => {
        const bounty = state.bounties.find((b) => b.bounty_id === id);
        if (bounty) {
          if (action === "withdraw") {
            bounty.active = false;
            bounty.pool = 0n;
          } else {
            bounty.pool += toWei(fund);
          }
        }
      });
    } else {
      if (action === "withdraw") {
        run("Deactivating bounty and withdrawing remaining pool...", () => withdraw(id));
      } else {
        run("Adding funds to bounty pool...", () => topUp(id, toWei(fund)));
      }
    }
  }

  function handleSubmitReport(bountyId, url, stake) {
    if (state.demoMode) {
      run("Submitting suspect URL with anti-spam stake...", async () => {
        const newId = String(state.reports.length);
        state.reports.push({
          report_id: newId,
          bounty_id: bountyId,
          hunter: currentAddress,
          url,
          stake: toWei(stake),
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
        submitReport(bountyId, url, toWei(stake))
      );
    }
  }

  function handleFileAppeal(reportId, stake) {
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
      run("Filing appeal and locking appeal fee...", () =>
        fileAppeal(reportId, BigInt(stake))
      );
    }
  }

  function handleEvaluateAppeal(appealId) {
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
      run("Evaluating appeal consensus...", () => evaluateAppeal(appealId));
    }
  }

  function handleEvaluateReport(reportId) {
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

  function handleSelectReport(reportId) {
    state.selectedReport = reportId;
    state.activeView = "investigate";
  }

  function handleClaimEarnings() {
    run("Claiming pending earnings...", async () => {
      if (state.demoMode) {
        state.pendingBalance = 0n;
      } else {
        await claimEarnings();
      }
    });
  }

  function handleRefresh() {
    run("Refreshing on-chain state...", async () => {
      await refreshData();
    });
  }

  // --- WIZARD ONBOARDING TOUR ---

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

  function handleTourNext() {
    state.tourStep += 1;
    state.activeView = steps[state.tourStep - 1].view;
  }

  function handleTourPrev() {
    state.tourStep -= 1;
    state.activeView = steps[state.tourStep - 1].view;
  }

  function handleTourClose() {
    state.tourStep = 0;
    localStorage.setItem("sentinel_onboarding_completed", "true");
  }

  // Setup Lifecycle
  onMount(async () => {
    // Theme load
    const savedTheme = localStorage.getItem("sentinel_theme") || "dark";
    theme = savedTheme;
    document.body.setAttribute("data-theme", theme);

    // Initial query
    await refreshData();

    // Tour onboarding trigger
    if (state.demoMode && !localStorage.getItem("sentinel_demo_onboarded")) {
      state.tourStep = 1;
      localStorage.setItem("sentinel_demo_onboarded", "true");
    } else if (!localStorage.getItem("sentinel_onboarding_completed")) {
      state.tourStep = 1;
    }
  });

  // Get eligible steps object
  let currentTourStep = $derived(state.tourStep > 0 && state.tourStep <= steps.length ? steps[state.tourStep - 1] : null);
</script>

<header class="topbar">
  <div>
    <p class="eyebrow">GenLayer Intelligent Contract dApp</p>
    <div style="display: flex; align-items: center; gap: 16px;">
      <h1>Sentinel</h1>
      <button class="icon-button theme-toggle-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
        {#if theme === "dark"}☀️{:else}🌙{/if}
      </button>
    </div>
  </div>
  <div class="account-actions">
    {#if state.pendingBalance > 0n}
      <div class="claim-panel">
        <span>Earnings: <strong>{formatWei(state.pendingBalance)}</strong></span>
        <button class="primary claim-btn" onclick={handleClaimEarnings}>Claim</button>
      </div>
    {/if}
    <div class="account">
      <span>Operator [{state.hunterProfile.tier} — {state.hunterProfile.score} pts]</span>
      <strong>{currentAddress}</strong>
    </div>
  </div>
</header>

<nav class="tabs" aria-label="Sentinel consoles">
  <button class="tab {state.activeView === 'brand' ? 'active' : ''}" onclick={() => state.activeView = 'brand'}>Brand Console</button>
  <button class="tab {state.activeView === 'hunter' ? 'active' : ''}" onclick={() => state.activeView = 'hunter'}>Hunter Console</button>
  <button class="tab {state.activeView === 'investigate' ? 'active' : ''}" onclick={() => state.activeView = 'investigate'}>Investigate</button>
  <button class="tab {state.activeView === 'leaderboard' ? 'active' : ''}" onclick={() => state.activeView = 'leaderboard'}>Leaderboard</button>
</nav>

{#if state.demoMode}
  <div class="banner warning" style="border-color: rgba(255, 184, 77, 0.45); background: rgba(255, 184, 77, 0.08); color: #ffeab9; display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px;">
    <span><strong>Demo Mode Active:</strong> Simulating in-memory operations with pre-seeded mockup data.</span>
    <a href="?" style="color: var(--blue); font-weight: bold; text-decoration: none;">Exit Demo</a>
  </div>
{/if}

{#if CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" && !state.demoMode}
  <div class="banner error">
    Contract address is still the placeholder. Deploy contracts/sentinel.py in GenLayer Studio, then set VITE_CONTRACT_ADDRESS in frontend/.env.
  </div>
{/if}

{#if state.busy}
  <div class="banner pulse">{state.busy}</div>
{/if}

{#if state.error}
  <div class="banner error">{state.error}</div>
{/if}

{#if state.notice}
  <div class="banner success">{state.notice}</div>
{/if}

<main>
  {#if state.activeView === "brand"}
    <BrandConsole
      {state}
      {formatWei}
      onCreateBounty={handleCreateBounty}
      onManageBounty={handleManageBounty}
      onSelectReport={handleSelectReport}
      {statusClass}
    />
  {:else if state.activeView === "hunter"}
    <HunterConsole
      {state}
      {currentAddress}
      {formatWei}
      onSubmitReport={handleSubmitReport}
      onFileAppeal={handleFileAppeal}
      onSelectReport={handleSelectReport}
      {statusClass}
    />
  {:else if state.activeView === "investigate"}
    <InvestigateConsole
      {state}
      {currentAddress}
      {formatWei}
      onEvaluateReport={handleEvaluateReport}
      onFileAppeal={handleFileAppeal}
      onEvaluateAppeal={handleEvaluateAppeal}
      onSelectReport={handleSelectReport}
      {statusClass}
      {severityColor}
    />
  {:else if state.activeView === "leaderboard"}
    <LeaderboardConsole
      {state}
      {currentAddress}
      onRefresh={handleRefresh}
    />
  {/if}
</main>

<!-- Onboarding Tour Wizard Overlay -->
{#if currentTourStep}
  <div class="tour-overlay">
    <div class="tour-card">
      <div class="tour-progress">Step {state.tourStep} of {steps.length}</div>
      <h3>{currentTourStep.title}</h3>
      <p>{currentTourStep.text}</p>
      <div class="tour-buttons">
        {#if state.tourStep > 1}
          <button class="secondary claim-btn" onclick={handleTourPrev} type="button">Back</button>
        {:else}
          <button class="ghost claim-btn danger-text" onclick={handleTourClose} type="button">Skip</button>
        {/if}
        {#if state.tourStep < steps.length}
          <button class="primary claim-btn" onclick={handleTourNext} type="button">Next</button>
        {:else}
          <button class="primary claim-btn" onclick={handleTourClose} type="button">Finish Tour</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Toast Notification Container -->
<div class="toast-container" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div class="toast {toast.type}">
      <span>{toast.message}</span>
      <button class="ghost close-btn" onclick={() => toasts = toasts.filter(t => t.id !== toast.id)} style="padding: 0 4px; min-height: auto; border: none; margin-left: 8px;">&times;</button>
    </div>
  {/each}
</div>

<style>
  /* Local app header styles if any, otherwise layout styles are in styles.css */
  .theme-toggle-btn {
    border-radius: 999px;
    padding: 0;
    width: 38px;
    height: 38px;
    min-height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    background: var(--panel-2);
    border: 1px solid var(--line);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .theme-toggle-btn:hover {
    border-color: var(--blue);
    background: rgba(85, 167, 255, 0.08);
  }
</style>
