import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

const MISSING_REL = /no such (table|view)|does not exist|relation .* does not exist/i;

export const GET: RequestHandler = async ({ params }) => {
  const p = [params.id, Number(params.rosterId)];

  const enriched = `
    SELECT m.player_name, m.position, m.age, m.nfl_team,
           m.fp_market_value, m.fc_market_value, m.fp_ecr_2qb, m.fc_trend_30day,
           m.arb_delta_fp_minus_fc, pv.ppg, pv.vbd_value
    FROM v_player_market m
    LEFT JOIN player_production_value pv
      ON pv.league_id = m.league_id AND pv.player_id = m.player_id
     AND pv.season = (SELECT MAX(season) FROM player_production_value)
    WHERE m.snapshot_date = (SELECT MAX(snapshot_date) FROM v_player_market)
      AND m.league_id = ? AND m.roster_id = ?
    ORDER BY (m.fp_market_value IS NULL), m.fp_market_value DESC`;

  const base = `
    SELECT player_name, position, age, nfl_team,
           fp_market_value, fc_market_value, fp_ecr_2qb, fc_trend_30day,
           arb_delta_fp_minus_fc
    FROM v_player_market
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM v_player_market)
      AND league_id = ? AND roster_id = ?
    ORDER BY (fp_market_value IS NULL), fp_market_value DESC`;

  try {
    return json(await query(enriched, p));
  } catch (e: unknown) {
    if (e instanceof Error && MISSING_REL.test(e.message)) {
      return json(await query(base, p));
    }
    throw e;
  }
};
