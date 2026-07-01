import { query } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, parent }) => {
  const { leagues } = await parent();
  const leagueId = url.searchParams.get('league') || (leagues[0] as any)?.league_id;

  const isPortfolio = leagueId === '__portfolio__';
  if (!leagueId) return { leagueId: null, diagnostics: [], production: [] };
  if (isPortfolio) {
    // Return minimal for portfolio mode (data is loaded client-side)
    return { leagueId, diagnostics: [], production: [], projected: [], construction: [], valueHistory: [], rosterDeltas: [], deltaDates: null };
  }

  const [diagnostics, production, projected, construction, valueHistoryRaw, fcDeltasRaw, prevHhiRaw] = await Promise.all([
    query(`
      WITH rp AS (
        SELECT league_id, roster_id, fp_market_value AS v
        FROM v_roster_assets
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM v_roster_assets)
          AND league_id = ?
          AND fp_market_value IS NOT NULL
      ),
      rt AS (
        SELECT league_id, roster_id, SUM(v) AS team_value, COUNT(*) AS n_assets
        FROM rp GROUP BY league_id, roster_id
      ),
      hhi AS (
        SELECT rp.league_id, rp.roster_id,
               SUM( (1.0 * rp.v / rt.team_value) * (1.0 * rp.v / rt.team_value) ) AS hhi
        FROM rp JOIN rt ON rt.league_id = rp.league_id AND rt.roster_id = rp.roster_id
        GROUP BY rp.league_id, rp.roster_id
      )
      SELECT m.owner_name,
             rt.roster_id,
             rt.team_value,
             rt.n_assets,
             PERCENT_RANK() OVER (PARTITION BY rt.league_id ORDER BY rt.team_value) AS value_percentile,
             RANK()         OVER (PARTITION BY rt.league_id ORDER BY rt.team_value DESC) AS value_rank,
             h.hhi
      FROM rt
      JOIN hhi h ON h.league_id = rt.league_id AND h.roster_id = rt.roster_id
      LEFT JOIN dim_managers m ON m.league_id = rt.league_id AND m.roster_id = rt.roster_id
      ORDER BY value_rank
    `, [leagueId]),
    query(`
      SELECT v.roster_id,
             SUM(v.vbd_value) AS production_vbd,
             SUM(v.fp_market_value) AS team_value
      FROM v_player_value v
      WHERE v.league_id = ?
        AND v.snapshot_date = (
          SELECT MAX(snapshot_date) FROM v_player_value WHERE league_id = ?
        )
      GROUP BY v.roster_id
      ORDER BY v.roster_id
    `, [leagueId, leagueId]).catch(() => []),
    query(`
      SELECT p.roster_id,
             SUM(p.vbd_proj) AS production_vbd
      FROM player_projected_value p
      WHERE p.league_id = ?
        AND p.as_of_date = (
          SELECT MAX(as_of_date) FROM player_projected_value WHERE league_id = ?
        )
      GROUP BY p.roster_id
      ORDER BY p.roster_id
    `, [leagueId, leagueId]).catch(() => []),
    query(`
      SELECT c.roster_id, c.osl_points, c.surplus_count, c.surplus_vorp, c.surplus_points,
             c.slots_filled, c.skipped_slots, c.points_basis
      FROM roster_construction c
      WHERE c.league_id = ?
        AND c.snapshot_date = (
          SELECT MAX(snapshot_date) FROM roster_construction WHERE league_id = ?
        )
      ORDER BY c.osl_points DESC
    `, [leagueId, leagueId]).catch(() => []),
    // ── MOVEMENT METRICS ARE COMPUTED ON FC ONLY (locked methodology) ──────
    // FP is a deterministic exponential of ECR ordinal ranks, so FP deltas are
    // artifacts of rank-curve position, not market repricing — the same reason
    // the roster table uses fc_trend_30day. Levels stay FP (house currency);
    // movement is FC (settings-aware). Players without an FC value are
    // excluded from movement sums, never FP-substituted.
    //
    // valueHistory: league FC total over recent snapshot dates (sparkline).
    query(`
      WITH recent AS (
        SELECT snapshot_date FROM v_player_market
        WHERE league_id = ? AND fc_market_value IS NOT NULL
        GROUP BY snapshot_date
        ORDER BY snapshot_date DESC LIMIT 6
      )
      SELECT snapshot_date, SUM(fc_market_value) AS total_value
      FROM v_player_market
      WHERE league_id = ? AND fc_market_value IS NOT NULL
        AND snapshot_date IN (SELECT snapshot_date FROM recent)
      GROUP BY snapshot_date ORDER BY snapshot_date
    `, [leagueId, leagueId]).catch(() => []),
    // Per-roster FC movement between the two most recent snapshot dates.
    // The dates travel with the rows so the UI can label the delta with the
    // actual comparison window instead of implying a live feed.
    query(`
      WITH dates AS (
        SELECT snapshot_date FROM v_player_market
        WHERE league_id = ? AND fc_market_value IS NOT NULL
        GROUP BY snapshot_date
        ORDER BY snapshot_date DESC LIMIT 2
      ),
      prev AS (
        SELECT roster_id, SUM(fc_market_value) AS prev_team_value
        FROM v_player_market WHERE league_id = ? AND fc_market_value IS NOT NULL
          AND snapshot_date = (SELECT MIN(snapshot_date) FROM dates) GROUP BY roster_id
      ),
      curr AS (
        SELECT roster_id, SUM(fc_market_value) AS curr_team_value
        FROM v_player_market WHERE league_id = ? AND fc_market_value IS NOT NULL
          AND snapshot_date = (SELECT MAX(snapshot_date) FROM dates) GROUP BY roster_id
      )
      SELECT c.roster_id, c.curr_team_value, p.prev_team_value,
             (SELECT MIN(snapshot_date) FROM dates) AS prev_snapshot_date,
             (SELECT MAX(snapshot_date) FROM dates) AS curr_snapshot_date,
             CASE WHEN p.prev_team_value > 0
                  THEN (c.curr_team_value - p.prev_team_value) * 100.0 / p.prev_team_value
                  ELSE NULL END AS value_delta_pct
      FROM curr c LEFT JOIN prev p ON p.roster_id = c.roster_id
    `, [leagueId, leagueId, leagueId]).catch(() => []),
    // Previous within-team ASSET HHI, computed with the SAME definition and
    // currency as diagnostics.hhi (FP incl. picks, v_roster_assets) at the
    // previous snapshot date. The prior implementation compared the current
    // median within-team asset HHI against a median of squared team-shares of
    // league value — two different quantities; that delta was meaningless.
    query(`
      WITH dates AS (
        SELECT snapshot_date FROM v_roster_assets
        WHERE league_id = ? AND fp_market_value IS NOT NULL
        GROUP BY snapshot_date
        ORDER BY snapshot_date DESC LIMIT 2
      ),
      rp AS (
        SELECT roster_id, fp_market_value AS v
        FROM v_roster_assets
        WHERE league_id = ? AND fp_market_value IS NOT NULL
          AND snapshot_date = (SELECT MIN(snapshot_date) FROM dates)
      ),
      rt AS (SELECT roster_id, SUM(v) AS tv FROM rp GROUP BY roster_id)
      SELECT rp.roster_id,
             SUM( (1.0 * rp.v / rt.tv) * (1.0 * rp.v / rt.tv) ) AS prev_hhi,
             (SELECT MIN(snapshot_date) FROM dates) AS prev_snapshot_date,
             (SELECT MAX(snapshot_date) FROM dates) AS curr_snapshot_date
      FROM rp JOIN rt ON rt.roster_id = rp.roster_id
      GROUP BY rp.roster_id
    `, [leagueId, leagueId]).catch(() => [])
  ]);

  // HONEST-HISTORY GUARD: with a single snapshot in the warehouse, MIN(dates)
  // = MAX(dates) and every "delta" degenerates to a 0.0% that reads as real
  // stability. No history -> no deltas (dashes downstream, never fabrication).
  const fcTwoDates = (fcDeltasRaw as any[]).length > 0 &&
    (fcDeltasRaw as any[])[0].prev_snapshot_date !== (fcDeltasRaw as any[])[0].curr_snapshot_date;
  const hhiTwoDates = (prevHhiRaw as any[]).length > 0 &&
    (prevHhiRaw as any[])[0].prev_snapshot_date !== (prevHhiRaw as any[])[0].curr_snapshot_date;
  const prevHhiBy = hhiTwoDates
    ? Object.fromEntries((prevHhiRaw as any[]).map((h: any) => [h.roster_id, h.prev_hhi]))
    : {};
  const rosterDeltas = fcTwoDates
    ? (fcDeltasRaw as any[]).map((d: any) => ({ ...d, prev_hhi: prevHhiBy[d.roster_id] ?? null }))
    : [];
  const deltaDates = fcTwoDates
    ? { prev: (fcDeltasRaw as any[])[0].prev_snapshot_date, curr: (fcDeltasRaw as any[])[0].curr_snapshot_date }
    : null;
  const valueHistory = ((valueHistoryRaw as any[]) || []).length > 1 ? valueHistoryRaw : [];

  return {
    leagueId,
    diagnostics,
    production,
    projected,
    construction,
    valueHistory,
    rosterDeltas,
    deltaDates
  };
};
