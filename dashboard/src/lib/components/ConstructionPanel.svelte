<script lang="ts">
  import { onMount } from 'svelte';
  import { fmt } from '$lib/constants';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';

  let { leagueId, construction = [], diagnostics = [] }: { leagueId?: string; construction?: any[]; diagnostics?: any[] } = $props();

  // If not passed from server, fetch (for flexibility / portfolio mode)
  let rows: any[] = $state([]);

  onMount(async () => {
    if (construction?.length) {
      rows = construction;
      return;
    }
    if (!leagueId) return;
    try {
      const res = await fetch(`/api/leagues/${leagueId}/construction`);
      rows = await res.json();
    } catch { /* absent */ }
  });

  let top = $derived(rows[0] || null);
  let highSurplus = $derived([...rows].sort((a, b) => (b.surplus_vorp || 0) - (a.surplus_vorp || 0))[0] || null);
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Lineup Construction &amp; Surplus <span class="text-ink-dim font-normal">— optimal starters + trade capital</span></Card.Title>
  </Card.Header>
  <Card.Content>
    {#if !rows.length}
      <div class="text-center text-ink-dim text-xs py-6">No construction data yet (run lineup_solver)</div>
    {:else}
      <div class="grid grid-cols-2 gap-4 text-sm mb-3">
        <div class="bg-surface border border-line rounded p-3">
          <div class="text-[10px] uppercase tracking-widest text-ink-dim">Top Optimal Lineup</div>
          <div class="font-mono text-xl font-bold mt-1">{top ? fmt(top.osl_points) : '–'} pts</div>
          <div class="text-xs text-ink-dim mt-0.5">{top ? (diagnostics.find((d: any) => d.roster_id === top.roster_id)?.owner_name || 'Roster ' + top.roster_id) : ''}</div>
        </div>
        <div class="bg-surface border border-line rounded p-3">
          <div class="text-[10px] uppercase tracking-widest text-ink-dim">Highest Surplus</div>
          <div class="font-mono text-xl font-bold mt-1 text-good">+{highSurplus ? fmt(Math.round(highSurplus.surplus_vorp || 0)) : '–'} VORP</div>
          <div class="text-xs text-ink-dim mt-0.5">{highSurplus ? (diagnostics.find((d: any) => d.roster_id === highSurplus.roster_id)?.owner_name || 'Roster ' + highSurplus.roster_id) : ''} · {highSurplus?.surplus_count || 0} assets</div>
        </div>
      </div>

      <div class="text-[10px] text-ink-dim mb-1">Top 6 by projected starting points</div>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Team</Table.Head>
            <Table.Head class="text-right">OSL Pts</Table.Head>
            <Table.Head class="text-right">Surplus VORP</Table.Head>
            <Table.Head class="text-right">Surplus #</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each rows.slice(0, 6) as r}
            <Table.Row>
              <Table.Cell>{diagnostics.find((d: any) => d.roster_id === r.roster_id)?.owner_name || 'Roster ' + r.roster_id}</Table.Cell>
              <Table.Cell class="text-right font-mono">{fmt(r.osl_points)}</Table.Cell>
              <Table.Cell class="text-right font-mono text-good">+{fmt(Math.round(r.surplus_vorp || 0))}</Table.Cell>
              <Table.Cell class="text-right font-mono">{r.surplus_count ?? '–'}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}
  </Card.Content>
</Card.Root>