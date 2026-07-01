import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
  const lid = params.id;
  const basis = url.searchParams.get('basis') === 'projected' ? 'projected' : 'realized';

  const league = await query(
    `SELECT position, replacement_bar, bar_currency, hhi, elite_total,
            top_roster_id, top_share, n_unprojected
     FROM positional_cornering_league
     WHERE league_id = ? AND basis = ?
       AND as_of_date = (SELECT MAX(as_of_date) FROM positional_cornering_league
                         WHERE league_id = ? AND basis = ?)
     ORDER BY position`,
    [lid, basis, lid, basis]
  );

  const rosters = await query(
    `SELECT position, roster_id, vona, vona_share, elite_count
     FROM positional_cornering
     WHERE league_id = ? AND basis = ?
       AND as_of_date = (SELECT MAX(as_of_date) FROM positional_cornering
                         WHERE league_id = ? AND basis = ?)
     ORDER BY position, vona_share DESC`,
    [lid, basis, lid, basis]
  );

  return json({ basis, league, rosters });
};
