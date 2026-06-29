<script lang="ts">
  import { onMount } from 'svelte';
  import PlotlyChart from './PlotlyChart.svelte';
  import * as Card from '$lib/components/ui/card';
  import * as Button from '$lib/components/ui/button';
  import { POS_COLOR, INK, GRID } from '$lib/constants';

  let { leagueId, diagnostics = [] }: { leagueId: string; diagnostics?: any[] } = $props();
  let basis: 'realized' | 'projected' = $state('realized');
  let cache: Record<string, any> = $state({});
  let visible = $derived(!!cache[basis]);

  onMount(async () => {
    if (!leagueId) return;
    try {
      const [real, proj] = await Promise.all([
        fetch(`/api/leagues/${leagueId}/cornering?basis=realized`).then(r => r.json()),
        fetch(`/api/leagues/${leagueId}/cornering?basis=projected`).then(r => r.json()).catch(() => null)
      ]);
      cache = { realized: real, projected: proj };
    } catch { /* tables not built */ }
  });

  let current = $derived(cache[basis]);

  const MUTED_SEG = ['#2a3340', '#222b36', '#1e2530', '#1a2029', '#161b22'];

  let sortedLeague = $derived(() => {
    if (!current?.league?.length) return [];
    return [...current.league].sort((a: any, b: any) => (b.hhi ?? 0) - (a.hhi ?? 0));
  });

  let chartData = $derived(() => {
    const sorted = sortedLeague();
    if (!sorted.length) return [];
    // Plotly renders y-axis bottom-to-top, so reverse so highest HHI appears at top
    const positions = [...sorted].reverse().map((l: any) => l.position);

    const byPos: Record<string, any[]> = {};
    for (const row of current.rosters) (byPos[row.position] ??= []).push(row);
    for (const posRows of Object.values(byPos)) posRows.sort((a: any, b: any) => (b.vona_share ?? 0) - (a.vona_share ?? 0));

    const maxLen = Math.max(...Object.values(byPos).map(r => r.length), 0);
    const traces: any[] = [];

    for (let k = 0; k < maxLen; k++) {
      const xs: number[] = [], cols: string[] = [], cd: string[][] = [];
      for (const pos of positions) {
        const row = (byPos[pos] || [])[k];
        xs.push(row ? row.vona_share * 100 : 0);
        cols.push(k === 0 ? (POS_COLOR[pos] || '#8a95a8') : MUTED_SEG[k % MUTED_SEG.length]);
        cd.push(row ? [ownerName(row.roster_id), (row.vona_share * 100).toFixed(1), row.elite_count] : ['', '', '']);
      }
      traces.push({
        type: 'bar', orientation: 'h', x: xs, y: positions,
        marker: { color: cols }, customdata: cd, showlegend: false,
        hovertemplate: '%{customdata[0]}: %{customdata[1]}% of %{y} VONA · %{customdata[2]} startable<extra></extra>',
      });
    }
    return traces;
  });

  let chartLayout = $derived({
    margin: { l: 40, r: 20, t: 10, b: 40 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: INK }, barmode: 'stack',
    xaxis: { gridcolor: GRID, ticksuffix: '%', range: [0, 100] },
    showlegend: false,
  });

  function ownerName(rosterId: number): string {
    const m = diagnostics.find((d: any) => d.roster_id === rosterId);
    return m?.owner_name || 'Roster ' + rosterId;
  }

  let diagText = $derived(() => {
    if (!current?.league?.length || !current?.rosters?.length) return '';
    const sorted = [...current.league].sort((a: any, b: any) => (b.hhi ?? 0) - (a.hhi ?? 0));
    const top = sorted[0];
    const posRosters = current.rosters
      .filter((r: any) => r.position === top.position)
      .sort((a: any, b: any) => (b.vona_share ?? 0) - (a.vona_share ?? 0));
    const lead = posRosters[0], second = posRosters[1];
    if (!lead) return '';

    let line = `<b>${ownerName(lead.roster_id)}</b> holds ${lead.elite_count} of ${top.elite_total} startable ${top.position}s — carrying <b>${(lead.vona_share * 100).toFixed(1)}%</b> of league ${top.position} VONA`;
    if (second) {
      line += `, vs ${ownerName(second.roster_id)}'s ${second.elite_count} at ${(second.vona_share * 100).toFixed(1)}%`;
      if (lead.elite_count <= second.elite_count) line += '. Quality cornering, not body-count';
    }
    line += '.';

    if (basis === 'realized' && cache.projected) {
      const projRosters = cache.projected.rosters
        .filter((r: any) => r.position === top.position);
      const mine = projRosters.find((r: any) => r.roster_id === lead.roster_id);
      if (mine?.vona_share != null) {
        const holds = mine.vona_share >= lead.vona_share - 0.01;
        line += `<br><span class="text-ink-faint text-xs">${top.position} corner: ${(lead.vona_share * 100).toFixed(1)}% → ${(mine.vona_share * 100).toFixed(1)}% projected · ${holds ? 'corner holds' : 'moat depreciating'}</span>`;
      }
    }
    return line;
  });
</script>

{#if visible}
  <Card.Root>
    <Card.Header>
      <Card.Title>Positional Cornering <span class="text-ink-dim font-normal">— who controls scarce production</span></Card.Title>
      <div class="flex gap-1">
        <Button.Root variant={basis === 'realized' ? 'active' : 'default'} onclick={() => basis = 'realized'}>Realized</Button.Root>
        <Button.Root variant={basis === 'projected' ? 'active' : 'default'} disabled={!cache.projected} onclick={() => basis = 'projected'}>Projected</Button.Root>
      </div>
    </Card.Header>
    <Card.Content>
      <div class="grid grid-cols-[1fr_200px] gap-4 items-start">
        <PlotlyChart data={chartData()} layout={chartLayout} style="height:300px" />
        <div class="flex flex-col gap-2">
          {#each sortedLeague() as pos}
            <div class="bg-surface border border-line rounded-md px-3 py-2">
              <div class="flex items-center justify-between">
                <span class="pos pos-{pos.position}">{pos.position}</span>
                <span class="font-mono font-bold text-base text-ink">{Number(pos.hhi).toFixed(3)}</span>
              </div>
              <div class="text-[10px] text-ink-dim mt-1">{pos.hhi > 0.15 ? 'concentrated' : pos.hhi > 0.1 ? 'tilted' : 'balanced'} · top: {ownerName(pos.top_roster_id)}</div>
            </div>
          {/each}
        </div>
      </div>
    </Card.Content>
    {#if diagText()}
      <div class="px-5 pb-4 text-sm text-ink border-t border-line pt-3 mt-2">
        {@html diagText()}
      </div>
    {/if}
  </Card.Root>
{/if}
