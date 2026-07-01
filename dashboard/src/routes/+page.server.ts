import { query } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, parent }) => {
  const { leagues } = await parent();
  const leagueId = url.searchParams.get('league') || (leagues[0] as any)?.league_id;

  if (!leagueId) return { leagueId: null, diagnostics: [], production: [] };

  const [diagnostics, production, projected] = await Promise.all([
    query(`
      WITH rp AS (
        SELECT league_id, roster_id, fp_market_value AS v
        FROM v_player_market
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM v_player_market)
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
    `, [leagueId, leagueId]).catch(() => [])
  ]);

  return { leagueId, diagnostics, production, projected };
};
