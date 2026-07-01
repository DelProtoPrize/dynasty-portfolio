<script lang="ts">
  import KpiCard from '$lib/components/KpiCard.svelte';
  import TickerTape from '$lib/components/TickerTape.svelte';
  import TeamValuationChart from '$lib/components/TeamValuationChart.svelte';
  import DiagnosticsTable from '$lib/components/DiagnosticsTable.svelte';
  import ArbitragePanel from '$lib/components/ArbitragePanel.svelte';
  import TriangulationChart from '$lib/components/TriangulationChart.svelte';
  import CorneringPanel from '$lib/components/CorneringPanel.svelte';
  import RosterDetail from '$lib/components/RosterDetail.svelte';
  import InsightRail from '$lib/components/InsightRail.svelte';
  import ConstructionPanel from '$lib/components/ConstructionPanel.svelte';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';
  import { goto } from '$app/navigation';
  import { fmt, pctShare, median, hhiTone } from '$lib/constants';

  let { data } = $props();
  let rosterDetail: any = $state(null);

  const PORTFOLIO = '__portfolio__';
  let currentLeague = $derived(data.leagueId);
  let isPortfolio = $derived(currentLeague === PORTFOLIO);

  let diagnostics: any[] = $derived(data.diagnostics as any[]);
  let production: any[] = $derived(data.production as any[]);
  let projected: any[] = $derived((data as any).projected as any[] || []);
  let construction: any[] = $derived((data as any).construction as any[] || []);
  let valueHistory: any[] = $derived((data as any).valueHistory as any[] || []);
  let rosterDeltas: any[] = $derived((data as any).rosterDeltas as any[] || []);

  let valueTotal = $derived(diagnostics.reduce((s: number, d: any) => s + (d.team_value || 0), 0));
  let prodTotal = $derived(production.reduce((s: number, d: any) => s + (d.production_vbd || 0), 0));
  let prodByRoster = $derived(
    Object.fromEntries(production.map((p: any) => [p.roster_id, p.production_vbd || 0]))
  );



  // Merge historical delta into diagnostics for table
  let diagnosticsWithHistory = $derived(
    diagnostics.map((d: any) => {
      const hist = rosterDeltas.find((h: any) => h.roster_id === d.roster_id);
      return {
        ...d,
        prev_team_value: hist?.prev_team_value ?? null,
        value_delta_pct: hist?.value_delta_pct ?? null
      };
    })
  );

  // Lightweight Portfolio Overview data (client fetched summaries)
  let portfolioData: any[] = $state([]);
  let loadingPortfolio = $state(false);
  let showMethodology = $state(false);

  let topTeam = $derived(diagnostics.find((d: any) => d.value_rank === 1) || diagnostics[0]);
  let medHhi = $derived(median(diagnostics.map((d: any) => Number(d.hhi))));
  let hiHhi = $derived(diagnostics.reduce((a: any, b: any) => Number(a?.hhi) > Number(b?.hhi) ? a : b, diagnostics[0]));

  // Historical deltas from rosterDeltas (per roster prev)
  let prevTotal = $derived(rosterDeltas.reduce((s: number, h: any) => s + (h.prev_team_value || 0), 0));
  let valueDeltaPct = $derived(prevTotal > 0 ? ((valueTotal - prevTotal) / prevTotal * 100) : null);

  // Compute prev median HHI from rosterDeltas (using prev values)
  let prevMedHhi = $derived.by(() => {
    if (!rosterDeltas.length || prevTotal <= 0) return null;
    const hhIs = rosterDeltas
      .filter((h: any) => h.prev_team_value != null)
      .map((h: any) => {
        const share = h.prev_team_value / prevTotal;
        return share * share;
      });
    if (!hhIs.length) return null;
    const sorted = [...hhIs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  });
  let hhiDelta = $derived( (medHhi != null && prevMedHhi != null) ? (medHhi - prevMedHhi) : null );

  // Sparkline data for league value trend (chronological)
  let sparkPoints = $derived.by(() => {
    if (!valueHistory.length) return '';
    const vals = valueHistory.map((h: any) => h.total_value || 0);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const w = 80, h = 24;
    return vals.map((v: number, i: number) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    }).join(' ');
  });

  let prodLeader = $derived(() => {
    let leadId: number | null = null, leadV = -1;
    for (const [rid, v] of Object.entries(prodByRoster)) {
      if ((v as number) > leadV) { leadV = v as number; leadId = Number(rid); }
    }
    return { id: leadId, vbd: leadV };
  });

  async function onDrill(rosterId: number) {
    const res = await fetch(`/api/leagues/${currentLeague}/rosters/${rosterId}`);
    rosterDetail = {
      rosterId,
      assets: await res.json(),
      meta: diagnostics.find((d: any) => d.roster_id === rosterId)
    };
  }

  // Portfolio overview loader (lightweight, client-side for multiple leagues)
  $effect(() => {
    if (!isPortfolio) {
      portfolioData = [];
      return;
    }
    loadingPortfolio = true;
    (async () => {
      try {
        // Fetch leagues list then diagnostics for each (latest season per league group)
        const leaguesRes = await fetch('/api/leagues').then(r => r.json());
        const summaries = await Promise.all(
          leaguesRes.map(async (l: any) => {
            try {
              const diag = await fetch(`/api/leagues/${l.league_id}/diagnostics`).then(r => r.json());
              const totalVal = diag.reduce((s: number, d: any) => s + (d.team_value || 0), 0);
              const medH = median(diag.map((d: any) => Number(d.hhi)));
              return {
                league: l,
                diag,
                totalValue: totalVal,
                medHHI: medH,
                topTeam: diag.find((d: any) => d.value_rank === 1)
              };
            } catch { return { league: l, diag: [], totalValue: 0, medHHI: null }; }
          })
        );
        portfolioData = summaries;
      } catch (e) {
        portfolioData = [];
      }
      loadingPortfolio = false;
    })();
  });
</script>

<TickerTape leagueId={currentLeague} />

<InsightRail {diagnostics} {construction} leagueId={currentLeague} />

{#if isPortfolio}
  <div class="mb-6">
    <Card.Root>
      <Card.Header>
        <Card.Title>Portfolio Overview <span class="text-ink-dim font-normal">— cross-league snapshot</span></Card.Title>
      </Card.Header>
      <Card.Content>
        {#if loadingPortfolio}
          <div class="text-ink-dim text-sm py-4">Loading league summaries…</div>
        {:else if portfolioData.length}
          <div class="grid grid-cols-3 gap-3 mb-4 text-sm">
            <div>Leagues tracked: <b>{portfolioData.length}</b></div>
            <div>Teams: <b>{portfolioData.reduce((s, p) => s + (p.diag?.length || 0), 0)}</b></div>
            <div>Median HHI (across): <b>{(median(portfolioData.map(p => p.medHHI).filter(Boolean)) || 0).toFixed(3)}</b></div>
          </div>

          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>League</Table.Head>
                <Table.Head class="text-right">Teams</Table.Head>
                <Table.Head class="text-right">Total Value</Table.Head>
                <Table.Head class="text-right">Med HHI</Table.Head>
                <Table.Head>Top Team</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each portfolioData as p}
                <Table.Row class="cursor-pointer" onclick={() => { /* switch to this league */ goto(`?league=${p.league.league_id}`, { replaceState:true }); }}>
                  <Table.Cell>{p.league.league_name} ({p.league.season})</Table.Cell>
                  <Table.Cell class="text-right font-mono">{p.diag?.length || 0}</Table.Cell>
                  <Table.Cell class="text-right font-mono">{fmt(Math.round(p.totalValue || 0))}</Table.Cell>
                  <Table.Cell class="text-right font-mono">{p.medHHI != null ? p.medHHI.toFixed(3) : '–'}</Table.Cell>
                  <Table.Cell>{p.topTeam?.owner_name || '–'}</Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
          <div class="text-[10px] text-ink-faint mt-2">Click a row to load that league's full dashboard.</div>
        {:else}
          <div class="text-ink-dim">No portfolio data.</div>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
{:else}
<div class="grid grid-cols-4 gap-3 mb-5">
  <KpiCard
    label="Portfolio Value"
    value={fmt(Math.round(valueTotal))}
    sub={valueDeltaPct != null 
      ? `<span class="delta-tag ${valueDeltaPct >= 0 ? 'up' : 'down'}">${valueDeltaPct >= 0 ? '+' : ''}${valueDeltaPct.toFixed(1)}%</span><span>market cap vs prev snapshot · top: ${topTeam?.owner_name || ""}</span>`
      : '<span class="delta-tag flat">LEAGUE</span><span>market cap · top: ' + (topTeam?.owner_name || "") + '</span>'}
    tone="kpi-accent"
    tooltip="Sum of roster market value (FantasyPros 2QB) — includes owned draft picks via v_roster_assets. Delta vs previous snapshot date."
  />
  <KpiCard
    label="HHI Concentration"
    value={medHhi != null ? medHhi.toFixed(3) : '–'}
    sub={hhiDelta != null 
      ? `<span class="delta-tag flat">${hhiDelta >= 0 ? '+' : ''}${hhiDelta.toFixed(3)}</span><span>median vs prev · most concentrated: ${hiHhi?.owner_name || ""}</span>`
      : '<span class="delta-tag flat">LEAGUE</span><span>median · most concentrated: ' + (hiHhi?.owner_name || "") + '</span>'}
    tone={medHhi != null ? hhiTone(medHhi) : ''}
    tooltip="Herfindahl-Hirschman Index of positional value concentration. Lower is better (more diversified). Delta is change vs previous snapshot."
  />
  <KpiCard
    label="Value Share"
    value={pctShare(topTeam?.team_value, valueTotal)}
    sub='<span class="delta-tag up">LEADER</span><span>{topTeam?.owner_name || ""} · click a team for its share</span>'
    tone="kpi-accent"
    tooltip="Share of total league market value"
  />
  <KpiCard
    label="Production Share"
    value={prodTotal > 0 ? pctShare(prodLeader().vbd, prodTotal) : '–'}
    sub={prodTotal > 0
      ? `<span class="delta-tag up">LEADER</span><span>share of league VBD</span>`
      : '<span class="delta-tag flat">PENDING</span><span>run models</span>'}
    tone={prodTotal > 0 ? 'kpi-good' : ''}
    tooltip="Share of league VBD (points over replacement)"
  />
</div>

{#if sparkPoints && valueHistory.length > 1}
  <div class="flex items-center gap-2 mb-4 text-xs text-ink-dim">
    <span>Value trend:</span>
    <svg width="80" height="24" class="inline-block align-middle" viewBox="0 0 80 24">
      <polyline 
        points={sparkPoints} 
        fill="none" 
        stroke="var(--color-accent)" 
        stroke-width="1.5" 
        stroke-linejoin="round" 
        stroke-linecap="round" 
      />
    </svg>
    <span class="text-[10px]">({valueHistory.length} snapshots)</span>
  </div>
{/if}

<div class="mb-2">
  <button 
    class="text-[10px] px-2 py-0.5 rounded border border-line-strong text-ink-dim hover:text-ink hover:bg-panel-hover"
    onclick={() => showMethodology = !showMethodology}
  >
    ⓘ Methodology &amp; Data Sources
  </button>
</div>

{#if showMethodology}
  <Card.Root class="mb-4 border-accent/30">
    <Card.Header>
      <Card.Title class="text-sm">Methodology Notes</Card.Title>
    </Card.Header>
    <Card.Content class="text-xs text-ink-dim space-y-2 leading-relaxed">
      <div>
        <strong>HHI (Herfindahl-Hirschman Index):</strong> Measures concentration as <code>SUM( (value_share)^2 )</code> across a team's assets. 
        0 = perfectly diversified, higher = more concentrated (0.25+ is high). Uses current snapshot fp_market_value (incl. picks via v_roster_assets).
      </div>
      <div>
        <strong>Value data:</strong> FantasyPros (via DynastyProcess) for expert-derived fp values; FantasyCalc for crowd-sourced market (fc) values. 
        v_roster_assets view unions players + draft picks. Historical from fact_roster_historical_value snapshots (ETL runs).
      </div>
      <div>
        <strong>Deltas &amp; trends:</strong> Compared to the previous available snapshot date. Sparklines show recent total league portfolio value trajectory.
      </div>
      <div>
        <strong>Limitations:</strong> No TEP applied at source; projections used for production. See Model Lab for backtest validation of models.
      </div>
      <button class="text-[10px] underline" onclick={() => showMethodology = false}>Close</button>
    </Card.Content>
  </Card.Root>
{/if}

<div id="value-chart" data-insight-target="value-chart">
  <TeamValuationChart rows={diagnosticsWithHistory} />
</div>

<div class="h-5"></div>

<Card.Root id="diagnostics-table" data-insight-target="diagnostics-table">
  <Card.Header>
    <Card.Title>Diagnostics <span class="text-[11px] text-ink-faint font-normal normal-case tracking-normal ml-2">— click a team to drill in · includes draft picks</span></Card.Title>
  </Card.Header>
  <Card.Content>
    <DiagnosticsTable rows={diagnosticsWithHistory} ondrill={onDrill} />
  </Card.Content>
</Card.Root>

<div class="h-5"></div>

<div class="grid grid-cols-2 gap-5">
  <div id="arbitrage-panel" data-insight-target="arbitrage-panel">
    <ArbitragePanel leagueId={currentLeague} />
  </div>
  <TriangulationChart leagueId={currentLeague} />
</div>

<div class="h-5"></div>

<div id="cornering-section" data-insight-target="cornering-section">
  <CorneringPanel leagueId={currentLeague} {diagnostics} />
</div>

<div class="h-5"></div>

<ConstructionPanel leagueId={currentLeague} {construction} {diagnostics} />

{/if}

{#if rosterDetail}
  <div class="h-5"></div>
  <RosterDetail
    rosterId={rosterDetail.rosterId}
    assets={rosterDetail.assets}
    meta={rosterDetail.meta}
    {diagnostics}
    {production}
    {projected}
  />
{/if}
