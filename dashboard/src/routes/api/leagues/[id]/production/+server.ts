import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
  const lid = params.id;

  if (url.searchParams.get('basis') === 'projected') {
    const rows = await query(
      `SELECT p.roster_id,
              SUM(p.vbd_proj) AS production_vbd,
              MAX(p.as_of_date) AS as_of_date,
              MAX(p.model_id)  AS model_id
       FROM player_projected_value p
       WHERE p.league_id = ?
         AND p.as_of_date = (
           SELECT MAX(as_of_date) FROM player_projected_value WHERE league_id = ?
         )
       GROUP BY p.roster_id
       ORDER BY p.roster_id`,
      [lid, lid]
    );
    return json(rows);
  }

  const byPos = url.searchParams.get('by') === 'position';
  const rows = await query(
    `SELECT v.roster_id${byPos ? ', v.position' : ''},
            SUM(v.vbd_value)       AS production_vbd,
            SUM(v.fp_market_value) AS team_value
     FROM v_player_value v
     WHERE v.league_id = ?
       AND v.snapshot_date = (
         SELECT MAX(snapshot_date) FROM v_player_value WHERE league_id = ?
       )
     GROUP BY v.roster_id${byPos ? ', v.position' : ''}
     ORDER BY v.roster_id`,
    [lid, lid]
  );
  return json(rows);
};
