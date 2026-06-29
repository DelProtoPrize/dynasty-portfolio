<script lang="ts">
  import PlotlyChart from './PlotlyChart.svelte';
  import { INK, GRID } from '$lib/constants';

  let { rows }: { rows: any[] } = $props();

  let data = $derived([{
    type: 'bar', orientation: 'h',
    x: [...rows].reverse().map(d => d.team_value),
    y: [...rows].reverse().map(d => d.owner_name || `Roster ${d.roster_id}`),
    marker: { color: [...rows].reverse().map(d => d.hhi), colorscale: 'YlOrRd',
              showscale: true, colorbar: { title: 'HHI' } },
    hovertemplate: '%{y}<br>value %{x:,.0f}<extra></extra>',
  }]);

  let layout = $derived({
    margin: { l: 170, r: 40, t: 10, b: 40 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: INK }, xaxis: { gridcolor: GRID },
  });
</script>

<section class="bg-panel border border-line rounded-lg overflow-hidden">
  <div class="flex items-center justify-between px-5 py-3 border-b border-line">
    <h2 class="text-sm font-semibold text-ink m-0">Team Valuation & Concentration</h2>
  </div>
  <PlotlyChart {data} {layout} style="height:420px" />
</section>
