<script lang="ts">
  import PlotlyChart from './PlotlyChart.svelte';
  import { POS_COLOR, INK, fmt } from '$lib/constants';

  let { rosterId, assets, meta, diagnostics, production }: {
    rosterId: number;
    assets: any[];
    meta: any;
    diagnostics: any[];
    production: any[];
  } = $props();

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
    </div>

    <div class="grid grid-cols-[300px_1fr] gap-6 items-start">
      <PlotlyChart data={donutData} layout={donutLayout} style="height:280px" />
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-xs">
          <thead>
            <tr class="border-b border-line">
              <th class="text-left text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Player</th>
              <th class="text-left text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Pos</th>
              <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Age</th>
              <th class="text-left text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">Team</th>
              <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">FP</th>
              <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">FC</th>
              <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">VBD</th>
              <th class="text-right text-ink-dim font-semibold uppercase tracking-wider text-[10px] px-3 py-2">PPG</th>
            </tr>
          </thead>
          <tbody>
            {#each assets as a}
              <tr class="border-b border-line">
                <td class="px-3 py-2 text-ink">{a.player_name || '–'}</td>
                <td class="px-3 py-2"><span class="pos pos-{a.position || ''}">{a.position || '?'}</span></td>
                <td class="px-3 py-2 text-right font-mono text-ink">{a.age ?? '–'}</td>
                <td class="px-3 py-2 text-ink">{a.nfl_team || '–'}</td>
                <td class="px-3 py-2 text-right font-mono text-ink">{fmt(a.fp_market_value)}</td>
                <td class="px-3 py-2 text-right font-mono text-ink">{fmt(a.fc_market_value)}</td>
                <td class="px-3 py-2 text-right font-mono text-ink">{fmt(a.vbd_value)}</td>
                <td class="px-3 py-2 text-right font-mono text-ink">{a.ppg != null ? Number(a.ppg).toFixed(1) : '–'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</section>
