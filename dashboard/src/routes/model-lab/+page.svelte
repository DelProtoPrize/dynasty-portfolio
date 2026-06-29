<script lang="ts">
  import PlotlyChart from '$lib/components/PlotlyChart.svelte';
  import { browser } from '$app/environment';

  let { data } = $props();
  let d = $derived(data.modelData);

  const PL = {
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#8a95a8', size: 11 },
    margin: { l: 54, r: 16, t: 12, b: 44 },
    xaxis: { gridcolor: '#1e2530', zerolinecolor: '#2a3340', tickfont: { size: 10 } },
    yaxis: { gridcolor: '#1e2530', zerolinecolor: '#2a3340', tickfont: { size: 10 } },
    legend: { orientation: 'h', y: -0.22, font: { size: 11 } },
  };

  const pct = (v: number | null) => v == null ? '—' : (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%';

  function cardClass(x: any): string {
    if (!x) return '';
    const sig = x.lo != null && (x.lo > 0 || x.hi < 0);
    return sig ? (x.skill > 0 ? 'good' : 'bad') : 'null';
  }
</script>

<svelte:head>
  <title>Model Lab — Roster Portfolio & Asset Valuation</title>
</svelte:head>

{#if d}
  <div class="method-box">
    <div class="mb-head">Backtest Protocol</div>
    <div class="mb-body">
      <b>B0</b> = persistence (last-season ppg) ·
      <b>B1</b> = expert rank (flat FantasyPros ECR→points curve) ·
      <b>m1</b> = production model (ridge: B1 + trailing production + age) ·
      Skill = MAE reduction over baseline, common support ·
      Intervals are player-block bootstrap 95% CIs ·
      Currency: <code>{d.protocol?.currency ?? '—'}</code> ·
      <code>{d.protocol?.n_predictions?.toLocaleString() ?? '—'}</code> logged predictions
    </div>
  </div>

  <div class="grid-3" style="margin-bottom:20px">
    {#each [
      { v: d.verdicts?.[0], label: 'Expert Rank Edge', desc: 'Pooled B1 vs B0.' },
      { v: d.verdicts?.[1], label: 'Production Model Edge', desc: 'Pooled m1 vs B1.' },
      { v: d.verdicts?.[2], label: 'In-Season Edge', desc: 'Week 5/9/13 as-ofs only.' },
    ] as card}
      <div class="finding-card {cardClass(card.v)}">
        <div class="fc-label">{card.label}</div>
        <div class="fc-stat">{card.v ? pct(card.v.skill) : '—'}</div>
        <div class="fc-desc">{card.desc}</div>
      </div>
    {/each}
  </div>

  {#if d.verdicts?.length}
    <section class="panel">
      <div class="panel-head">
        <h2>Verdicts <span class="panel-sub">— does each signal add value?</span></h2>
      </div>
      {#each d.verdicts as v}
        <div class="verdict">
          <div class="q">{v.q}</div>
          <div class="detail">{v.detail} · n={v.n?.toLocaleString() ?? '—'}</div>
          <div class="ans" style="color:{v.lo > 0 || v.hi < 0 ? (v.skill > 0 ? '#3ecf74' : '#f5605a') : '#8a95a8'}">
            {pct(v.skill)}
          </div>
        </div>
      {/each}
    </section>
  {/if}

  <div class="section-gap"></div>

  {#if d.by_position?.length && browser}
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head"><h2>Skill by position</h2></div>
        <PlotlyChart
          data={[
            { x: d.by_position.map((p: any) => p.pos), y: d.by_position.map((p: any) => p.b1_vs_b0),
              name: 'B1 vs B0', type: 'bar', marker: { color: '#3d80f5' } },
            { x: d.by_position.map((p: any) => p.pos), y: d.by_position.map((p: any) => p.m1_vs_b1),
              name: 'm1 vs B1', type: 'bar',
              marker: { color: d.by_position.map((p: any) => (p.m1_vs_b1 ?? 0) >= 0 ? '#3ecf74' : '#f5605a') } },
          ]}
          layout={{ ...PL, barmode: 'group', yaxis: { ...PL.yaxis, tickformat: '+.0%' } }}
          style="height:300px"
        />
      </section>

      {#if d.by_week?.length}
        <section class="panel">
          <div class="panel-head"><h2>When the production edge appears</h2></div>
          <PlotlyChart
            data={[{
              x: d.by_week.map((w: any) => 'Wk ' + (w.week ?? '?')),
              y: d.by_week.map((w: any) => w.skill), type: 'bar',
              marker: { color: d.by_week.map((w: any) => (w.skill ?? 0) >= 0 ? '#3ecf74' : '#f5605a') },
            }]}
            layout={{ ...PL, showlegend: false, yaxis: { ...PL.yaxis, tickformat: '+.0%' } }}
            style="height:300px"
          />
        </section>
      {/if}
    </div>
  {/if}

  {#if d.coefficients && browser}
    <div class="section-gap"></div>
    <section class="panel">
      <div class="panel-head"><h2>Fitted coefficients</h2></div>
      <PlotlyChart
        data={[{
          z: d.coefficients.beta, x: d.coefficients.positions, y: d.coefficients.features,
          type: 'heatmap', colorscale: [[0,'#f5605a'],[0.5,'#161b22'],[1,'#3ecf74']],
          zmid: 0, showscale: true,
        }]}
        layout={{ ...PL, margin: { l: 130, r: 8, t: 12, b: 36 }, yaxis: { ...PL.yaxis, autorange: 'reversed' } }}
        style="height:300px"
      />
    </section>
  {/if}
{:else}
  <div class="state-msg">
    No backtest results found at <code>/data/modellab.json</code>.<br><br>
    Generate them: <code>make models</code>
  </div>
{/if}

<style>
  .method-box { background: var(--accent-dim); border: 1px solid rgba(61,128,245,.25);
                border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; }
  .mb-head { font-size: 11px; font-weight: 700; color: var(--accent);
             text-transform: uppercase; letter-spacing: .07em; margin-bottom: 8px; }
  .mb-body { font-size: 12px; color: var(--ink-dim); line-height: 1.6; }
  .mb-body b { color: var(--ink); }
  .mb-body code { font-family: var(--mono); color: var(--ink); font-size: 11px;
                  background: rgba(0,0,0,.3); padding: 1px 5px; border-radius: 3px; }
  .finding-card { background: var(--surface); border: 1px solid var(--line);
                  border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; padding: 12px 14px; }
  .finding-card.good { border-left-color: var(--good); }
  .finding-card.bad { border-left-color: var(--bad); }
  .finding-card.null { border-left-color: var(--ink-faint); }
  .fc-label { font-size: 10px; font-weight: 700; text-transform: uppercase;
              letter-spacing: .07em; color: var(--ink-dim); margin-bottom: 6px; }
  .fc-stat { font: 700 20px/1 var(--mono); color: var(--ink); }
  .fc-desc { font-size: 12px; color: var(--ink-dim); margin-top: 6px; }
  .verdict { display: grid; grid-template-columns: 1fr 120px; gap: 4px 20px;
             align-items: center; padding: 14px 0; border-bottom: 1px solid var(--line); }
  .verdict:last-child { border-bottom: 0; }
  .verdict .q { font-size: 15px; font-weight: 600; color: var(--ink); }
  .verdict .detail { font-size: 11px; color: var(--ink-dim); margin-top: 2px; }
  .verdict .ans { text-align: right; font: 700 22px/1 var(--mono); }
</style>
