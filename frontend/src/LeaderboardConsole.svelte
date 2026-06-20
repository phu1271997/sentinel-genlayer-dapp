<script>
  let { appState, currentAddress, onRefresh } = $props();

  let profile = $derived(appState.hunterProfile || { score: 0, tier: "BRONZE", submitted: 0, confirmed: 0, rejected: 0, accuracy_pct: 0 });

  let tierInfo = $derived.by(() => {
    if (profile.tier === "BRONZE") {
      return "BRONZE Tier: standard 100% stake required. Earn points to level up!";
    } else if (profile.tier === "SILVER") {
      return "SILVER Tier (threshold &gt;= 1000): standard 100% stake required. Earn points to reach GOLD!";
    } else if (profile.tier === "GOLD") {
      return "GOLD Tier (threshold &gt;= 3000): <strong>50% stake discount</strong> & payout fee deductions fully waived!";
    } else if (profile.tier === "DIAMOND") {
      return "DIAMOND Tier (threshold &gt;= 10000): <strong>75% stake discount</strong> & payout fee deductions fully waived!";
    }
    return "";
  });
</script>

<section class="grid hunter-grid">
  <div class="panel">
    <div class="panel-title">
      <span class="signal blue"></span>
      <h2>My Reputation</h2>
    </div>
    <div class="profile-card">
      <div class="profile-tier-badge badge-{profile.tier.toLowerCase()}">{profile.tier}</div>
      <div class="profile-stat">
        <span>Reputation Score</span>
        <strong>{profile.score} pts</strong>
      </div>
      <div class="profile-stat">
        <span>Accuracy Rate</span>
        <strong>{profile.accuracy_pct}%</strong>
      </div>
      <div class="profile-stat">
        <span>Submitted Reports</span>
        <strong>{profile.submitted} total</strong>
      </div>
      <div class="profile-stat-sub">
        <span>Confirmed: {profile.confirmed} &bull; Rejected: {profile.rejected}</span>
      </div>
      <p class="hint">{@html tierInfo}</p>
    </div>
  </div>
  
  <section class="section-block" style="margin-top: 0;">
    <div class="section-heading" style="margin-bottom: 18px;">
      <h2>Top 10 Hunters Leaderboard</h2>
      <button class="icon-button" onclick={onRefresh} type="button" title="Refresh">Refresh</button>
    </div>
    
    {#if !appState.leaderboard || !appState.leaderboard.length}
      <div class="empty">No hunters on the leaderboard yet.</div>
    {:else}
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
            {#each appState.leaderboard as h, i}
              {@const isMe = h.address.toLowerCase() === currentAddress.toLowerCase()}
              {@const rank = i + 1}
              <tr class={isMe ? 'active-row' : ''}>
                <td data-label="Rank">
                  <strong>
                    {#if rank === 1}🥇 #1{:else if rank === 2}🥈 #2{:else if rank === 3}🥉 #3{:else}#{rank}{/if}
                  </strong>
                </td>
                <td data-label="Hunter Address">
                  <code>{h.address}</code>
                  {#if isMe}<span class="me-tag">(You)</span>{/if}
                </td>
                <td data-label="Reputation Score"><strong>{h.score} pts</strong></td>
                <td data-label="Tier">
                  <span class="badge badge-{h.tier.toLowerCase()}">{h.tier}</span>
                </td>
                <td data-label="Accuracy">{h.accuracy_pct}%</td>
                <td data-label="Outcome (Conf/Rej)">{h.confirmed} / {h.rejected}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</section>
