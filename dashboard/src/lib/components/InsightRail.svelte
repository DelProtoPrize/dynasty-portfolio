<script lang="ts">
  import { fmt } from '$lib/constants';

  let { diagnostics = [], construction = [], leagueId }: { diagnostics?: any[]; construction?: any[]; leagueId?: string } = $props();

  let arbRows: any[] = $state([]);
  let cornerData: any = $state(null);
  let nTeams = $derived(diagnostics.length || 12);

  $effect(() => {
    if (!leagueId) return;
    arbRows = [];
    cornerData = null;
    (async () => {
      try {
        const [arbRes, cornerRes] = await Promise.all([
          fetch(`/api/leagues/${leagueId}/arbitrage`).then(r => r.json()).catch(() => []),
          fetch(`/api/leagues/${leagueId}/cornering?basis=realized`).then(r => r.json()).catch(() => null)
        ]);
        arbRows = arbRes || [];
        cornerData = cornerRes;
      } catch {
        /* graceful */
      }
    })();
  });

  let insights = $derived.by(() => {
    const cards: Array<{ id: string; tag: string; head: string; why: string; tone: string; target: string }> = [];

    // 1. Cornering / scarcity (highest priority actionable)
    if (cornerData?.league?.length) {
      const sorted = [...cornerData.league].sort((a: any, b: any) => (b.hhi ?? 0) - (a.hhi ?? 0));
      const top = sorted[0];
      if (top && top.top_share > 0.12) {
        const posRosters = (cornerData.rosters || []).filter((r: any) => r.position === top.position);
        const leader = posRosters[0];
        const owner = diagnostics.find((d: any) => d.roster_id === leader?.roster_id)?.owner_name || `Roster ${leader?.roster_id}`;
        cards.push({
          id: 'corner',
          tag: 'Scarcity · Cornering',
          head: `${owner} controls ${(leader?.vona_share * 100 || top.top_share * 100).toFixed(0)}% of ${top.position} VONA`,
          why: `High concentration of startable ${top.position}s. Trade leverage or target alternatives.`,
          tone: 'i-signal',
          target: 'cornering-section'
        });
      }
    }

    // 2. Arbitrage opportunities
    if (arbRows.length) {
      const TH = 800;
      const big = arbRows.filter((d: any) => Math.abs(d.arb_delta_fp_minus_fc || 0) >= TH);
      if (big.length >= 2) {
        const buys = big.filter((d: any) => (d.arb_delta_fp_minus_fc || 0) < 0).length;
        const sells = big.length - buys;
        cards.push({
          id: 'arb',
          tag: 'Opportunity · Arbitrage',
          head: `${big.length} significant mispricings (${buys} undervalued by market)`,
          why: 'FP vs FC spread > threshold. Review for buy-low or sell-high candidates.',
          tone: 'i-opp',
          target: 'arbitrage-panel'
        });
      }
    }

    // 3. Concentration risk
    const hot = diagnostics.filter((r: any) => Number(r.hhi) > 0.20)
      .sort((a: any, b: any) => Number(b.hhi) - Number(a.hhi))[0];
    if (hot) {
      cards.push({
        id: 'risk',
        tag: 'Risk · Concentration',
        head: `${hot.owner_name || 'Top team'} HHI ${Number(hot.hhi).toFixed(3)} — fragile portfolio`,
        why: 'Value stacked in few assets. Single injury or bust can swing standings.',
        tone: 'i-risk',
        target: 'value-chart'
      });
    }

    // 4. Construction / Surplus capital (trade assets / depth)
    if (construction && construction.length) {
      const topSurplus = [...construction].sort((a: any, b: any) => (b.surplus_vorp || 0) - (a.surplus_vorp || 0))[0];
      const topOSL = construction[0]; // already ordered by osl_points DESC from server
      if (topSurplus && (topSurplus.surplus_vorp || 0) > 50) {
        const owner = diagnostics.find((d: any) => d.roster_id === topSurplus.roster_id)?.owner_name || `Roster ${topSurplus.roster_id}`;
        cards.push({
          id: 'capital',
          tag: 'Capital · Surplus',
          head: `${owner} has ${fmt(Math.round(topSurplus.surplus_vorp))} surplus VORP (${topSurplus.surplus_count || 0} excess assets)`,
          why: 'High surplus = trade chips or depth. Use for upgrades or protect against injury.',
          tone: 'i-capital',
          target: 'diagnostics-table'
        });
      } else if (topOSL) {
        const owner = diagnostics.find((d: any) => d.roster_id === topOSL.roster_id)?.owner_name || `Roster ${topOSL.roster_id}`;
        cards.push({
          id: 'capital',
          tag: 'Lineup · Strength',
          head: `${owner} fields the strongest optimal lineup (${topOSL.osl_points?.toFixed(1) || '?'} pts)`,
          why: 'Best projected starting output. Study their construction for best practices.',
          tone: 'i-capital',
          target: 'diagnostics-table'
        });
      }
    }

    return cards.slice(0, 4);
  });

  function goTo(target: string) {
    // Try common ids we will add, then fall back to scrolling the first matching card/section
    const el = document.getElementById(target) ||
               document.querySelector(`[data-insight-target="${target}"]`) ||
               document.querySelector('.cornering, #cornering, [id*="corner"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // brief highlight
      el.classList.add('ring-1', 'ring-accent');
      setTimeout(() => el.classList.remove('ring-1', 'ring-accent'), 1200);
    }
  }
</script>

{#if insights.length > 0}
  <div class="insight-rail mb-5">
    {#each insights as ins (ins.id)}
      <button
        type="button"
        class="insight-card {ins.tone} text-left w-full"
        onclick={() => goTo(ins.target)}
        aria-label="{ins.tag}: {ins.head}"
      >
        <div class="ic-tag">{ins.tag}</div>
        <div class="ic-head">{ins.head}</div>
        <div class="ic-why">{ins.why}</div>
      </button>
    {/each}
  </div>
{/if}

<style>
  .insight-rail {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
  .insight-card {
    background: var(--color-surface);
    border: 1px solid var(--color-line);
    border-left: 3px solid var(--color-accent);
    border-radius: 0 8px 8px 0;
    padding: 11px 14px;
    cursor: pointer;
    transition: background .15s;
    font-size: 13px;
  }
  .insight-card:hover { background: var(--color-panel-hover); }
  .insight-card:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }

  .insight-card.i-signal { border-left-color: var(--color-warn); }
  .insight-card.i-opp { border-left-color: var(--color-good); }
  .insight-card.i-capital { border-left-color: var(--color-accent); }
  .insight-card.i-risk { border-left-color: var(--color-bad); }

  .insight-card .ic-tag {
    font: 700 9px var(--font-mono);
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--color-ink-dim);
  }
  .insight-card .ic-head {
    font-size: 12.5px;
    color: var(--color-ink);
    margin-top: 4px;
    line-height: 1.4;
    font-weight: 600;
  }
  .insight-card .ic-why {
    font-size: 10.5px;
    color: var(--color-ink-faint);
    margin-top: 5px;
    line-height: 1.35;
  }
</style>
