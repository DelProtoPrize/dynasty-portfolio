// app.js — fetch from our own API and render. The browser never touches Sleeper
// or any external source; it only reads pre-computed analytics from our backend.
const api = (path) => fetch(`/api${path}`).then((r) => r.json());

const leagueSel = document.getElementById('league');

async function init() {
  const leagues = await api('/leagues');
  leagueSel.innerHTML = leagues
    .map((l) => `<option value="${l.league_id}">${l.league_name}${l.is_superflex ? ' · SF' : ''}</option>`)
    .join('');
  leagueSel.addEventListener('change', () => render(leagueSel.value));
  if (leagues.length) render(leagues[0].league_id);
}

async function render(leagueId) {
  const rows = await api(`/leagues/${leagueId}/diagnostics`);

  // Horizontal bar of team value, colored by HHI concentration (red = top-heavy).
  Plotly.react('valueChart', [{
    type: 'bar',
    orientation: 'h',
    x: rows.map((d) => d.team_value).reverse(),
    y: rows.map((d) => d.owner_name || `Roster ${d.roster_id}`).reverse(),
    marker: { color: rows.map((d) => d.hhi).reverse(), colorscale: 'YlOrRd', showscale: true,
              colorbar: { title: 'HHI' } },
    hovertemplate: '%{y}<br>value %{x:,.0f}<extra></extra>',
  }], {
    margin: { l: 170, r: 40, t: 10, b: 40 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: '#e8eef5' }, xaxis: { gridcolor: '#232a33' },
  }, { displayModeBar: false, responsive: true });

  // Diagnostics table
  const fmt = (n) => Number(n).toLocaleString();
  document.getElementById('diagTable').innerHTML = `
    <table><thead><tr>
      <th>Rank</th><th>Team</th><th class="num">Value</th>
      <th class="num">Assets</th><th class="num">Pctile</th><th class="num">HHI</th>
    </tr></thead><tbody>
      ${rows.map((d) => `<tr>
        <td>${d.value_rank}</td>
        <td>${d.owner_name || 'Roster ' + d.roster_id}</td>
        <td class="num">${fmt(d.team_value)}</td>
        <td class="num">${d.n_assets}</td>
        <td class="num">${(d.value_percentile * 100).toFixed(0)}%</td>
        <td class="num">${Number(d.hhi).toFixed(3)}</td>
      </tr>`).join('')}
    </tbody></table>`;
}

init();
