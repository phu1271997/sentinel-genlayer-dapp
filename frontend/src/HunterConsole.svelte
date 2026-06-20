<script>
  let { appState, currentAddress, formatWei, onSubmitReport, onFileAppeal, statusClass } = $props();

  // Eligible reports to appeal: submitted by currentAddress and status is REJECTED or NEEDS_REVIEW
  let appealableReports = $derived(appState.reports.filter(
    (r) => r.hunter.toLowerCase() === currentAddress.toLowerCase() && (r.status === "REJECTED" || r.status === "NEEDS_REVIEW")
  ));

  // Appeals submitted by this hunter
  let myAppeals = $derived(appState.appeals.filter((a) => {
    const report = appState.reports.find((r) => r.report_id === a.report_id);
    return report && report.hunter.toLowerCase() === currentAddress.toLowerCase();
  }));

  // Helper to format the stake input box value based on the current reputation tier discount
  function calculateDiscountedStake() {
    if (appState.reportStake === 0n) return "0";
    let stake = appState.reportStake;
    const tier = appState.hunterProfile?.tier || "BRONZE";
    if (tier === "GOLD") {
      stake = stake / 2n;
    } else if (tier === "DIAMOND") {
      stake = stake / 4n;
    }
    const whole = stake / 10n ** 18n;
    const fraction = (stake % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
    return fraction ? `${whole}.${fraction}` : String(whole);
  }

  // Active form state variables
  let submitBountyId = $state("");
  let submitUrl = $state("");
  let submitStake = $state("");
  let appealReportId = $state("");

  // Whenever the appState.reportStake or hunterProfile changes, recalculate default stake
  $effect(() => {
    submitStake = calculateDiscountedStake();
  });

  // Keep select dropdown in sync with bounties list
  $effect(() => {
    if (!submitBountyId && appState.bounties.length > 0) {
      const active = appState.bounties.find(b => b.active);
      if (active) submitBountyId = active.bounty_id;
    }
  });

  // Keep select dropdown in sync with appealable reports list
  $effect(() => {
    if (appealableReports.length > 0) {
      if (!appealReportId || !appealableReports.find(r => r.report_id === appealReportId)) {
        appealReportId = appealableReports[0].report_id;
      }
    } else {
      appealReportId = "";
    }
  });

  function handleSubmitReportForm(e) {
    e.preventDefault();
    onSubmitReport(submitBountyId, submitUrl, submitStake);
    submitUrl = "";
  }

  function handleFileAppealForm(e) {
    e.preventDefault();
    if (!appealReportId) return;
    const rep = appealableReports.find(r => r.report_id === appealReportId);
    if (!rep) return;
    onFileAppeal(appealReportId, rep.stake);
  }
</script>

<section class="grid hunter-grid">
  <div style="display: flex; flex-direction: column; gap: 18px;">
    <form class="panel" onsubmit={handleSubmitReportForm}>
      <div class="panel-title">
        <span class="signal amber"></span>
        <h2>Submit suspect URL</h2>
      </div>
      <label>Bounty id
        <select bind:value={submitBountyId} required>
          {#each appState.bounties.filter((b) => b.active) as bounty}
            <option value={bounty.bounty_id}>#{bounty.bounty_id} {bounty.name}</option>
          {/each}
        </select>
      </label>
      <label>Suspect URL
        <input bind:value={submitUrl} placeholder="https://login-acme-wallet.example" required />
      </label>
      <label>Stake (GEN)
        <input bind:value={submitStake} inputmode="decimal" />
      </label>
      <button class="primary" type="submit">Submit Report</button>
    </form>

    <form class="panel" onsubmit={handleFileAppealForm}>
      <div class="panel-title">
        <span class="signal red"></span>
        <h2>File appeal</h2>
      </div>
      <p class="hint" style="margin-top: 0; margin-bottom: 12px; font-size: 0.82rem;">
        Dispute a REJECTED or NEEDS_REVIEW verdict. Requires an appeal fee equal to the original report stake.
      </p>
      <label>Report ID
        <select bind:value={appealReportId} required>
          {#if appealableReports.length > 0}
            {#each appealableReports as r}
              <option value={r.report_id}>Report #{r.report_id} ({r.status})</option>
            {/each}
          {:else}
            <option value="">No eligible reports to appeal</option>
          {/if}
        </select>
      </label>
      <button class="secondary" type="submit" disabled={appealableReports.length === 0}>File Appeal</button>
    </form>
  </div>

  <div class="bounty-cards">
    {#if !appState.bounties.length}
      <div class="empty">No active bounties loaded yet.</div>
    {:else}
      {#each appState.bounties as bounty}
        <article class="bounty-card">
          <div>
            <span class="chip {bounty.active ? 'pending' : 'clear'}">
              {bounty.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <h3>#{bounty.bounty_id} {bounty.name}</h3>
          </div>
          <p>{bounty.identity}</p>
          <dl>
            <div><dt>Pool</dt><dd>{formatWei(bounty.pool)}</dd></div>
            <div><dt>Severity 100</dt><dd>{formatWei(bounty.base_reward)}</dd></div>
          </dl>
        </article>
      {/each}
    {/if}
  </div>
</section>

<section class="section-block">
  <div class="section-heading">
    <h2>My Appeals</h2>
  </div>
  
  {#if !myAppeals.length}
    <div class="empty">No appeals filed yet.</div>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Appeal ID</th>
            <th>Report ID</th>
            <th>Original Status</th>
            <th>Locked Fee</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each myAppeals as appeal}
            <tr>
              <td data-label="Appeal ID">#{appeal.appeal_id}</td>
              <td data-label="Report ID">#{appeal.report_id}</td>
              <td data-label="Original Status">
                <span class="chip warning">{appeal.original_status}</span>
              </td>
              <td data-label="Locked Fee">{formatWei(appeal.fee)}</td>
              <td data-label="Status">
                <span class="chip {appeal.status === 'OVERTURNED' ? 'success' : appeal.status === 'UPHELD' ? 'clear' : 'pending'}">
                  {appeal.status}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
