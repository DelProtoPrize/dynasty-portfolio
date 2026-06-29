<script lang="ts">
  import { onMount } from 'svelte';
  import PlotlyChart from './PlotlyChart.svelte';
  import { POS_COLOR, INK, GRID } from '$lib/constants';

  let { leagueId }: { leagueId: string } = $props();
  let rows: any[] = $state([]);
  let visible = $derived(rows.length > 0);

  onMount(async () => {
    if (!leagueId) return;
    try {
      const res = await fetch(`/api/leagues/${leagueId}/value`);
      rows = await res.json();
    } catch { /* endpoint absent */ }
  });

  let traces = $derived(() => {
    if (!rows.length) return [];
    const maxv = Math.max(1, ...rows.map(d => Math.max(d.fp_market_value || 0, d.vbd_value || 0)));
    const posTraces = ['QB', 'RB', 'WR', 'TE'].map(pos => {
      const pr = rows.filter(d => d.position === pos);
      return {
        type: 'scatter' as const, mode: 'markers' as const, name: pos,
        x: pr.map(d => d.fc_market_value),
        y: pr.map(d => d.vbd_value),
        text: pr.map(d => `${d.player_name}<br>${Number(d.ppg || 0).toFixed(1)} ppg`),
        marker: { color: POS_COLOR[pos], size: 9, opacity: 0.82, line: { color: '#161b22', width: 1 } },
        hovertemplate: '%{text}<br>FC %{x:,.0f} · VBD %{y:,.0f}<extra>' + pos + '</extra>',
      };
    });
    posTraces.push({
      type: 'scatter', mode: 'lines', x: [0, maxv], y: [0, maxv],
      line: { color: '#2a3340', width: 1, dash: 'dot' }, hoverinfo: 'skip', showlegend: false,
    } as any);
    return posTraces;
  });

  let layout = $derived({
    margin: { l: 66, r: 20, t: 10, b: 52 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: INK },
    xaxis: { title: 'Dynasty value — FantasyCalc (settings-aware)', gridcolor: GRID, zeroline: false },
    yaxis: { title: 'Win-now value — VBD (pts over replacement)', gridcolor: GRID, zeroline: false },
    legend: { orientation: 'h', y: 1.1 },
  });
</script>

{#if visible}
  <section class="bg-panel border border-line rounded-lg overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3 border-b border-line">
      <h2 class="text-sm font-semibold text-ink m-0">Win-Now vs Dynasty <span class="text-ink-dim font-normal">— off the diagonal = signal</span></h2>
    </div>
    <PlotlyChart data={traces()} {layout} style="height:480px" />
  </section>
{/if}
