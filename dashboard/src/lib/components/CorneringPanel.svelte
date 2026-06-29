<script lang="ts">
  import { onMount } from 'svelte';
  import PlotlyChart from './PlotlyChart.svelte';
  import { POS_COLOR, INK, GRID } from '$lib/constants';

  let { leagueId }: { leagueId: string } = $props();
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
</script>

{#if visible}
  <section class="bg-panel border border-line rounded-lg overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3 border-b border-line">
      <h2 class="text-sm font-semibold text-ink m-0">Positional Cornering <span class="text-ink-dim font-normal">— who controls scarce production</span></h2>
      <div class="flex gap-1">
        <button
          class="px-2.5 py-1 rounded text-[11px] cursor-pointer border {basis === 'realized' ? 'bg-panel text-ink border-line-strong' : 'bg-surface text-ink-dim border-line'}"
          onclick={() => basis = 'realized'}
        >Realized</button>
        <button
          class="px-2.5 py-1 rounded text-[11px] border {!cache.projected ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} {basis === 'projected' ? 'bg-panel text-ink border-line-strong' : 'bg-surface text-ink-dim border-line'}"
          disabled={!cache.projected}
          onclick={() => basis = 'projected'}
        >Projected</button>
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
  </section>
{/if}
