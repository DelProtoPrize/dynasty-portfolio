<script lang="ts">
  import { onMount } from 'svelte';
  import { fmt } from '$lib/constants';

  let { leagueId }: { leagueId: string } = $props();
  let rows: any[] = $state([]);

  onMount(async () => {
    if (!leagueId) return;
    try {
      const res = await fetch(`/api/leagues/${leagueId}/arbitrage`);
      rows = await res.json();
    } catch { /* endpoint absent */ }
  });

  function signal(delta: number): string {
    if (delta > 500) return 'signal-buy';
    if (delta < -500) return 'signal-sell';
    return 'signal-hold';
  }
</script>

<section class="bg-panel border border-line rounded-lg overflow-hidden">
  <div class="flex items-center justify-between px-5 py-3 border-b border-line">
    <h2 class="text-sm font-semibold text-ink m-0">Market Intelligence <span class="text-ink-dim font-normal">— FP vs FC arbitrage signals</span></h2>
  </div>
  {#if rows.length === 0}
    <div class="text-center text-ink-dim text-xs py-10">Awaiting arbitrage feed</div>
  {:else}
    <table class="w-full border-collapse text-xs">
      <thead>
        <tr class="border-b border-line">
          <th class="text-left text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Player</th>
          <th class="text-left text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Pos</th>
          <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">FP</th>
          <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">FC</th>
          <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Delta</th>
          <th class="text-left text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Signal</th>
        </tr>
      </thead>
      <tbody>
        {#each rows.slice(0, 10) as r}
          <tr class="border-b border-line">
            <td class="px-3 py-2 text-ink">{r.player_name}</td>
            <td class="px-3 py-2"><span class="pos pos-{r.position}">{r.position}</span></td>
            <td class="px-3 py-2 text-right font-mono text-ink">{fmt(Math.round(r.fp_market_value))}</td>
            <td class="px-3 py-2 text-right font-mono text-ink">{fmt(Math.round(r.fc_market_value))}</td>
            <td class="px-3 py-2 text-right font-mono">
              <span class={r.arb_delta_fp_minus_fc > 0 ? 'arb-pos' : 'arb-neg'}>
                {r.arb_delta_fp_minus_fc > 0 ? '+' : ''}{fmt(Math.round(r.arb_delta_fp_minus_fc))}
              </span>
            </td>
            <td class="px-3 py-2"><span class="signal {signal(r.arb_delta_fp_minus_fc)}">
              {r.arb_delta_fp_minus_fc > 500 ? 'BUY' : r.arb_delta_fp_minus_fc < -500 ? 'SELL' : 'HOLD'}
            </span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>
