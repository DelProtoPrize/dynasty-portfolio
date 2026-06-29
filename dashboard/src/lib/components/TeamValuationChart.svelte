<script lang="ts">
  import PlotlyChart from './PlotlyChart.svelte';
  import * as Card from '$lib/components/ui/card';
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

<Card.Root>
  <Card.Header>
    <Card.Title>Team Valuation & Concentration</Card.Title>
  </Card.Header>
  <Card.Content>
    <PlotlyChart {data} {layout} style="height:420px" />
  </Card.Content>
</Card.Root>
