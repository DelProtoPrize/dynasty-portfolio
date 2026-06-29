<script lang="ts">
  import { fmt } from '$lib/constants';

  let { rows, ondrill }: { rows: any[]; ondrill: (rosterId: number) => void } = $props();
</script>

<table class="w-full border-collapse text-xs">
  <thead>
    <tr class="border-b border-line">
      <th class="text-left text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Rank</th>
      <th class="text-left text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Team</th>
      <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Value</th>
      <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Assets</th>
      <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Pctile</th>
      <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">HHI</th>
    </tr>
  </thead>
  <tbody>
    {#each rows as d}
      <tr class="border-b border-line cursor-pointer hover:bg-panel-hover transition-colors" onclick={() => ondrill(d.roster_id)}>
        <td class="px-3 py-2 text-ink">{d.value_rank}</td>
        <td class="px-3 py-2 text-ink">{d.owner_name || 'Roster ' + d.roster_id}</td>
        <td class="px-3 py-2 text-ink text-right font-mono">{fmt(d.team_value)}</td>
        <td class="px-3 py-2 text-ink text-right font-mono">{d.n_assets}</td>
        <td class="px-3 py-2 text-ink text-right font-mono">{(d.value_percentile * 100).toFixed(0)}%</td>
        <td class="px-3 py-2 text-ink text-right font-mono">{Number(d.hhi).toFixed(3)}</td>
      </tr>
    {/each}
  </tbody>
</table>
