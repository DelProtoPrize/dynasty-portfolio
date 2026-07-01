<script lang="ts">
  import { fmt } from '$lib/constants';
  import * as Table from '$lib/components/ui/table';

  let { rows, ondrill }: { rows: any[]; ondrill: (rosterId: number) => void } = $props();
</script>

<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>Rank</Table.Head>
      <Table.Head>Team</Table.Head>
      <Table.Head class="text-right">Value</Table.Head>
      <Table.Head class="text-right">Assets</Table.Head>
      <Table.Head class="text-right">Pctile</Table.Head>
      <Table.Head class="text-right">HHI</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each rows as d}
      <Table.Row class="cursor-pointer" onclick={() => ondrill(d.roster_id)}>
        <Table.Cell>{d.value_rank}</Table.Cell>
        <Table.Cell>{d.owner_name || 'Roster ' + d.roster_id}</Table.Cell>
        <Table.Cell class="text-right font-mono">{fmt(d.team_value)}</Table.Cell>
        <Table.Cell class="text-right font-mono">{d.n_assets}</Table.Cell>
        <Table.Cell class="text-right font-mono">{(d.value_percentile * 100).toFixed(0)}%</Table.Cell>
        <Table.Cell class="text-right font-mono">{Number(d.hhi).toFixed(3)}</Table.Cell>
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>
