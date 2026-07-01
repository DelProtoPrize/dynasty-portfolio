import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const rows = await query(`
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
  `, [params.id]);
  return json(rows);
};
