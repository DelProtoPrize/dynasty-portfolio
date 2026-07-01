<script lang="ts">
  import PlotlyChart from '$lib/components/PlotlyChart.svelte';
  import * as Card from '$lib/components/ui/card';
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

  function signalColor(x: any): string {
    if (!x || x.skill == null) return 'text-ink-faint';
    const sig = x.lo != null && (x.lo > 0 || x.hi < 0);
    if (!sig) return 'text-ink-dim';
    return x.skill > 0 ? 'text-good' : 'text-bad';
  }

  function borderColor(x: any): string {
    if (!x || x.skill == null) return 'border-l-ink-faint';
    const sig = x.lo != null && (x.lo > 0 || x.hi < 0);
    if (!sig) return 'border-l-ink-faint';
    return x.skill > 0 ? 'border-l-good' : 'border-l-bad';
  }
</script>

<svelte:head>
  <title>Model Lab — Roster Portfolio & Asset Valuation</title>
</svelte:head>

{#if d}
  <Card.Root class="mb-5 border-accent/25 bg-accent-dim">
    <Card.Header class="pb-2">
      <Card.Title class="text-[11px] font-bold uppercase tracking-[.07em] text-accent">Backtest Protocol</Card.Title>
    </Card.Header>
    <Card.Content class="text-xs text-ink-dim leading-relaxed">
      <span class="text-ink font-semibold">B0</span> = persistence (last-season ppg) ·
      <span class="text-ink font-semibold">B1</span> = expert rank (flat FantasyPros ECR→points curve) ·
      <span class="text-ink font-semibold">m1</span> = production model (ridge: B1 + trailing production + age) ·
      Skill = MAE reduction over baseline, common support ·
      Intervals are player-block bootstrap 95% CIs ·
      <code class="font-mono text-[11px] text-ink bg-black/30 px-1.5 py-0.5 rounded">{d.protocol?.currency ?? '—'}</code> ·
      <code class="font-mono text-[11px] text-ink bg-black/30 px-1.5 py-0.5 rounded">{d.protocol?.n_predictions?.toLocaleString() ?? '—'}</code> logged predictions
    </Card.Content>
  </Card.Root>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
    {#each [
      { v: d.verdicts?.[0], label: 'Expert Rank Edge', desc: 'Pooled B1 vs B0.' },
      { v: d.verdicts?.[1], label: 'Production Model Edge', desc: 'Pooled m1 vs B1.' },
      { v: d.verdicts?.[2], label: 'In-Season Edge', desc: 'Week 5/9/13 as-ofs only.' },
    ] as card}
      <Card.Root class="border-l-3 {borderColor(card.v)}">
        <Card.Content class="py-3 px-4">
          <div class="text-[10px] font-bold uppercase tracking-[.07em] text-ink-dim mb-1.5">{card.label}</div>
          <div class="font-mono font-bold text-xl {signalColor(card.v)}">{card.v ? pct(card.v.skill) : '—'}</div>
          <div class="text-xs text-ink-dim mt-1.5">{card.desc}</div>
        </Card.Content>
      </Card.Root>
    {/each}
  </div>

  {#if d.verdicts?.length}
    <Card.Root class="mb-5">
      <Card.Header>
        <Card.Title>Verdicts <span class="text-ink-dim font-normal text-sm">— does each signal add value?</span></Card.Title>
      </Card.Header>
      <Card.Content class="divide-y divide-line">
        {#each d.verdicts as v}
          <div class="grid grid-cols-[1fr_100px] gap-x-5 items-center py-3.5">
            <div>
              <div class="text-[15px] font-semibold text-ink">{v.q}</div>
              <div class="text-[11px] text-ink-dim mt-0.5">{v.detail} · n={v.n?.toLocaleString() ?? '—'}</div>
            </div>
            <div class="text-right font-mono font-bold text-xl" style="color:{v.lo > 0 || v.hi < 0 ? (v.skill > 0 ? '#3ecf74' : '#f5605a') : '#8a95a8'}">
              {pct(v.skill)}
            </div>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}

  {#if d.by_position?.length && browser}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
      <Card.Root>
        <Card.Header>
          <Card.Title>Skill by position</Card.Title>
        </Card.Header>
        <Card.Content>
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
        </Card.Content>
      </Card.Root>

      {#if d.by_week?.length}
        <Card.Root>
          <Card.Header>
            <Card.Title>When the production edge appears</Card.Title>
          </Card.Header>
          <Card.Content>
            <PlotlyChart
              data={[{
                x: d.by_week.map((w: any) => 'Wk ' + (w.week ?? '?')),
                y: d.by_week.map((w: any) => w.skill), type: 'bar',
                marker: { color: d.by_week.map((w: any) => (w.skill ?? 0) >= 0 ? '#3ecf74' : '#f5605a') },
              }]}
              layout={{ ...PL, showlegend: false, yaxis: { ...PL.yaxis, tickformat: '+.0%' } }}
              style="height:300px"
            />
          </Card.Content>
        </Card.Root>
      {/if}
    </div>
  {/if}

  {#if d.coefficients && browser}
    <Card.Root>
      <Card.Header>
        <Card.Title>Fitted coefficients</Card.Title>
      </Card.Header>
      <Card.Content>
        <PlotlyChart
          data={[{
            z: d.coefficients.beta, x: d.coefficients.positions, y: d.coefficients.features,
            type: 'heatmap', colorscale: [[0,'#f5605a'],[0.5,'#161b22'],[1,'#3ecf74']],
            zmid: 0, showscale: true,
          }]}
          layout={{ ...PL, margin: { l: 130, r: 8, t: 12, b: 36 }, yaxis: { ...PL.yaxis, autorange: 'reversed' } }}
          style="height:300px"
        />
      </Card.Content>
    </Card.Root>
  {/if}
{:else}
  <div class="flex items-center justify-center h-64 text-ink-dim text-sm">
    No backtest data available yet.
  </div>
{/if}
