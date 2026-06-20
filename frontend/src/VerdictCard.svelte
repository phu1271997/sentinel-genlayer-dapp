<script>
  let { report, appState, currentAddress, onFileAppeal, onEvaluateAppeal, formatWei, statusClass, severityColor } = $props();

  let verdict = $derived(parseVerdict(report));
  let severity = $derived(Number(report?.severity || verdict?.severity || 0));
  let confidence = $derived(Number(verdict?.confidence || 0));
  let perspectives = $derived(verdict?.perspectives || {});
  let sources = $derived(parseSources(report?.sources));

  function parseVerdict(rep) {
    if (!rep?.verdict) return {};
    try {
      return JSON.parse(rep.verdict);
    } catch {
      return {};
    }
  }

  function parseSources(srcs) {
    if (!srcs) return [];
    try {
      return JSON.parse(srcs);
    } catch {
      return [];
    }
  }

  let isMyReport = $derived(report?.hunter?.toLowerCase() === currentAddress?.toLowerCase());
  let appeal = $derived(appState.appeals.find((a) => a.report_id === report?.report_id));
</script>

<article class="verdict">
  <div class="verdict-head">
    <div>
      <p class="eyebrow">Report #{report?.report_id}</p>
      <h2>Verdict</h2>
    </div>
    <span class="chip {statusClass(report?.status)}">{report?.status}</span>
  </div>
  <div class="gauge" style="--severity:{severity}; --severity-color:{severityColor(severity)}">
    <span style="width: {severity}%; background-color: {severityColor(severity)}; box-shadow: 0 0 18px {severityColor(severity)};"></span>
  </div>
  <div class="verdict-grid">
    <div><span>Severity</span><strong>{severity}/100</strong></div>
    <div><span>Type</span><strong>{verdict.scam_type || "pending"}</strong></div>
    <div><span>Payout</span><strong>{formatWei(report?.payout)}</strong></div>
  </div>

  {#if verdict.confidence !== undefined}
    <div class="confidence-meter" title="AI Consensus Confidence">
      <span>Confidence</span>
      <div class="confidence-bar">
        <div class="confidence-fill" style="width: {confidence}%"></div>
      </div>
      <strong>{confidence}%</strong>
    </div>
  {/if}

  <p class="reasoning">{verdict.reasoning || "Awaiting investigation."}</p>

  {#if perspectives.forensic || perspectives.skeptic || perspectives.legal}
    <div class="perspectives">
      {#if perspectives.forensic}
        <details class="perspective" open>
          <summary>Forensic Analyst Perspective</summary>
          <p>{perspectives.forensic}</p>
        </details>
      {/if}
      {#if perspectives.skeptic}
        <details class="perspective">
          <summary>Skeptical User Perspective</summary>
          <p>{perspectives.skeptic}</p>
        </details>
      {/if}
      {#if perspectives.legal}
        <details class="perspective">
          <summary>Brand Lawyer Perspective</summary>
          <p>{perspectives.legal}</p>
        </details>
      {/if}
    </div>
  {/if}

  <div class="inert-url"><span>Suspect URL</span><code>{report?.url}</code></div>

  {#if sources && sources.length > 0}
    <div class="sources-list">
      <span>Cross-referenced Sources ({sources.length})</span>
      <ul>
        {#each sources as src}
          <li><a href={src} target="_blank" rel="noopener noreferrer">{src}</a></li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if isMyReport && (report?.status === 'REJECTED' || report?.status === 'NEEDS_REVIEW')}
    <div class="verdict-appeal-box" style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; gap: 8px;">
      <span style="font-size: 0.82rem; color: var(--muted);">Disputed verdict? File an appeal to trigger re-evaluation.</span>
      <button class="secondary claim-btn" onclick={() => onFileAppeal(report.report_id, report.stake)} type="button">Appeal Verdict</button>
    </div>
  {/if}

  {#if report?.status === 'APPEALED' && appeal}
    <div class="verdict-appeal-box" style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; gap: 8px;">
      <span style="font-size: 0.82rem; color: var(--muted);">Appeal #{appeal.appeal_id} is pending re-evaluation.</span>
      {#if appeal.status === 'PENDING'}
        <button class="primary claim-btn" onclick={() => onEvaluateAppeal(appeal.appeal_id)} type="button">Evaluate Appeal</button>
      {:else}
        <span class="badge badge-{appeal.status.toLowerCase()}">{appeal.status}</span>
      {/if}
    </div>
  {/if}
</article>
