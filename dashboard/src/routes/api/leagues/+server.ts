import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';

export async function GET() {
  const rows = await query(`
    SELECT league_id, league_name, season, number_of_teams,
           is_superflex, te_premium_value
    FROM dim_leagues
    ORDER BY league_name, season DESC
  `);
  return json(rows);
}
