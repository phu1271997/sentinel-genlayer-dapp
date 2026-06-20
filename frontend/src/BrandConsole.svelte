<script>
  let { appState, formatWei, onCreateBounty, onManageBounty, onSelectReport, statusClass } = $props();

  let brandReports = $derived(appState.reports.filter((report) => {
    const bounty = appState.bounties.find((item) => item.bounty_id === report.bounty_id);
    return Boolean(bounty);
  }));

  // Create form bindings
  let createName = $state("");
  let createIdentity = $state("");
  let createBaseReward = $state("");
  let createFund = $state("");

  let manageId = $state("");
  let manageFund = $state("");

  function handleCreateSubmit(e) {
    e.preventDefault();
    onCreateBounty(createName, createIdentity, createBaseReward, createFund);
    createName = "";
    createIdentity = "";
    createBaseReward = "";
    createFund = "";
  }

  function handleManageSubmit(e, action) {
    e.preventDefault();
    onManageBounty(action, manageId, manageFund);
    manageId = "";
    manageFund = "";
  }
</script>

<section class="grid two">
  <form class="panel" onsubmit={handleCreateSubmit}>
    <div class="panel-title">
      <span class="signal"></span>
      <h2>Create bounty</h2>
    </div>
    <label>Brand name
      <input bind:value={createName} placeholder="Acme Wallet" required />
    </label>
    <label>Official identity
      <textarea bind:value={createIdentity} rows="6" placeholder="Official site acme.xyz; official X @acmewallet; we never DM seed phrases; no giveaways" required></textarea>
    </label>
    <div class="form-grid">
      <label>Base reward at severity 100
        <input bind:value={createBaseReward} inputmode="decimal" placeholder="0.05" required />
      </label>
      <label>Initial pool funding
        <input bind:value={createFund} inputmode="decimal" placeholder="1.0" required />
      </label>
    </div>
    <button class="primary" type="submit">Fund Bounty</button>
  </form>

  <form class="panel" onsubmit={(e) => e.preventDefault()}>
    <div class="panel-title">
      <span class="signal blue"></span>
      <h2>Manage pool</h2>
    </div>
    <label>Bounty id
      <input bind:value={manageId} placeholder="0" required />
    </label>
    <label>Top-up amount
      <input bind:value={manageFund} inputmode="decimal" placeholder="0.25" />
    </label>
    <div class="button-row">
      <button class="secondary" onclick={(e) => handleManageSubmit(e, 'topup')} type="submit">Top Up</button>
      <button class="ghost danger-text" onclick={(e) => handleManageSubmit(e, 'withdraw')} type="submit">Deactivate & Withdraw</button>
    </div>
    <p class="metric">Required report stake: <strong>{formatWei(appState.reportStake)}</strong></p>
  </form>
</section>

<section class="section-block">
  <div class="section-heading">
    <h2>Bounty ledger</h2>
  </div>
  
  {#if !appState.bounties.length}
    <div class="empty">No bounties loaded yet.</div>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Brand</th>
            <th>Pool</th>
            <th>Base Reward</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each appState.bounties as bounty}
            <tr>
              <td data-label="ID">#{bounty.bounty_id}</td>
              <td data-label="Brand">
                <strong>{bounty.name}</strong>
                <span>{bounty.brand}</span>
              </td>
              <td data-label="Pool">{formatWei(bounty.pool)}</td>
              <td data-label="Base Reward">{formatWei(bounty.base_reward)}</td>
              <td data-label="Status">
                <span class="chip {bounty.active ? 'pending' : 'clear'}">
                  {bounty.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<section class="section-block">
  <div class="section-heading">
    <h2>Reports</h2>
  </div>
  
  {#if !brandReports.length}
    <div class="empty">No reports loaded yet.</div>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Bounty</th>
            <th>Suspect URL</th>
            <th>Status</th>
            <th>Payout</th>
          </tr>
        </thead>
        <tbody>
          {#each brandReports as report}
            <tr class="clickable" onclick={() => onSelectReport(report.report_id)}>
              <td data-label="ID">#{report.report_id}</td>
              <td data-label="Bounty">#{report.bounty_id}</td>
              <td data-label="Suspect URL"><code>{report.url}</code></td>
              <td data-label="Status">
                <span class="chip {statusClass(report.status)}">{report.status}</span>
              </td>
              <td data-label="Payout">{formatWei(report.payout)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
