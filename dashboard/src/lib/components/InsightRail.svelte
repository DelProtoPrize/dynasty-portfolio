<script lang="ts">
  // InsightRail — auto-generated executive cards, rules-derived from real
  // endpoint data only. A card whose source endpoint is absent is OMITTED,
  // never invented; zero cards hides the rail entirely.
  //
  // INTEGRITY FIXES vs the 2026-07-01 port (fix/insight-rail-integrity):
  //   1. Surplus threshold: surplus_vorp is PER-WEEK VORP (a league-best war
  //      chest runs ~8–12/wk). The previous `> 50` assumed season totals and
  //      could never fire — the capital card was dead code.
  //   2. Cornering threshold restored to 1.5 / nTeams (1.5× the even share),
  //      self-calibrating across league sizes. The hardcoded 0.12 under-fired
  //      in 14-team leagues and over-fired in 10-team leagues; nTeams was
  //      derived but never used.
  //   3. Non-TEP caveat restored to the arbitrage card (FP/FC are not
  //      TEP-segmented; TE deltas are less reliable) and the BUY side is
  //      defined precisely: FC (settings-aware) above FP (consensus).
  //   4. Durability suffix restored: within-team realized→projected VONA
  //      share delta, text only — HHIs are never compared across bases
  //      (projection shrinkage mechanically concentrates the elite pool).
  //   5. Win-now tilt card restored (largest |production − value| share gap);
  //      needs the `production` prop from +page.svelte. Cause-neutral wording:
  //      the gap's sign is known, its cause needs the roster table.
  //   6. goTo() wildcard fallback removed — a broken target should do nothing
  //      rather than scroll the user to an unrelated section.

  let { diagnostics = [], construction = [], production = [], leagueId }: {
    diagnostics?: any[]; construction?: any[]; production?: any[]; leagueId?: string
  } = $props();

  let arbRows: any[] = $state([]);
  let cornerData: any = $state(null);
  let cornerProj: any = $state(null);
  let nTeams = $derived(diagnostics.length || 12);
  let valueTotal = $derived(diagnostics.reduce((s: number, d: any) => s + (d.team_value || 0), 0));
  let prodTotal = $derived(production.reduce((s: number, d: any) => s + (d.production_vbd || 0), 0));

  $effect(() => {
    if (!leagueId) return;
    arbRows = [];
    cornerData = null;
    cornerProj = null;
    (async () => {
      try {
        const [arbRes, cornerRes, projRes] = await Promise.all([
          fetch(`/api/leagues/${leagueId}/arbitrage`).then(r => r.json()).catch(() => []),
          fetch(`/api/leagues/${leagueId}/cornering?basis=realized`).then(r => r.json()).catch(() => null),
          fetch(`/api/leagues/${leagueId}/cornering?basis=projected`).then(r => r.json()).catch(() => null)
        ]);
        arbRows = arbRes || [];
        cornerData = cornerRes;
        cornerProj = projRes?.league?.length ? projRes : null;
      } catch {
        /* graceful — cards from absent sources are omitted */
      }
    })();
  });

  const ownerOf = (rid: number) =>
    diagnostics.find((d: any) => d.roster_id === rid)?.owner_name || `Roster ${rid}`;

  let insights = $derived.by(() => {
    const cards: Array<{ id: string; tag: string; head: string; why: string; tone: string; target: string }> = [];

    // 1. Cornering / scarcity — threshold is 1.5× the even share (1/nTeams),
    //    so "corner" means the same thing in a 10-team and a 14-team league.
    if (cornerData?.league?.length) {
      const sorted = [...cornerData.league].sort((a: any, b: any) => (b.hhi ?? 0) - (a.hhi ?? 0));
      const top = sorted[0];
      if (top && top.top_share > 1.5 / nTeams) {
        const posRosters = (cornerData.rosters || []).filter((r: any) => r.position === top.position);
        const leader = posRosters[0];  // API orders by vona_share DESC within position
        const share = leader?.vona_share ?? top.top_share;
        // Durability: within-team realized→projected share delta, TEXT ONLY.
        // Cross-basis HHI comparisons stay forbidden (shrinkage runs them hot).
        let extra = '';
        if (cornerProj && leader) {
          const mine = (cornerProj.rosters || []).find(
            (r: any) => r.position === top.position && r.roster_id === leader.roster_id);
          if (mine?.vona_share != null) {
            extra = mine.vona_share >= share - 0.01
              ? ' — corner holds on projection' : ' — moat depreciating on projection';
          }
        }
        cards.push({
          id: 'corner',
          tag: 'Scarcity · Cornering',
          head: `${ownerOf(leader?.roster_id)} controls ${(share * 100).toFixed(1)}% of ${top.position} VONA${extra}`,
          why: `${leader?.elite_count ?? '?'} of ${top.elite_total} startable ${top.position}s (HHI ${top.hhi?.toFixed(3)}). Cornered above-replacement production = trade leverage at ${top.position}.`,
          tone: 'i-signal',
          target: 'cornering-section'
        });
      }
    }

    // 2. Arbitrage — Δ = FP − FC. BUY side = the settings-aware market (FC)
    //    prices the player ABOVE consensus (FP). Signal, not advice.
    if (arbRows.length) {
      const TH = 800;
      const big = arbRows.filter((d: any) => Math.abs(d.arb_delta_fp_minus_fc || 0) >= TH);
      if (big.length >= 2) {
        const buys = big.filter((d: any) => (d.arb_delta_fp_minus_fc || 0) < 0).length;
        cards.push({
          id: 'arb',
          tag: 'Opportunity · Arbitrage',
          head: `${big.length} significant FP↔FC mispricings (${buys} BUY-side: FC above consensus)`,
          why: 'Where consensus (FP) and settings-aware (FC) pricing diverge. Signal, not advice — values are non-TEP, so TE deltas are less reliable.',
          tone: 'i-opp',
          target: 'arbitrage-panel'
        });
      }
    }

    // 3. Construction / surplus capital — surplus_vorp is VORP PER WEEK.
    //    Threshold 5/wk ≈ half a strong league-best war chest (~11/wk observed);
    //    below that, fall back to the optimal-lineup-strength read.
    if (construction && construction.length) {
      const topSurplus = [...construction].sort((a: any, b: any) => (b.surplus_vorp || 0) - (a.surplus_vorp || 0))[0];
      const topOSL = construction[0]; // server orders by osl_points DESC
      if (topSurplus && (topSurplus.surplus_vorp || 0) > 5) {
        cards.push({
          id: 'capital',
          tag: 'Capital · Surplus',
          head: `${ownerOf(topSurplus.roster_id)} benches ${topSurplus.surplus_count || 0} startable player${(topSurplus.surplus_count || 0) === 1 ? '' : 's'} — ${(topSurplus.surplus_vorp || 0).toFixed(2)} VORP/wk of trade capital`,
          why: 'Startable surplus = above-replacement players the optimal lineup cannot fit. They score nothing on the bench; they are trade assets.',
          tone: 'i-capital',
          target: 'construction-panel'
        });
      } else if (topOSL) {
        cards.push({
          id: 'capital',
          tag: 'Lineup · Strength',
          head: `${ownerOf(topOSL.roster_id)} fields the strongest optimal lineup (${topOSL.osl_points?.toFixed(1) || '?'} pts/wk)`,
          why: 'Best optimal starting output under the Hungarian assignment — greedy slot-filling is provably suboptimal with flex overlaps.',
          tone: 'i-capital',
          target: 'construction-panel'
        });
      }
    }

    // 4. Win-now tilt — largest |production share − value share| gap.
    //    Cause-neutral wording: a negative gap means market value runs ahead
    //    of current production (youth, injury, or SF-QB scarcity — the roster
    //    table says which); positive = producing above its market share.
    if (prodTotal > 0 && valueTotal > 0 && diagnostics.length) {
      const prodBy = Object.fromEntries(production.map((p: any) => [p.roster_id, p.production_vbd || 0]));
      let best: { r: any; g: number } | null = null;
      for (const r of diagnostics) {
        const g = (prodBy[r.roster_id] || 0) / prodTotal - (r.team_value || 0) / valueTotal;
        if (!best || Math.abs(g) > Math.abs(best.g)) best = { r, g };
      }
      if (best && Math.abs(best.g) > 0.02) {
        const winNow = best.g > 0;
        cards.push({
          id: 'tilt',
          tag: 'Signal · Win-Now vs Value',
          head: `${best.r.owner_name || 'Roster ' + best.r.roster_id}: ${winNow ? '+' : ''}${(best.g * 100).toFixed(1)}pp production vs value — ${winNow ? 'strongest win-now tilt' : 'most value ahead of production'}`,
          why: winNow
            ? 'Produces more than its market share of value — contending now; watch aging risk on the roster table.'
            : 'Market value runs ahead of current production — youth, injury, or SF-QB scarcity; the roster table says which.',
          tone: winNow ? 'i-signal' : 'i-risk',
          target: 'diagnostics-table'
        });
      }
    }

    // 5. Concentration risk — only when someone is genuinely top-heavy.
    const hot = diagnostics.filter((r: any) => Number(r.hhi) > 0.20)
      .sort((a: any, b: any) => Number(b.hhi) - Number(a.hhi))[0];
    if (hot) {
      cards.push({
        id: 'risk',
        tag: 'Risk · Concentration',
        head: `${hot.owner_name || 'Top team'} HHI ${Number(hot.hhi).toFixed(3)} — most fragile portfolio`,
        why: 'Value stacked in few assets. A single injury or bust moves a large share of team value; diversification is cheap insurance.',
        tone: 'i-risk',
        target: 'value-chart'
      });
    }

    return cards.slice(0, 4);
  });

  function goTo(target: string) {
    // Exact targets only — no wildcard fallback. A broken target should do
    // nothing rather than scroll the user somewhere unrelated.
    const el = document.getElementById(target) ||
               document.querySelector(`[data-insight-target="${target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
