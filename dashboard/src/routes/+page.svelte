<script lang="ts">
  import KpiCard from '$lib/components/KpiCard.svelte';
  import TickerTape from '$lib/components/TickerTape.svelte';
  import TeamValuationChart from '$lib/components/TeamValuationChart.svelte';
  import DiagnosticsTable from '$lib/components/DiagnosticsTable.svelte';
  import ArbitragePanel from '$lib/components/ArbitragePanel.svelte';
  import TriangulationChart from '$lib/components/TriangulationChart.svelte';
  import CorneringPanel from '$lib/components/CorneringPanel.svelte';
  import RosterDetail from '$lib/components/RosterDetail.svelte';
  import * as Card from '$lib/components/ui/card';
  import { fmt, pctShare, median, hhiTone } from '$lib/constants';

  let { data } = $props();
  let rosterDetail: any = $state(null);

  let currentLeague = $derived(data.leagueId);
  let diagnostics: any[] = $derived(data.diagnostics as any[]);
  let production: any[] = $derived(data.production as any[]);
  let projected: any[] = $derived((data as any).projected as any[] || []);

  let valueTotal = $derived(diagnostics.reduce((s: number, d: any) => s + (d.team_value || 0), 0));
  let prodTotal = $derived(production.reduce((s: number, d: any) => s + (d.production_vbd || 0), 0));
  let prodByRoster = $derived(
    Object.fromEntries(production.map((p: any) => [p.roster_id, p.production_vbd || 0]))
  );

  let topTeam = $derived(diagnostics.find((d: any) => d.value_rank === 1) || diagnostics[0]);
  let medHhi = $derived(median(diagnostics.map((d: any) => Number(d.hhi))));
  let hiHhi = $derived(diagnostics.reduce((a: any, b: any) => Number(a?.hhi) > Number(b?.hhi) ? a : b, diagnostics[0]));

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
</script>

<TickerTape leagueId={currentLeague} />

<div class="grid grid-cols-4 gap-3 mb-5">
  <KpiCard
    label="Portfolio Value"
    value={fmt(Math.round(valueTotal))}
    sub='<span class="delta-tag flat">LEAGUE</span><span>market cap · top: {topTeam?.owner_name || ""}</span>'
    tone="kpi-accent"
    tooltip="Sum of roster market value (FantasyPros 2QB)"
  />
  <KpiCard
    label="HHI Concentration"
    value={medHhi != null ? medHhi.toFixed(3) : '–'}
    sub='<span class="delta-tag flat">LEAGUE</span><span>median · most concentrated: {hiHhi?.owner_name || ""}</span>'
    tone={medHhi != null ? hhiTone(medHhi) : ''}
    tooltip="Herfindahl-Hirschman Index of positional value concentration"
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

<TeamValuationChart rows={diagnostics} />

<div class="h-5"></div>

<Card.Root>
  <Card.Header>
    <Card.Title>Diagnostics <span class="text-[11px] text-ink-faint font-normal normal-case tracking-normal ml-2">— click a team to drill in</span></Card.Title>
  </Card.Header>
  <Card.Content>
    <DiagnosticsTable rows={diagnostics} ondrill={onDrill} />
  </Card.Content>
</Card.Root>

<div class="h-5"></div>

<div class="grid grid-cols-2 gap-5">
  <ArbitragePanel leagueId={currentLeague} />
  <TriangulationChart leagueId={currentLeague} />
</div>

<div class="h-5"></div>

<CorneringPanel leagueId={currentLeague} {diagnostics} />

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
