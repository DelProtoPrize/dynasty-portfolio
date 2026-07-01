// app.js — fetch from our own API and render. The browser never touches Sleeper
// or any external source; it only reads pre-computed analytics from our backend.
//
// CHANGES (KPI + tape wiring, presentation-only otherwise):
//   1. KPI strip: Portfolio Value + HHI wired with REAL data, scoped — league
//      aggregates by default, selected roster after a drill-in. Sharpe/Alpha
//      stay untouched (their engines don't exist yet; cards remain PENDING).
//   2. Ticker tape: wired from the /value endpoint already fetched for the
//      triangulation scatter. Items = largest |VBD − FP| wedges (the
//      off-diagonal players from the scatter). No FC arbitrage here — that
//      endpoint doesn't serve fc values, so nothing is invented.
//   3. All new DOM writes are null-safe: this file still works on the old
//      index.html (no KPI/tape elements) without errors.
//   4. Plotly grid/font constants aligned to the new design tokens.

const api = (path) => fetch(`/api${path}`).then((r) => r.json());
const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString());
const leagueSel = document.getElementById('league');

const POS_COLOR = { QB: '#3d80f5', RB: '#3ecf74', WR: '#e8a838', TE: '#b47cf5' };
const INK = '#dde4ee', GRID = '#1e2530';

let currentLeague = null;
let currentRows = [];
let prodByRoster = null;   // roster_id -> production_vbd (null = endpoint absent)
let prodTotal = 0;
let projByRoster = null;   // projected basis (m1); null until project_production.py + route v2
let projTotal = 0;
let cornerCache = { realized: null, projected: null };  // per-league fetch cache
let cornerBasis = 'realized';
let arbRows = null;          // /arbitrage cache for the current league
let constrRows = null;       // /construction cache for the current league
let allLeagues = [];         // /leagues response (for the Portfolio view)
const PORTFOLIO = '__portfolio__';
let valueTotal = 0;

/* ── Table enhancement: client-side sort / filter / CSV export ─────────────
   Vanilla implementation of the shadcn table patterns — adopting shadcn or
   bits-ui literally would mean a React/Svelte migration, which is a product
   phase, not a table feature. Sorting reorders <tr> nodes in place, so
   delegated click handlers (roster drill-in) survive untouched. */
function enhanceTable(container, { csvName = 'export', filter = true } = {}) {
  if (!container) return;
  const table = container.querySelector('table');
  if (!table || table.dataset.enhanced) return;
  table.dataset.enhanced = '1';
  const tbody = table.querySelector('tbody');
  const headers = [...table.querySelectorAll('thead th')];

  const bar = document.createElement('div');
  bar.className = 'tbl-toolbar';
  if (filter) {
    const inp = document.createElement('input');
    inp.type = 'search';
    inp.placeholder = 'Filter rows…';
    inp.setAttribute('aria-label', 'Filter table rows');
    const count = document.createElement('span');
    count.className = 'tbl-count';
    inp.addEventListener('input', () => {
      const q = inp.value.trim().toLowerCase();
      let shown = 0;
      for (const tr of tbody.querySelectorAll('tr:not(.surplus-row)')) {
        const hit = !q || tr.textContent.toLowerCase().includes(q);
        tr.style.display = hit ? '' : 'none';
        // keep an expanded surplus subrow glued to its parent's visibility
        const next = tr.nextElementSibling;
        if (next && next.classList.contains('surplus-row')) next.style.display = hit ? '' : 'none';
        if (hit) shown++;
      }
      count.textContent = q ? `${shown} shown` : '';
    });
    bar.append(inp, count);
  }
  const exp = document.createElement('button');
  exp.type = 'button';
  exp.textContent = 'Export CSV';
  exp.addEventListener('click', () => {
    const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
    const rows = [headers.map((h) => esc(h.textContent.trim()))];
    for (const tr of tbody.querySelectorAll('tr:not(.surplus-row)')) {
      if (tr.style.display === 'none') continue;
      rows.push([...tr.children].map((td) => esc(td.textContent.trim())));
    }
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${csvName}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  bar.append(exp);
  container.insertBefore(bar, table);

  const num = (t) => {
    const n = parseFloat(t.replace(/[%,]/g, '').replace('–', ''));
    return Number.isFinite(n) ? n : null;
  };
  headers.forEach((th, i) => {
    th.classList.add('sortable');
    th.addEventListener('click', () => {
      const dir = th.classList.contains('asc') ? 'desc' : 'asc';
      headers.forEach((h) => h.classList.remove('asc', 'desc'));
      th.classList.add(dir);
      // detach surplus subrows; they re-glue to their parents after the sort
      const glue = new Map();
      for (const sr of tbody.querySelectorAll('tr.surplus-row')) {
        glue.set(sr.previousElementSibling, sr);
        sr.remove();
      }
      const trs = [...tbody.querySelectorAll('tr')];
      trs.sort((a, b) => {
        const ta = a.children[i]?.textContent.trim() ?? '';
        const tb = b.children[i]?.textContent.trim() ?? '';
        const na = num(ta), nb = num(tb);
        const cmp = (na != null && nb != null) ? na - nb : ta.localeCompare(tb);
        return dir === 'asc' ? cmp : -cmp;
      });
      trs.forEach((tr) => {
        tbody.appendChild(tr);
        const sr = glue.get(tr);
        if (sr) tbody.appendChild(sr);
      });
    });
  });
}

/* ── KPI strip (null-safe: absent on old index.html) ───────────────────── */
function setKpi(id, value, sub, tone) {
  const card = document.getElementById(id);
  if (!card) return;
  card.classList.remove('unwired', 'kpi-accent', 'kpi-good', 'kpi-warn', 'kpi-bad');
  if (tone) card.classList.add(tone);
  card.querySelector('.kpi-value').textContent = value;
  const subEl = card.querySelector('.kpi-sub');
  if (subEl) subEl.innerHTML = sub;
}

const hhiTone = (h) => (h > 0.2 ? 'kpi-bad' : h > 0.15 ? 'kpi-warn' : 'kpi-good');
const pctShare = (x, total) => (total > 0 && x != null ? ((x / total) * 100).toFixed(1) + '%' : '–');
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : null;
};

function leagueKpis(rows) {
  if (!rows.length) return;
  valueTotal = rows.reduce((s, d) => s + (d.team_value || 0), 0);
  const top = rows.find((d) => d.value_rank === 1) || rows[0];
  setKpi('kpiPortfolio', fmt(Math.round(valueTotal)),
    `<span class="delta-tag flat">LEAGUE</span><span>market cap · top: ${top.owner_name || 'Roster ' + top.roster_id}</span>`,
    'kpi-accent');
  const med = median(rows.map((d) => Number(d.hhi)));
  const hi = rows.reduce((a, b) => (Number(a.hhi) > Number(b.hhi) ? a : b));
  setKpi('kpiHhi', med != null ? med.toFixed(3) : '–',
    `<span class="delta-tag flat">LEAGUE</span><span>median · most concentrated: ${hi.owner_name || 'Roster ' + hi.roster_id} (${Number(hi.hhi).toFixed(3)})</span>`,
    med != null ? hhiTone(med) : null);

  // Value Share — league leader by default ("league leader per metric").
  setKpi('kpiValueShare', pctShare(top.team_value, valueTotal),
    `<span class="delta-tag up">LEADER</span><span>${top.owner_name || 'Roster ' + top.roster_id} · click a team for its share</span>`,
    'kpi-accent');

  // Production Share — league leader, from the /production endpoint.
  if (prodByRoster) {
    let leadId = null, leadV = -1;
    for (const [rid, v] of Object.entries(prodByRoster)) {
      if (v > leadV) { leadV = v; leadId = Number(rid); }
    }
    const leadMeta = rows.find((d) => d.roster_id === leadId) || {};
    setKpi('kpiProdShare', pctShare(leadV, prodTotal),
      `<span class="delta-tag up">LEADER</span><span>${leadMeta.owner_name || 'Roster ' + leadId} · share of league VBD</span>`,
      'kpi-good');
  } else {
    setKpi('kpiProdShare', '–',
      `<span class="delta-tag todo">UNWIRED</span><span>add /leagues/:id/production (see server patch)</span>`,
      null);
  }
}

function shares(meta) {
  const vShare = valueTotal > 0 ? (meta.team_value || 0) / valueTotal : null;
  const pShare = prodByRoster && prodTotal > 0
    ? (prodByRoster[meta.roster_id] || 0) / prodTotal : null;
  return { vShare, pShare };
}

function rosterKpis(meta) {
  setKpi('kpiPortfolio', fmt(meta.team_value),
    `<span class="delta-tag ${meta.value_rank <= 3 ? 'up' : 'flat'}">#${meta.value_rank}</span><span>${meta.owner_name || 'Roster ' + meta.roster_id} · click league to reset</span>`,
    'kpi-accent');
  const h = Number(meta.hhi);
  setKpi('kpiHhi', h.toFixed(3),
    `<span class="delta-tag ${h > 0.2 ? 'down' : h > 0.15 ? 'flat' : 'up'}">${h > 0.2 ? 'HIGH' : h > 0.15 ? 'MOD' : 'LOW'}</span><span>${meta.owner_name || 'roster'} concentration</span>`,
    hhiTone(h));

  const { vShare, pShare } = shares(meta);
  const projShare = projByRoster && projTotal > 0
    ? (projByRoster[meta.roster_id] || 0) / projTotal : null;
  setKpi('kpiValueShare', vShare != null ? (vShare * 100).toFixed(1) + '%' : '–',
    `<span class="delta-tag flat">TEAM</span><span>${meta.owner_name || 'roster'} share of league value</span>`,
    'kpi-accent');
  if (pShare != null && vShare != null) {
    // Production vs value gap = win-now vs rebuild tilt, in one number.
    const gap = pShare - vShare;
    const tag = gap > 0.01 ? 'up' : gap < -0.01 ? 'down' : 'flat';
    // Cause-neutral labels: a negative gap means market value runs ahead of
    // current production — could be youth, injury, or SF-QB scarcity. The
    // sign is known; the cause needs the roster table to confirm.
    const word = gap > 0.01 ? 'win-now tilt' : gap < -0.01 ? 'value ahead of production' : 'balanced';
    const projNote = projShare != null ? ` · proj ${(projShare * 100).toFixed(1)}%` : '';
    setKpi('kpiProdShare', (pShare * 100).toFixed(1) + '%',
      `<span class="delta-tag ${tag}">${gap >= 0 ? '+' : ''}${(gap * 100).toFixed(1)}pp vs value</span><span>${word}${projNote}</span>`,
      gap > 0.01 ? 'kpi-good' : gap < -0.01 ? 'kpi-warn' : 'kpi-accent');
  } else {
    setKpi('kpiProdShare', '–',
      `<span class="delta-tag todo">UNWIRED</span><span>add /leagues/:id/production (see server patch)</span>`,
      null);
  }
}

/* ── Tape: win-now wedge = |VBD − FC|, the scatter's off-diagonal players.
      FC (settings-aware) is the market side per the locked rule; players
      without an FC value (deep bench, mostly rookies) simply don't tape.
      Fed by the SAME /value rows the triangulation fetches — nothing extra,
      nothing invented. Stays in placeholder state if the VBD layer is empty. */
function wireTape(rows) {
  const wrap = document.getElementById('tapeInner');
  if (!wrap) return;
  const usable = rows.filter((d) => d.fc_market_value != null && d.vbd_value != null);
  if (!usable.length) return; // keep honest placeholder
  const items = [...usable]
    .map((d) => ({ ...d, wedge: d.vbd_value - d.fc_market_value }))
    .sort((a, b) => Math.abs(b.wedge) - Math.abs(a.wedge))
    .slice(0, 14)
    .map((d) => {
      const col = POS_COLOR[d.position] || '#8a95a8';
      const wCol = d.wedge > 0 ? '#3ecf74' : '#f5605a';
      return `<div class="tape-item">
        <span class="pos-badge" style="background:${col}22;color:${col}">${d.position}</span>
        <span class="name">${d.player_name}${d.years_exp === 0 ? '·R' : ''}</span>
        <span class="val">FC ${fmt(Math.round(d.fc_market_value))}</span>
        <span class="delta" style="color:${wCol}" title="VBD minus FC market value">${d.wedge > 0 ? '+' : ''}${fmt(Math.round(d.wedge))} wedge</span>
      </div>`;
    }).join('');
  wrap.innerHTML = items + items; // duplicated for seamless loop
  wrap.classList.remove('unwired');
}

/* ── Insight rail: 2–4 auto-generated executive cards ───────────────────────
   Every card is RULES-DERIVED from data already fetched this render — the
   thresholds are visible below, the sources are the panels themselves, and a
   card whose source endpoint is absent is omitted. Zero cards = hidden rail.
   Click scrolls to the source panel. This is the cornering-diag narrative
   pattern promoted to the top of the page. */
function buildInsights() {
  const rail = document.getElementById('insightRail');
  if (!rail) return;
  const cards = [];
  const nTeams = currentRows.length || 14;

  // 1) Cornering (SIGNAL): most-cornered position, if meaningfully above even share
  const cr = cornerCache.realized;
  if (cr && cr.league?.length) {
    const top = [...cr.league].sort((a, b) => (b.hhi ?? 0) - (a.hhi ?? 0))[0];
    if (top.top_share > 1.5 / nTeams) {
      let extra = '';
      if (cornerCache.projected) {
        const mine = cornerCache.projected.rosters.find(
          (x) => x.position === top.position && x.roster_id === top.top_roster_id);
        if (mine?.vona_share != null) {
          extra = mine.vona_share >= top.top_share - 0.01
            ? ' — corner holds on projection' : ' — moat depreciating on projection';
        }
      }
      cards.push({ pri: 1, cls: 'i-signal', tag: 'Signal · Cornering', target: 'cornerPanel',
        head: `${ownerName(top.top_roster_id)} corners ${(top.top_share * 100).toFixed(1)}% of ${top.position} VONA${extra}`,
        why: `Highest positional concentration in the league (HHI ${top.hhi?.toFixed(3)}). Cornered production = pricing power in trades at ${top.position}.` });
    }
  }

  // 2) Arbitrage (OPPORTUNITY): count of large FP↔FC pricing disagreements
  if (arbRows?.length) {
    const TH = 1500;
    const big = arbRows.filter((d) => Math.abs(d.arb_delta_fp_minus_fc) >= TH);
    if (big.length) {
      const buys = big.filter((d) => d.arb_delta_fp_minus_fc < 0).length;
      const lead = big[0];
      cards.push({ pri: 2, cls: 'i-opp', tag: 'Opportunity · Arbitrage', target: 'arbPanel',
        head: `${big.length} pricing disagreement${big.length === 1 ? '' : 's'} ≥ ${fmt(TH)} (${buys} BUY-side) — top: ${lead.player_name} (${lead.arb_delta_fp_minus_fc > 0 ? '+' : ''}${fmt(Math.round(lead.arb_delta_fp_minus_fc))})`,
        why: 'FP−FC gaps mark where consensus and settings-aware pricing diverge. Signal, not advice; TE deltas are non-TEP and less reliable.' });
    }
  }

  // 3) Construction (CAPITAL): the trade-capital war chest
  if (constrRows?.length) {
    const war = [...constrRows].sort((a, b) => (b.surplus_vorp || 0) - (a.surplus_vorp || 0))[0];
    if (war?.surplus_vorp > 0) {
      cards.push({ pri: 3, cls: 'i-capital', tag: 'Capital · Construction', target: 'constructionPanel',
        head: `${ownerName(war.roster_id)} benches ${war.surplus_count} startable player${war.surplus_count === 1 ? '' : 's'} (${war.surplus_vorp.toFixed(2)} VORP/wk) — deepest trade capital`,
        why: 'Startable surplus = above-replacement players the optimal lineup cannot fit. They score nothing on the bench; they are trade assets.' });
    }
  }

  // 4) Win-now tilt (RISK/SIGNAL): the biggest production-vs-value gap
  if (prodByRoster && prodTotal > 0 && valueTotal > 0) {
    let best = null;
    for (const r of currentRows) {
      const g = (prodByRoster[r.roster_id] || 0) / prodTotal - (r.team_value || 0) / valueTotal;
      if (!best || Math.abs(g) > Math.abs(best.g)) best = { r, g };
    }
    if (best && Math.abs(best.g) > 0.02) {
      const winNow = best.g > 0;
      cards.push({ pri: 4, cls: winNow ? 'i-signal' : 'i-risk', tag: 'Signal · Win-Now vs Value', target: 'diagTable',
        head: `${ownerName(best.r.roster_id)}: ${winNow ? '+' : ''}${(best.g * 100).toFixed(1)}pp production vs value — ${winNow ? 'strongest win-now tilt' : 'most value ahead of production'}`,
        why: winNow
          ? 'Produces more than its market share of value — contending now; watch aging risk on the roster table.'
          : 'Market value runs ahead of current production — youth, injury, or SF-QB scarcity; the roster table says which.' });
    }
  }

  // 5) Concentration risk (RISK): only when someone is genuinely top-heavy
  const hot = currentRows.filter((r) => Number(r.hhi) > 0.2)
    .sort((a, b) => b.hhi - a.hhi)[0];
  if (hot) {
    cards.push({ pri: 5, cls: 'i-risk', tag: 'Risk · Concentration', target: 'valueChart',
      head: `${ownerName(hot.roster_id)} runs HHI ${Number(hot.hhi).toFixed(3)} — most fragile portfolio in the league`,
      why: 'High HHI = value stacked in few assets. One injury moves a big share of team value; diversification is cheap insurance.' });
  }

  const pick = cards.sort((a, b) => a.pri - b.pri).slice(0, 4);
  if (!pick.length) { rail.style.display = 'none'; rail.innerHTML = ''; return; }
  rail.innerHTML = pick.map((c) => `
    <div class="insight-card ${c.cls}" role="button" tabindex="0" data-target="${c.target}">
      <div class="ic-tag">${c.tag}</div>
      <div class="ic-head">${c.head}</div>
      <div class="ic-why">${c.why}</div>
    </div>`).join('');
  rail.style.display = '';
  if (!rail.dataset.wired) {
    rail.dataset.wired = '1';
    const go = (e) => {
      const card = e.target.closest('.insight-card');
      if (card) document.getElementById(card.dataset.target)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    rail.addEventListener('click', go);
    rail.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(e); });
  }
}

/* ── Portfolio Overview: cross-league aggregation ────────────────────────────
   One current row per league NAME (latest season). Values stay within-league
   currencies — shares and ranks are comparable across leagues, raw value sums
   are NOT (different scoring/rosters), so no fabricated grand total is shown. */
function leaguePanelIds() {
  return ['insightRail', 'valueChart', 'diagTable', 'triPanel', 'arbPanel',
          'cornerPanel', 'constructionPanel', 'rosterPanel'];
}
async function renderPortfolio() {
  currentLeague = PORTFOLIO;
  for (const id of leaguePanelIds()) {
    const el = document.getElementById(id);
    if (el) el.closest('section.panel') ? (el.closest('section.panel').style.display = 'none') : (el.style.display = 'none');
  }
  const panel = document.getElementById('portfolioPanel');
  if (!panel) return;
  panel.style.display = '';

  // latest season per league name
  const latest = new Map();
  for (const l of allLeagues) {
    const cur = latest.get(l.league_name);
    if (!cur || Number(l.season) > Number(cur.season)) latest.set(l.league_name, l);
  }
  const leagues = [...latest.values()];
  const per = await Promise.all(leagues.map(async (l) => {
    let diag = [];
    try { diag = await api(`/leagues/${l.league_id}/diagnostics`); } catch { /* absent */ }
    const total = diag.reduce((s, d) => s + (d.team_value || 0), 0);
    const med = median(diag.map((d) => Number(d.hhi)));
    const top = diag.find((d) => d.value_rank === 1);
    return { l, diag, total, med, top };
  }));

  const sum = document.getElementById('portfolioSummary');
  if (sum) sum.innerHTML = `
    <div class="stat">Leagues<b>${per.length}</b></div>
    <div class="stat">Teams tracked<b>${per.reduce((s, p) => s + p.diag.length, 0)}</b></div>
    <div class="stat" title="Median across leagues of each league's median HHI">Typical concentration<b>${(median(per.map((p) => p.med).filter((x) => x != null)) ?? 0).toFixed(3)}</b></div>`;

  const tbl = document.getElementById('portfolioTable');
  if (tbl) {
    tbl.innerHTML = `
      <table><thead><tr>
        <th>League</th><th>Season</th><th>Format</th><th class="num">Teams</th>
        <th class="num">Market cap</th><th class="num">Median HHI</th><th>Value leader</th>
      </tr></thead><tbody>
        ${per.map(({ l, diag, total, med, top }) => `<tr class="clickable" data-league="${l.league_id}">
          <td>${l.league_name}</td>
          <td class="num">${l.season}</td>
          <td>${l.is_superflex ? 'SF' : '1QB'}${l.te_premium_value ? ' · TEP' : ''}</td>
          <td class="num">${diag.length}</td>
          <td class="num" title="Within-league currency — not comparable across leagues">${fmt(Math.round(total))}</td>
          <td class="num">${med != null ? med.toFixed(3) : '–'}</td>
          <td>${top ? (top.owner_name || 'Roster ' + top.roster_id) : '–'}</td>
        </tr>`).join('')}
      </tbody></table>`;
    tbl.querySelector('tbody').addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-league]');
      if (tr) { leagueSel.value = tr.dataset.league; leagueSel.dispatchEvent(new Event('change')); }
    });
    enhanceTable(tbl, { csvName: 'portfolio_overview' });
  }

  // concentration comparison: each league's team-HHI spread as a dot strip
  const traces = per.filter((p) => p.diag.length).map((p) => ({
    type: 'scatter', mode: 'markers', name: p.l.league_name,
    x: p.diag.map((d) => Number(d.hhi)),
    y: p.diag.map(() => p.l.league_name),
    text: p.diag.map((d) => d.owner_name || 'Roster ' + d.roster_id),
    marker: { size: 8, opacity: 0.75 },
    hovertemplate: '%{text}: HHI %{x:.3f}<extra>' + p.l.league_name + '</extra>',
  }));
  if (traces.length) Plotly.react('portfolioChart', traces, {
    margin: { l: 150, r: 20, t: 10, b: 40 }, showlegend: false,
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: INK },
    xaxis: { title: 'Team HHI (concentration) — one dot per team', gridcolor: GRID },
    yaxis: { gridcolor: GRID },
  }, { displayModeBar: false, responsive: true });
}

function showLeaguePanels() {
  const pf = document.getElementById('portfolioPanel');
  if (pf) pf.style.display = 'none';
  for (const id of ['valueChart', 'diagTable', 'arbPanel', 'cornerPanel', 'constructionPanel']) {
    const el = document.getElementById(id);
    const sec = el?.closest('section.panel');
    if (sec) sec.style.display = '';
  }
}

async function init() {
  const leagues = await api('/leagues');
  allLeagues = leagues;
  // Show the season so repeated league names (one row per season) are distinguishable.
  leagueSel.innerHTML =
    `<option value="${PORTFOLIO}">★ Portfolio Overview — all leagues</option>` +
    leagues.map((l) => `<option value="${l.league_id}">${l.league_name} (${l.season})${l.is_superflex ? ' · SF' : ''}</option>`)
      .join('');
  leagueSel.addEventListener('change', () =>
    leagueSel.value === PORTFOLIO ? renderPortfolio() : render(leagueSel.value));
  if (leagues.length) { leagueSel.value = leagues[0].league_id; render(leagues[0].league_id); }
}

async function render(leagueId) {
  currentLeague = leagueId;
  showLeaguePanels();
  document.getElementById('rosterPanel').style.display = 'none';
  const rows = await api(`/leagues/${leagueId}/diagnostics`);
  currentRows = rows;
  // Production sums (graceful: cards stay dashed if the route isn't deployed).
  prodByRoster = null; prodTotal = 0; projByRoster = null; projTotal = 0;
  try {
    const prod = await api(`/leagues/${leagueId}/production`);
    if (Array.isArray(prod)) {
      prodByRoster = Object.fromEntries(prod.map((p) => [p.roster_id, p.production_vbd || 0]));
      prodTotal = prod.reduce((s, p) => s + (p.production_vbd || 0), 0);
    }
  } catch { /* endpoint absent — leave null */ }
  try {
    const proj = await api(`/leagues/${leagueId}/production?basis=projected`);
    if (Array.isArray(proj) && proj.length) {
      projByRoster = Object.fromEntries(proj.map((p) => [p.roster_id, p.production_vbd || 0]));
      projTotal = proj.reduce((s, p) => s + (p.production_vbd || 0), 0);
    }
  } catch { /* projection layer not built — pills show a dash */ }
  leagueKpis(rows);

  // Horizontal bar of team value, colored by HHI concentration (red = top-heavy).
  Plotly.react('valueChart', [{
    type: 'bar', orientation: 'h',
    x: rows.map((d) => d.team_value).reverse(),
    y: rows.map((d) => d.owner_name || `Roster ${d.roster_id}`).reverse(),
    marker: { color: rows.map((d) => d.hhi).reverse(), colorscale: 'YlOrRd',
              showscale: true, colorbar: { title: 'HHI' } },
    hovertemplate: '%{y}<br>value %{x:,.0f}<extra></extra>',
  }], {
    margin: { l: 170, r: 40, t: 10, b: 40 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: INK }, xaxis: { gridcolor: GRID },
  }, { displayModeBar: false, responsive: true });

  // Diagnostics table — rows are clickable to drill into a roster.
  document.getElementById('diagTable').innerHTML = `
    <table><thead><tr>
      <th>Rank</th><th>Team</th><th class="num">Value</th>
      <th class="num">Assets</th><th class="num">Pctile</th><th class="num">HHI</th>
    </tr></thead><tbody>
      ${rows.map((d) => `<tr class="clickable" data-roster="${d.roster_id}">
        <td>${d.value_rank}</td>
        <td>${d.owner_name || 'Roster ' + d.roster_id}</td>
        <td class="num">${fmt(d.team_value)}</td>
        <td class="num">${d.n_assets}</td>
        <td class="num">${(d.value_percentile * 100).toFixed(0)}%</td>
        <td class="num">${Number(d.hhi).toFixed(3)}</td>
      </tr>`).join('')}
    </tbody></table>`;

  document.querySelector('#diagTable tbody').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-roster]');
    if (tr) drillRoster(Number(tr.dataset.roster));
  });
  enhanceTable(document.getElementById('diagTable'), { csvName: `diagnostics_${leagueId}` });

  await Promise.all([
    renderTriangulation(leagueId),
    renderCornering(leagueId),
    renderArbitrage(leagueId),
    renderConstruction(leagueId),
  ]);
  buildInsights();
}

/* ── Market Intelligence: wires the /arbitrage route (top |FP−FC| gaps).
   Δ>0 = consensus (FP) above settings-aware (FC) → SELL side; Δ<0 = FC
   premium → BUY side. Signal, not advice — the header tooltip carries the
   definition and the non-TEP caveat. Empty/absent route keeps the honest
   state message. */
async function renderArbitrage(leagueId) {
  const el = document.getElementById('arbTable');
  if (!el) return;
  arbRows = null;
  let rows;
  try { rows = await api(`/leagues/${leagueId}/arbitrage`); } catch { return; }
  if (!Array.isArray(rows) || !rows.length) return;
  arbRows = rows;
  const sig = (d) => d < 0
    ? '<span class="signal signal-buy">BUY</span>'
    : '<span class="signal signal-sell">SELL</span>';
  el.innerHTML = `
    <table><thead><tr>
      <th>Player</th><th>Pos</th><th class="num">FP</th><th class="num">FC</th>
      <th class="num">Δ (FP−FC)</th><th>Signal</th>
    </tr></thead><tbody>
      ${rows.map((d) => `<tr>
        <td>${d.player_name}</td>
        <td><span class="pos pos-${d.position || ''}">${d.position || '?'}</span></td>
        <td class="num">${fmt(d.fp_market_value)}</td>
        <td class="num">${fmt(d.fc_market_value)}</td>
        <td class="num"><span class="${d.arb_delta_fp_minus_fc < 0 ? 'arb-pos' : 'arb-neg'}">${d.arb_delta_fp_minus_fc > 0 ? '+' : ''}${fmt(Math.round(d.arb_delta_fp_minus_fc))}</span></td>
        <td>${sig(d.arb_delta_fp_minus_fc)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  enhanceTable(el, { csvName: `arbitrage_${leagueId}` });
}

/* ── Roster Construction: surfaces the Hungarian solver output that already
   lives behind /construction + /surplus. Click a row to expand its surplus
   detail (the trade-capital list). The basis chip shows points_basis verbatim
   — realized ppg or the m1 projection, whatever the latest solver run used —
   because a lineup number without its basis is how numbers start lying. */
async function renderConstruction(leagueId) {
  const el = document.getElementById('constructionTable');
  if (!el) return;
  constrRows = null;
  const chip = document.getElementById('constructionBasis');
  const diag = document.getElementById('constructionDiag');
  let rows;
  try { rows = await api(`/leagues/${leagueId}/construction`); } catch { return; }
  if (!Array.isArray(rows) || !rows.length) return;
  constrRows = rows;
  if (chip) chip.textContent = rows[0].points_basis || '';
  const maxOsl = Math.max(...rows.map((d) => d.osl_points || 0), 1);
  el.innerHTML = `
    <table><thead><tr>
      <th>Team</th><th class="num">OSL pts</th><th></th>
      <th class="num">Surplus</th><th class="num">Surplus VORP/wk</th>
      <th class="num">Greedy gap</th><th class="num">Empty slots</th>
    </tr></thead><tbody>
      ${rows.map((d) => `<tr class="clickable" data-constr="${d.roster_id}">
        <td>${ownerName(d.roster_id)}</td>
        <td class="num">${(d.osl_points ?? 0).toFixed(1)}</td>
        <td style="min-width:120px"><div class="value-bar"><div class="value-bar-fill"
          style="width:${((d.osl_points || 0) / maxOsl * 100).toFixed(0)}%;background:var(--accent)"></div></div></td>
        <td class="num">${d.surplus_count ?? 0}</td>
        <td class="num">${(d.surplus_vorp ?? 0).toFixed(2)}</td>
        <td class="num">${d.hungarian_gain > 0 ? '+' + d.hungarian_gain.toFixed(1) : '0'}</td>
        <td class="num">${d.slots_empty ?? 0}</td>
      </tr>`).join('')}
    </tbody></table>`;
  el.querySelector('tbody').addEventListener('click', async (e) => {
    const tr = e.target.closest('tr[data-constr]');
    if (!tr) return;
    const open = tr.nextElementSibling?.classList.contains('surplus-row');
    el.querySelectorAll('tr.surplus-row').forEach((x) => x.remove());
    if (open) return;   // toggle closed
    let sp;
    try { sp = await api(`/leagues/${currentLeague}/rosters/${tr.dataset.constr}/surplus`); } catch { return; }
    const sub = document.createElement('tr');
    sub.className = 'surplus-row';
    sub.innerHTML = `<td colspan="7">${
      (Array.isArray(sp) && sp.length)
        ? 'Surplus (startable, benched by the optimal lineup): ' + sp.map((x) =>
            `<span class="pos pos-${x.position}">${x.position}</span> ${x.player_name} (${(x.vorp ?? 0).toFixed(2)} VORP)`).join(' · ')
        : 'No above-replacement surplus — every startable player starts.'
    }</td>`;
    tr.after(sub);
  });
  enhanceTable(el, { csvName: `construction_${leagueId}` });
  if (diag) {
    const top = rows[0];
    const war = [...rows].sort((a, b) => (b.surplus_vorp || 0) - (a.surplus_vorp || 0))[0];
    let line = `<b>${ownerName(top.roster_id)}</b> fields the strongest optimal lineup (${top.osl_points.toFixed(1)} pts/wk)`;
    if (war && war.surplus_vorp > 0) {
      line += `; <b>${ownerName(war.roster_id)}</b> holds the deepest startable surplus — ${war.surplus_count} players, ${war.surplus_vorp.toFixed(2)} VORP/wk of trade capital riding the bench.`;
    } else { line += '.'; }
    diag.innerHTML = line;
    diag.style.display = 'block';
  }
}

/* ── Positional Cornering (Step 4 UI) ──────────────────────────────────────
   Who controls the scarce production, per position, against the FIXED
   realized replacement bar. Both bases come from the same route; HHIs are
   never compared across bases (projected runs mechanically hot — shrinkage
   thins the elite pool). The durability line is a WITHIN-TEAM realized→
   projected share delta, rendered as text on the diagnostic strip — the one
   cross-basis read the caveat permits. */
const ownerName = (rid) =>
  (currentRows.find((r) => r.roster_id === rid) || {}).owner_name || `Roster ${rid}`;
const MUTED_SEG = ['#2a3340', '#242c38', '#1f2630', '#343e4d'];

async function renderCornering(leagueId) {
  const chartEl = document.getElementById('cornerChart');
  if (!chartEl) return;                       // old page — feature absent
  cornerCache = { realized: null, projected: null };
  cornerBasis = 'realized';
  try {
    const r = await api(`/leagues/${leagueId}/cornering?basis=realized`);
    if (r && Array.isArray(r.league) && r.league.length) cornerCache.realized = r;
  } catch { /* route absent — empty state stays */ }
  try {
    const r = await api(`/leagues/${leagueId}/cornering?basis=projected`);
    if (r && Array.isArray(r.league) && r.league.length) cornerCache.projected = r;
  } catch { /* projection layer absent — toggle disables below */ }

  const toggle = document.getElementById('cornerToggle');
  if (toggle && !toggle.dataset.wired) {
    toggle.dataset.wired = '1';
    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-basis]');
      if (!btn || btn.disabled) return;
      cornerBasis = btn.dataset.basis;
      toggle.querySelectorAll('button').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.basis === cornerBasis)));
      drawCornering();
    });
  }
  if (toggle) {
    const projBtn = toggle.querySelector('button[data-basis="projected"]');
    if (projBtn) {
      projBtn.disabled = !cornerCache.projected;
      projBtn.title = cornerCache.projected ? '' :
        'Projected basis unavailable — run project_production.py, then cornering_metrics.py';
    }
  }
  drawCornering();
}

function drawCornering() {
  const chartEl = document.getElementById('cornerChart');
  const cardsEl = document.getElementById('cornerCards');
  const diagEl = document.getElementById('cornerDiag');
  if (!chartEl) return;
  const data = cornerCache[cornerBasis];
  if (!data) {
    chartEl.innerHTML = `<div class="state-msg">Cornering tables not built yet — run
      <code>python project_production.py</code> → <code>python cornering_metrics.py</code></div>`;
    if (cardsEl) cardsEl.innerHTML = '';
    if (diagEl) diagEl.style.display = 'none';
    return;
  }

  const league = [...data.league].sort((a, b) => (b.hhi ?? 0) - (a.hhi ?? 0));
  const positions = league.map((l) => l.position);
  const nTeams = currentRows.length || 14;
  const evenHhi = 1 / nTeams;

  // one trace per "share rank within position" so segment colors are per-cell:
  // top holder gets the position color, the field gets muted shades.
  const byPos = {};
  for (const row of data.rosters) (byPos[row.position] ??= []).push(row);
  for (const posRows of Object.values(byPos)) posRows.sort((a, b) => (b.vona_share ?? 0) - (a.vona_share ?? 0));
  const maxLen = Math.max(...Object.values(byPos).map((r) => r.length), 0);
  const traces = [];
  for (let k = 0; k < maxLen; k++) {
    const xs = [], cols = [], cd = [];
    for (const pos of positions) {
      const row = (byPos[pos] || [])[k];
      xs.push(row ? row.vona_share : 0);
      cols.push(k === 0 ? (POS_COLOR[pos] || '#8a95a8') : MUTED_SEG[k % MUTED_SEG.length]);
      cd.push(row ? [ownerName(row.roster_id), (row.vona_share * 100).toFixed(1), row.elite_count] : ['', '', '']);
    }
    traces.push({
      type: 'bar', orientation: 'h', x: xs, y: positions, marker: { color: cols },
      customdata: cd, showlegend: false,
      hovertemplate: '%{customdata[0]}: %{customdata[1]}% of %{y} VONA · %{customdata[2]} startable<extra></extra>',
    });
  }
  Plotly.react('cornerChart', traces, {
    barmode: 'stack', margin: { l: 44, r: 10, t: 6, b: 34 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: INK, size: 12 },
    xaxis: { tickformat: '.0%', gridcolor: GRID, range: [0, 1], zeroline: false },
    yaxis: { autorange: 'reversed' },
  }, { displayModeBar: false, responsive: true });

  // right: HHI cards
  if (cardsEl) {
    const label = (h) => h / evenHhi > 1.8 ? 'concentrated' : h / evenHhi > 1.3 ? 'tilted' : 'balanced';
    cardsEl.innerHTML = league.map((l, i) => `
      <div class="hhi-card${i === 0 ? ' cornered' : ''}">
        <div class="hc-row">
          <span class="hc-pos" style="color:${POS_COLOR[l.position] || '#8a95a8'}">${l.position}</span>
          <span class="hc-hhi">${l.hhi != null ? l.hhi.toFixed(3) : '–'}</span>
        </div>
        <div class="hc-sub">${l.hhi != null ? label(l.hhi) : 'no data'} · top: ${ownerName(l.top_roster_id)}
          ${l.n_unprojected ? ` · ${l.n_unprojected} unprojected` : ''}</div>
      </div>`).join('');
  }

  // bottom: plain-language diagnostic for the most-cornered position
  if (diagEl) {
    const top = league[0];
    const rows = byPos[top.position] || [];
    const lead = rows[0], second = rows[1];
    if (!lead) { diagEl.style.display = 'none'; return; }
    let line = `<b>${ownerName(lead.roster_id)}</b> holds ${lead.elite_count} of ${top.elite_total} startable ${top.position}s — carrying <b>${(lead.vona_share * 100).toFixed(1)}%</b> of league ${top.position} VONA`;
    if (second) {
      line += `, vs ${ownerName(second.roster_id)}'s ${second.elite_count} at ${(second.vona_share * 100).toFixed(1)}%`;
      if (lead.elite_count <= second.elite_count) line += '. Quality cornering, not body-count';
    }
    line += '.';
    // durability: within-team realized→projected delta, text only (per caveat)
    if (cornerBasis === 'realized' && cornerCache.projected) {
      const projRows = cornerCache.projected.rosters
        .filter((r) => r.position === top.position);
      const mine = projRows.find((r) => r.roster_id === lead.roster_id);
      if (mine && mine.vona_share != null) {
        const holds = mine.vona_share >= lead.vona_share - 0.01;
        line += `<span class="durability">${top.position} corner: ${(lead.vona_share * 100).toFixed(1)}% → ${(mine.vona_share * 100).toFixed(1)}% projected · ${holds ? 'corner holds' : 'moat depreciating'}</span>`;
      }
    }
    diagEl.innerHTML = line;
    diagEl.style.display = 'block';
  }
}

// Win-now (VBD, production over replacement) vs dynasty (FP market price). Each point
// is a player; the dotted line is parity. Top-left = produces now but the dynasty
// market discounts him (aging vets — sell-high). Bottom-right = the market pays for
// value not yet in the box score (youth, injury return, or SF-QB scarcity).
async function renderTriangulation(leagueId) {
  const rows = await api(`/leagues/${leagueId}/value`);
  const panel = document.getElementById('triPanel');
  if (!rows.length) { panel.style.display = 'none'; return; }  // VBD layer not built yet
  panel.style.display = 'block';
  wireTape(rows);

  // FC on x (settings-aware market). Players without an FC value are
  // excluded and COUNTED — shown, never silently dropped or FP-substituted
  // (mixing currencies on one axis would be fabrication by interpolation).
  const plotRows = rows.filter((d) => d.fc_market_value != null);
  const nNoFc = rows.length - plotRows.length;
  const colors = { QB: '#3d80f5', RB: '#3ecf74', WR: '#e8a838', TE: '#b47cf5' };
  const maxv = Math.max(1, ...plotRows.map((d) => Math.max(d.fc_market_value || 0, d.vbd_value || 0)));
  const traces = ['QB', 'RB', 'WR', 'TE'].map((pos) => {
    const pr = plotRows.filter((d) => d.position === pos);
    return {
      type: 'scatter', mode: 'markers', name: pos,
      x: pr.map((d) => d.fc_market_value),
      y: pr.map((d) => d.vbd_value),
      text: pr.map((d) => `${d.player_name}${d.years_exp === 0 ? ' (R)' : ''}<br>${Number(d.ppg).toFixed(1)} ppg · VORP ${Number(d.vorp).toFixed(1)}`),
      marker: {
        color: colors[pos], size: 9, opacity: 0.82,
        symbol: pr.map((d) => (d.years_exp === 0 ? 'diamond-open' : 'circle')),
        line: { color: '#161b22', width: 1 },
      },
      hovertemplate: '%{text}<br>FC %{x:,.0f} · VBD %{y:,.0f}<extra>' + pos + '</extra>',
    };
  });
  traces.push({
    type: 'scatter', mode: 'lines', x: [0, maxv], y: [0, maxv],
    line: { color: '#2a3340', width: 1, dash: 'dot' }, hoverinfo: 'skip', showlegend: false,
  });

  Plotly.react('triChart', traces, {
    margin: { l: 66, r: 20, t: 10, b: 52 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: INK },
    xaxis: { title: 'Dynasty value — FantasyCalc (settings-aware)', gridcolor: GRID, zeroline: false },
    yaxis: { title: 'Win-now value — VBD (pts over replacement)', gridcolor: GRID, zeroline: false },
    legend: { orientation: 'h', y: 1.1 },
    annotations: [
      { x: maxv * 0.04, y: maxv * 0.96, xanchor: 'left', showarrow: false,
        text: 'produces now · market discounts (sell-high)', font: { size: 10, color: '#8a95a8' } },
      { x: maxv * 0.96, y: maxv * 0.05, xanchor: 'right', showarrow: false,
        text: 'market pays ahead of production (youth / injury / SF-QB)', font: { size: 10, color: '#8a95a8' } },
      ...(nNoFc > 0 ? [{ x: maxv * 0.96, y: maxv * 0.0, xanchor: 'right', yanchor: 'top', showarrow: false,
        text: `${nNoFc} player${nNoFc === 1 ? '' : 's'} without an FC value not shown · ◇ = rookie`, font: { size: 9, color: '#3d4756' } }]
        : [{ x: maxv * 0.96, y: maxv * 0.0, xanchor: 'right', yanchor: 'top', showarrow: false,
        text: '◇ = rookie', font: { size: 9, color: '#3d4756' } }]),
    ],
  }, { displayModeBar: false, responsive: true });
}

async function drillRoster(rosterId) {
  const meta = currentRows.find((r) => r.roster_id === rosterId) || {};
  const assets = await api(`/leagues/${currentLeague}/rosters/${rosterId}`);
  const valued = assets.filter((a) => a.fp_market_value != null);
  rosterKpis(meta);

  // Value-weighted age — a dynasty-specific read on how "old" a team's VALUE is.
  const wsum = valued.reduce((s, a) => s + (a.age ? a.fp_market_value : 0), 0);
  const wAge = wsum ? valued.reduce((s, a) => s + (a.age || 0) * a.fp_market_value, 0) / wsum : null;

  document.getElementById('rosterPanel').style.display = 'block';
  document.getElementById('rosterTitle').textContent =
    `${meta.owner_name || 'Roster ' + rosterId} — Roster Detail`;

  document.getElementById('rosterSummary').innerHTML = `
    <div class="stat">Total value<b>${fmt(meta.team_value)}</b></div>
    <div class="stat">League rank<b>#${meta.value_rank}</b></div>
    <div class="stat">HHI concentration<b>${Number(meta.hhi).toFixed(3)}</b></div>
    <div class="stat">Assets valued<b>${valued.length}</b></div>
    <div class="stat">Value-weighted age<b>${wAge ? wAge.toFixed(1) : '–'}</b></div>
    <div class="stat">Value share<b>${pctShare(meta.team_value, valueTotal)}</b></div>
    <div class="stat">Prod. share (realized)<b>${prodByRoster ? pctShare(prodByRoster[rosterId], prodTotal) : '–'}</b></div>
    <div class="stat" title="m1 projection — at preseason as-ofs statistically ≈ the ECR baseline (see Model Lab); its validated edge is in-season">Prod. share (projected)<b>${projByRoster ? pctShare(projByRoster[rosterId], projTotal) : '–'}</b></div>`;

  // Positional value allocation (donut).
  const byPos = {};
  valued.forEach((a) => { byPos[a.position] = (byPos[a.position] || 0) + a.fp_market_value; });
  Plotly.react('posChart', [{
    type: 'pie', hole: 0.55,
    labels: Object.keys(byPos), values: Object.values(byPos),
    marker: { colors: Object.keys(byPos).map((p) => POS_COLOR[p] || '#8a95a8'),
              line: { color: '#161b22', width: 2 } },
    textinfo: 'label+percent',
  }], {
    margin: { l: 10, r: 10, t: 10, b: 10 }, showlegend: false,
    paper_bgcolor: 'transparent', font: { color: INK },
    annotations: [{ text: 'value<br>by pos', showarrow: false, font: { size: 12, color: '#8a95a8' } }],
  }, { displayModeBar: false, responsive: true });

  // Asset table.
  const arb = (d) => d == null ? '–'
    : `<span class="${d > 0 ? 'pos-good' : 'pos-bad'}">${d > 0 ? '+' : ''}${fmt(Math.round(d))}</span>`;
  document.getElementById('rosterTable').innerHTML = `
    <table><thead><tr>
      <th>Player</th><th>Pos</th><th class="num">Age</th><th>Team</th>
      <th class="num">FP value</th><th class="num">FC value</th>
      <th class="num">VBD</th><th class="num">PPG</th>
      <th class="num">Arb Δ</th><th class="num">30d</th>
    </tr></thead><tbody>
      ${assets.map((a) => `<tr>
        <td>${a.player_name || '–'}</td>
        <td><span class="pos pos-${a.position || ''}">${a.position || '?'}</span>${a.years_exp === 0 ? ' <span class="pos" title="rookie — no NFL production history; projections are dashes by design" style="background:rgba(232,168,56,.18);color:var(--wr)">R</span>' : ''}</td>
        <td class="num">${a.age ?? '–'}</td>
        <td>${a.nfl_team || '–'}</td>
        <td class="num">${fmt(a.fp_market_value)}</td>
        <td class="num">${fmt(a.fc_market_value)}</td>
        <td class="num">${fmt(a.vbd_value)}</td>
        <td class="num">${a.ppg != null ? Number(a.ppg).toFixed(1) : '–'}</td>
        <td class="num">${arb(a.arb_delta_fp_minus_fc)}</td>
        <td class="num">${a.fc_trend_30day != null ? fmt(Math.round(a.fc_trend_30day)) : '–'}</td>
      </tr>`).join('')}
    </tbody></table>`;

  document.getElementById('rosterPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

init();
