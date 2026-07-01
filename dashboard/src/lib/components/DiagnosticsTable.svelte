<script lang="ts">
  import { fmt } from '$lib/constants';
  import * as Table from '$lib/components/ui/table';

  let { rows = [], ondrill }: { rows?: any[]; ondrill: (rosterId: number) => void } = $props();

  let filter = $state('');
  let sortCol: string | null = $state('value_rank');
  let sortDir: 'asc' | 'desc' = $state('asc');

  const columns = [
    { key: 'value_rank', label: 'Rank', numeric: true },
    { key: 'owner_name', label: 'Team', numeric: false },
    { key: 'team_value', label: 'Value', numeric: true },
    { key: 'value_delta_pct', label: 'Δ %', numeric: true },
    { key: 'n_assets', label: 'Assets', numeric: true },
    { key: 'value_percentile', label: 'Pctile', numeric: true },
    { key: 'hhi', label: 'HHI', numeric: true },
  ];

  let filteredSorted = $derived.by(() => {
    let out = [...(rows || [])];

    // filter
    const q = filter.trim().toLowerCase();
    if (q) {
      out = out.filter((d: any) =>
        (d.owner_name || '').toLowerCase().includes(q) ||
        String(d.roster_id).includes(q)
      );
    }

    // sort
    if (sortCol) {
      out.sort((a: any, b: any) => {
        let va = a[sortCol!];
        let vb = b[sortCol!];
        if (sortCol === 'owner_name') {
          va = (va || `Roster ${a.roster_id}`).toString();
          vb = (vb || `Roster ${b.roster_id}`).toString();
          return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        va = Number(va ?? 0);
        vb = Number(vb ?? 0);
        return sortDir === 'asc' ? va - vb : vb - va;
      });
    }
    return out;
  });

  function setSort(key: string) {
    if (sortCol === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortCol = key;
      sortDir = key === 'value_rank' ? 'asc' : 'desc';
    }
  }

  function exportCSV() {
    const data = filteredSorted;
    if (!data.length) return;
    const headers = ['Rank', 'Team', 'Value', 'DeltaPct', 'Assets', 'Pctile', 'HHI'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...data.map((d: any) => [
        d.value_rank,
        d.owner_name || 'Roster ' + d.roster_id,
        Math.round(d.team_value || 0),
        d.value_delta_pct != null ? d.value_delta_pct.toFixed(1) : '',
        d.n_assets || 0,
        ((d.value_percentile || 0) * 100).toFixed(0) + '%',
        Number(d.hhi || 0).toFixed(3)
      ].map(esc).join(','))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRowClick(d: any) {
    ondrill(d.roster_id);
  }
</script>

<div class="tbl-toolbar mb-3">
  <input
    type="search"
    placeholder="Filter teams…"
    bind:value={filter}
    class="bg-surface border border-line-strong rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent w-48"
  />
  <span class="text-[11px] text-ink-faint ml-1">{filteredSorted.length} / {rows.length}</span>
  <button
    type="button"
    onclick={exportCSV}
    class="ml-auto text-xs px-3 py-1 rounded border border-line-strong hover:bg-panel-hover active:bg-panel text-ink-dim"
  >
    Export CSV
  </button>
</div>

<Table.Root>
  <Table.Header>
    <Table.Row>
      {#each columns as col}
        <Table.Head
          class="cursor-pointer select-none hover:text-ink {sortCol === col.key ? (sortDir === 'asc' ? 'text-accent' : 'text-accent') : ''}"
          onclick={() => setSort(col.key)}
        >
          {col.label}
          {#if sortCol === col.key}{sortDir === 'asc' ? ' ↑' : ' ↓'}{:else} ↕{/if}
        </Table.Head>
      {/each}
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each filteredSorted as d (d.roster_id)}
      <Table.Row class="cursor-pointer" onclick={() => handleRowClick(d)}>
        <Table.Cell>{d.value_rank}</Table.Cell>
        <Table.Cell>{d.owner_name || 'Roster ' + d.roster_id}</Table.Cell>
        <Table.Cell class="text-right font-mono">{fmt(d.team_value)}</Table.Cell>
        <Table.Cell class="text-right font-mono">
          {#if d.value_delta_pct != null}
            <span class={d.value_delta_pct >= 0 ? 'text-good' : 'text-bad'}>
              {d.value_delta_pct >= 0 ? '+' : ''}{d.value_delta_pct.toFixed(1)}%
            </span>
          {:else}–{/if}
        </Table.Cell>
        <Table.Cell class="text-right font-mono">{d.n_assets}</Table.Cell>
        <Table.Cell class="text-right font-mono">{(d.value_percentile * 100 || 0).toFixed(0)}%</Table.Cell>
        <Table.Cell class="text-right font-mono">{Number(d.hhi || 0).toFixed(3)}</Table.Cell>
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>

<style>
  .tbl-toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .tbl-toolbar input:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
</style>
