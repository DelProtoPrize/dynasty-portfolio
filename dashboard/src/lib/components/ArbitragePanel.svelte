<script lang="ts">
  import { onMount } from 'svelte';
  import { fmt } from '$lib/constants';
  import * as Table from '$lib/components/ui/table';

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
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Player</Table.Head>
          <Table.Head>Pos</Table.Head>
          <Table.Head class="text-right">FP</Table.Head>
          <Table.Head class="text-right">FC</Table.Head>
          <Table.Head class="text-right">Delta</Table.Head>
          <Table.Head>Signal</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each rows.slice(0, 10) as r}
          <Table.Row>
            <Table.Cell>{r.player_name}</Table.Cell>
            <Table.Cell><span class="pos pos-{r.position}">{r.position}</span></Table.Cell>
            <Table.Cell class="text-right font-mono">{fmt(Math.round(r.fp_market_value))}</Table.Cell>
            <Table.Cell class="text-right font-mono">{fmt(Math.round(r.fc_market_value))}</Table.Cell>
            <Table.Cell class="text-right font-mono">
              <span class={r.arb_delta_fp_minus_fc > 0 ? 'arb-pos' : 'arb-neg'}>
                {r.arb_delta_fp_minus_fc > 0 ? '+' : ''}{fmt(Math.round(r.arb_delta_fp_minus_fc))}
              </span>
            </Table.Cell>
            <Table.Cell><span class="signal {signal(r.arb_delta_fp_minus_fc)}">
              {r.arb_delta_fp_minus_fc > 500 ? 'BUY' : r.arb_delta_fp_minus_fc < -500 ? 'SELL' : 'HOLD'}
            </span></Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {/if}
</section>
