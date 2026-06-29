<script lang="ts">
  import { onMount } from 'svelte';
  import PlotlyChart from './PlotlyChart.svelte';
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

  let chartData = $derived(() => {
    if (!current?.league?.length) return [];
    return current.league.map((pos: any) => {
      const posRosters = current.rosters.filter((r: any) => r.position === pos.position);
      return {
        type: 'bar' as const, orientation: 'h' as const, name: pos.position,
        y: [pos.position],
        x: [pos.top_share * 100],
        marker: { color: POS_COLOR[pos.position] || '#8a95a8' },
        hovertemplate: `${pos.position}: %{x:.1f}% top share<extra></extra>`,
      };
    });
  });

  let chartLayout = $derived({
    margin: { l: 40, r: 20, t: 10, b: 40 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: INK }, barmode: 'group',
    xaxis: { title: 'Top holder share %', gridcolor: GRID, ticksuffix: '%' },
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
  <section class="bg-panel border border-line rounded-lg overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3 border-b border-line">
      <h2 class="text-sm font-semibold text-ink m-0">Positional Cornering <span class="text-ink-dim font-normal">— who controls scarce production</span></h2>
      <div class="flex gap-1">
        <Button.Root variant={basis === 'realized' ? 'active' : 'default'} onclick={() => basis = 'realized'}>Realized</Button.Root>
        <Button.Root variant={basis === 'projected' ? 'active' : 'default'} disabled={!cache.projected} onclick={() => basis = 'projected'}>Projected</Button.Root>
      </div>
    </div>
    <div class="grid grid-cols-[1fr_200px] gap-4 items-start p-4">
      <PlotlyChart data={chartData()} layout={chartLayout} style="height:300px" />
      <div class="flex flex-col gap-2">
        {#each current?.league || [] as pos}
          <div class="bg-surface border border-line rounded-md px-3 py-2 flex items-center gap-2">
            <span class="pos pos-{pos.position}">{pos.position}</span>
            <span class="font-mono font-bold text-base text-ink">{Number(pos.hhi).toFixed(3)}</span>
            <span class="text-[10px] text-ink-dim">{pos.hhi > 0.15 ? 'concentrated' : pos.hhi > 0.1 ? 'tilted' : 'balanced'}</span>
          </div>
        {/each}
      </div>
    </div>
    {#if diagText()}
      <div class="px-5 pb-4 text-sm text-ink border-t border-line pt-3 mt-2">
        {@html diagText()}
      </div>
    {/if}
  </section>
{/if}
