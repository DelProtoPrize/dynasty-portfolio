import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const { id: leagueId, rosterId } = params;
  const rows = await query(
    `SELECT s.player_id, s.player_name, s.position, s.points, s.vorp
     FROM roster_surplus s
     WHERE s.league_id = ? AND s.roster_id = ?
       AND s.snapshot_date = (
         SELECT MAX(snapshot_date) FROM roster_surplus WHERE league_id = ?
       )
     ORDER BY s.vorp DESC`,
    [leagueId, rosterId, leagueId]
  );
  return json(rows);
};
