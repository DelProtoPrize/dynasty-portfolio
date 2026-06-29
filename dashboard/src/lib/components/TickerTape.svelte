<script lang="ts">
  import { onMount } from 'svelte';
  import { POS_COLOR, fmt } from '$lib/constants';

  let { leagueId }: { leagueId: string } = $props();
  let items: any[] = $state([]);

  onMount(async () => {
    if (!leagueId) return;
    try {
      const res = await fetch(`/api/leagues/${leagueId}/value`);
      const rows = await res.json();
      const usable = rows.filter((d: any) => d.fc_market_value != null && d.vbd_value != null);
      items = [...usable]
        .map((d: any) => ({ ...d, wedge: d.vbd_value - d.fc_market_value }))
        .sort((a: any, b: any) => Math.abs(b.wedge) - Math.abs(a.wedge))
        .slice(0, 14);
    } catch { /* endpoint absent */ }
  });
</script>

{#if items.length > 0}
  <div class="bg-surface border-b border-line flex items-center overflow-hidden h-8">
    <div class="text-[9px] font-bold tracking-[.1em] text-accent px-3 whitespace-nowrap border-r border-line">ASSET TAPE</div>
    <div class="flex-1 overflow-hidden">
      <div class="tape-inner flex gap-6 whitespace-nowrap">
        {#each [...items, ...items] as d}
          <div class="inline-flex items-center gap-1.5 text-[11px]">
            <span class="text-[9px] font-bold px-1 py-px rounded font-mono" style="background:{POS_COLOR[d.position] || '#8a95a8'}22;color:{POS_COLOR[d.position] || '#8a95a8'}">{d.position}</span>
            <span class="text-ink font-semibold">{d.player_name}</span>
            <span class="text-ink-dim font-mono text-[10px]">FC {fmt(Math.round(d.fc_market_value))}</span>
            <span class="font-mono text-[10px] font-semibold" style="color:{d.wedge > 0 ? '#3ecf74' : '#f5605a'}">{d.wedge > 0 ? '+' : ''}{fmt(Math.round(d.wedge))} wedge</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .tape-inner { animation: scroll 40s linear infinite; }
  @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
</style>
