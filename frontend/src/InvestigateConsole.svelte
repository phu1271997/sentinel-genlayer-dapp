<script>
  import VerdictCard from "./VerdictCard.svelte";
  import LoadingSkeleton from "./LoadingSkeleton.svelte";

  let { appState, currentAddress, formatWei, onEvaluateReport, onFileAppeal, onEvaluateAppeal, onSelectReport, statusClass, severityColor } = $props();

  let selectedReportObj = $derived(
    appState.selectedReport
      ? appState.reports.find((item) => item.report_id === appState.selectedReport)
      : appState.reports.at(-1)
  );

  let evaluateReportId = $state("");

  // Keep evaluate input in sync with selected report
  $effect(() => {
    if (selectedReportObj) {
      evaluateReportId = selectedReportObj.report_id;
    }
  });

  function handleSubmitEvaluate(e) {
    e.preventDefault();
    onEvaluateReport(evaluateReportId);
  }

  let isEvaluating = $derived(
    appState.busy && (
      appState.busy.toLowerCase().includes("investigation") || 
      appState.busy.toLowerCase().includes("consensus") || 
      appState.busy.toLowerCase().includes("evaluating")
    )
  );
</script>

<section class="grid investigate-grid">
  <form class="panel" onsubmit={handleSubmitEvaluate}>
    <div class="panel-title">
      <span class="signal red"></span>
      <h2>Run AI investigation</h2>
    </div>
    <label>Report id
      <input bind:value={evaluateReportId} placeholder="0" required />
    </label>
    <button class="primary alert" type="submit" disabled={isEvaluating}>Run AI Investigation</button>
    <p class="hint">Sentinel fetches rendered page text, captures a screenshot, asks the AI jury, reaches consensus, then pays or rejects on-chain.</p>
  </form>

  <div>
    {#if isEvaluating}
      <LoadingSkeleton />
    {:else if selectedReportObj}
      <VerdictCard
        report={selectedReportObj}
        {appState}
        {currentAddress}
        {onFileAppeal}
        {onEvaluateAppeal}
        {formatWei}
        {statusClass}
        {severityColor}
      />
    {:else}
      <div class="empty">Choose or evaluate a report to see the verdict.</div>
    {/if}
  </div>
</section>

<section class="section-block">
  <div class="section-heading">
    <h2>Report queue</h2>
  </div>
  
  {#if !appState.reports.length}
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
          {#each appState.reports as report}
            <tr
              class="clickable {appState.selectedReport === report.report_id ? 'active-row' : ''}"
              onclick={() => onSelectReport(report.report_id)}
            >
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
