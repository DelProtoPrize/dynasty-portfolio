<script lang="ts">
  import PlotlyChart from './PlotlyChart.svelte';
  import * as Table from '$lib/components/ui/table';
  import { POS_COLOR, INK, fmt, pctShare } from '$lib/constants';

  let { rosterId, assets, meta, diagnostics, production, projected = [] }: {
    rosterId: number;
    assets: any[];
    meta: any;
    diagnostics: any[];
    production: any[];
    projected?: any[];
  } = $props();

  let valueTotal = $derived(diagnostics.reduce((s: number, d: any) => s + (d.team_value || 0), 0));
  let prodTotal = $derived(production.reduce((s: number, d: any) => s + (d.production_vbd || 0), 0));
  let prodByRoster = $derived(Object.fromEntries(production.map((p: any) => [p.roster_id, p.production_vbd || 0])));
  let vShare = $derived(pctShare(meta?.team_value, valueTotal));
  let pShare = $derived(prodTotal > 0 ? pctShare(prodByRoster[rosterId], prodTotal) : '–');
  let projTotal = $derived(projected.reduce((s: number, d: any) => s + (d.production_vbd || 0), 0));
  let projByRoster = $derived(Object.fromEntries(projected.map((p: any) => [p.roster_id, p.production_vbd || 0])));
  let projShare = $derived(projTotal > 0 ? pctShare(projByRoster[rosterId], projTotal) : '–');

  let valued = $derived(assets.filter(a => a.fp_market_value != null));

  let byPos = $derived(() => {
    const m: Record<string, number> = {};
    valued.forEach(a => { m[a.position] = (m[a.position] || 0) + a.fp_market_value; });
    return m;
  });

  let donutData = $derived([{
    type: 'pie' as const, hole: 0.55,
    labels: Object.keys(byPos()), values: Object.values(byPos()),
    marker: { colors: Object.keys(byPos()).map(p => POS_COLOR[p] || '#8a95a8'),
              line: { color: '#161b22', width: 2 } },
    textinfo: 'label+percent',
  }]);

  let donutLayout = $derived({
    margin: { l: 10, r: 10, t: 10, b: 10 }, showlegend: false,
    paper_bgcolor: 'transparent', font: { color: INK },
  });

  let wAge = $derived(() => {
    const wsum = valued.reduce((s, a) => s + (a.age ? a.fp_market_value : 0), 0);
    return wsum ? valued.reduce((s, a) => s + (a.age || 0) * a.fp_market_value, 0) / wsum : null;
  });
</script>

<section class="bg-panel border border-line rounded-lg overflow-hidden">
  <div class="flex items-center justify-between px-5 py-3 border-b border-line">
    <h2 class="text-sm font-semibold text-ink m-0">{meta?.owner_name || 'Roster ' + rosterId} — Roster Detail</h2>
  </div>

  <div class="px-5 pt-4">
    <div class="flex gap-2.5 flex-wrap mb-4">
      <div class="bg-surface border border-line rounded-md px-3.5 py-2 text-[10px] text-ink-dim uppercase tracking-[.06em] font-semibold">Total value<b class="block font-mono font-bold text-lg leading-tight text-ink mt-0.5 normal-case tracking-normal">{fmt(meta?.team_value)}</b></div>
      <div class="bg-surface border border-line rounded-md px-3.5 py-2 text-[10px] text-ink-dim uppercase tracking-[.06em] font-semibold">League rank<b class="block font-mono font-bold text-lg leading-tight text-ink mt-0.5 normal-case tracking-normal">#{meta?.value_rank}</b></div>
      <div class="bg-surface border border-line rounded-md px-3.5 py-2 text-[10px] text-ink-dim uppercase tracking-[.06em] font-semibold">HHI<b class="block font-mono font-bold text-lg leading-tight text-ink mt-0.5 normal-case tracking-normal">{meta?.hhi ? Number(meta.hhi).toFixed(3) : '–'}</b></div>
      <div class="bg-surface border border-line rounded-md px-3.5 py-2 text-[10px] text-ink-dim uppercase tracking-[.06em] font-semibold">Assets<b class="block font-mono font-bold text-lg leading-tight text-ink mt-0.5 normal-case tracking-normal">{valued.length}</b></div>
      <div class="bg-surface border border-line rounded-md px-3.5 py-2 text-[10px] text-ink-dim uppercase tracking-[.06em] font-semibold">Wtd Age<b class="block font-mono font-bold text-lg leading-tight text-ink mt-0.5 normal-case tracking-normal">{wAge() ? wAge()!.toFixed(1) : '–'}</b></div>
      <div class="bg-surface border border-line rounded-md px-3.5 py-2 text-[10px] text-ink-dim uppercase tracking-[.06em] font-semibold">Value share<b class="block font-mono font-bold text-lg leading-tight text-ink mt-0.5 normal-case tracking-normal">{vShare}</b></div>
      <div class="bg-surface border border-line rounded-md px-3.5 py-2 text-[10px] text-ink-dim uppercase tracking-[.06em] font-semibold">Prod. share (realized)<b class="block font-mono font-bold text-lg leading-tight text-ink mt-0.5 normal-case tracking-normal">{pShare}</b></div>
      <div class="bg-surface border border-line rounded-md px-3.5 py-2 text-[10px] text-ink-dim uppercase tracking-[.06em] font-semibold" title="m1 projection — at preseason as-ofs statistically ≈ the ECR baseline (see Model Lab); its validated edge is in-season">Prod. share (projected)<b class="block font-mono font-bold text-lg leading-tight text-ink mt-0.5 normal-case tracking-normal">{projShare}</b></div>
    </div>

    <div class="grid grid-cols-[300px_1fr] gap-6 items-start">
      <PlotlyChart data={donutData} layout={donutLayout} style="height:280px" />
      <div class="overflow-x-auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Player</Table.Head>
              <Table.Head>Pos</Table.Head>
              <Table.Head class="text-right">Age</Table.Head>
              <Table.Head>Team</Table.Head>
              <Table.Head class="text-right">FP</Table.Head>
              <Table.Head class="text-right">FC</Table.Head>
              <Table.Head class="text-right">VBD</Table.Head>
              <Table.Head class="text-right">PPG</Table.Head>
              <Table.Head class="text-right">Arb Δ</Table.Head>
              <Table.Head class="text-right">30d</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each assets as a}
              <Table.Row>
                <Table.Cell>{a.player_name || '–'}</Table.Cell>
                <Table.Cell><span class="pos pos-{a.position || ''}">{a.position || '?'}</span></Table.Cell>
                <Table.Cell class="text-right font-mono">{a.age ?? '–'}</Table.Cell>
                <Table.Cell>{a.nfl_team || '–'}</Table.Cell>
                <Table.Cell class="text-right font-mono">{fmt(a.fp_market_value)}</Table.Cell>
                <Table.Cell class="text-right font-mono">{fmt(a.fc_market_value)}</Table.Cell>
                <Table.Cell class="text-right font-mono">{fmt(a.vbd_value)}</Table.Cell>
                <Table.Cell class="text-right font-mono">{a.ppg != null ? Number(a.ppg).toFixed(1) : '–'}</Table.Cell>
                <Table.Cell class="text-right font-mono">{#if a.arb_delta_fp_minus_fc != null}<span class={a.arb_delta_fp_minus_fc > 0 ? 'text-good font-bold' : 'text-bad font-bold'}>{a.arb_delta_fp_minus_fc > 0 ? '+' : ''}{fmt(Math.round(a.arb_delta_fp_minus_fc))}</span>{:else}–{/if}</Table.Cell>
                <Table.Cell class="text-right font-mono">{a.fc_trend_30day != null ? fmt(Math.round(a.fc_trend_30day)) : '–'}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  </div>
</section>
