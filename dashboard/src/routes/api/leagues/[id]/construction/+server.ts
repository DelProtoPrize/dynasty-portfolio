import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const lid = params.id;
  const rows = await query(
    `SELECT c.roster_id, c.osl_points, c.slots_filled, c.slots_empty,
            c.skipped_slots, c.surplus_count, c.surplus_vorp, c.surplus_points,
            c.hungarian_gain, c.points_basis
     FROM roster_construction c
     WHERE c.league_id = ?
       AND c.snapshot_date = (
         SELECT MAX(snapshot_date) FROM roster_construction WHERE league_id = ?
       )
     ORDER BY c.osl_points DESC`,
    [lid, lid]
  );
  return json(rows);
};
