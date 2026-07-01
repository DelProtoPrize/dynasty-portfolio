import { describe, it, expect, vi } from 'vitest';

const mockQuery = vi.fn();
vi.mock('$lib/server/db', () => ({ query: mockQuery }));

describe('GET /api/leagues/[id]/rosters/[rosterId]', () => {
  it('returns enriched roster data', async () => {
    mockQuery.mockResolvedValue([
      { player_name: 'CeeDee Lamb', position: 'WR', age: 25, nfl_team: 'DAL',
        fp_market_value: 9162, fc_market_value: 6695, fp_ecr_2qb: 5,
        fc_trend_30day: 200, arb_delta_fp_minus_fc: 2467, ppg: 20.1, vbd_value: 5500 }
    ]);

    const { GET } = await import('../../routes/api/leagues/[id]/rosters/[rosterId]/+server');
    const response = await (GET as any)({ params: { id: 'league-1', rosterId: '1' } });
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('player_name', 'CeeDee Lamb');
    expect(data[0]).toHaveProperty('fp_market_value');
    expect(data[0]).toHaveProperty('fc_market_value');
    expect(data[0]).toHaveProperty('arb_delta_fp_minus_fc');
    expect(data[0]).toHaveProperty('fc_trend_30day');
    expect(data[0]).toHaveProperty('ppg');
    expect(data[0]).toHaveProperty('vbd_value');
  });

  it('falls back to base query when production table missing', async () => {
    const error = new Error('no such table: player_production_value');
    mockQuery
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce([
        { player_name: 'CeeDee Lamb', position: 'WR', age: 25, nfl_team: 'DAL',
          fp_market_value: 9162, fc_market_value: 6695, fp_ecr_2qb: 5,
          fc_trend_30day: 200, arb_delta_fp_minus_fc: 2467 }
      ]);

    const { GET } = await import('../../routes/api/leagues/[id]/rosters/[rosterId]/+server');
    const response = await (GET as any)({ params: { id: 'league-1', rosterId: '1' } });
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('player_name', 'CeeDee Lamb');
  });
});
