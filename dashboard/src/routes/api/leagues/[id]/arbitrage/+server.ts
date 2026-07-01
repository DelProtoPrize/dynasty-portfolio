import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const rows = await query(`
    SELECT player_name, position, fp_market_value, fc_market_value,
           arb_delta_fp_minus_fc
    FROM v_player_market
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM v_player_market)
      AND league_id = ?
      AND fp_market_value IS NOT NULL AND fc_market_value IS NOT NULL
    ORDER BY ABS(arb_delta_fp_minus_fc) DESC
    LIMIT 25
  `, [params.id]);
  return json(rows);
};
