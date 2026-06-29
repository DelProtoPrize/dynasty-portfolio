import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const lid = params.id;
  const rows = await query(
    `SELECT v.player_id, v.player_name, v.position, v.roster_id,
            v.fp_market_value, v.fc_market_value, v.vbd_value,
            v.ppg, v.vorp,
            d.years_exp
     FROM v_player_value v
     LEFT JOIN dim_players d ON d.player_id = v.player_id
     WHERE v.league_id = ?
       AND v.snapshot_date = (
         SELECT MAX(snapshot_date) FROM v_player_value WHERE league_id = ?
       )`,
    [lid, lid]
  );
  return json(rows);
};
