import { describe, it, expect, vi } from 'vitest';

const mockQuery = vi.fn();
vi.mock('$lib/server/db', () => ({ query: mockQuery }));

describe('GET /api/leagues/[id]/value', () => {
  it('returns player value rows with expected shape', async () => {
    mockQuery.mockResolvedValue([
      { player_id: '123', player_name: 'Ja\'Marr Chase', position: 'WR', roster_id: 1,
        fp_market_value: 9184, fc_market_value: 10013, vbd_value: 6762,
        ppg: 22.4, vorp: 6762, years_exp: 4 },
      { player_id: '456', player_name: 'Bijan Robinson', position: 'RB', roster_id: 2,
        fp_market_value: 9500, fc_market_value: 11000, vbd_value: 8000,
        ppg: 19.5, vorp: 8000, years_exp: 2 }
    ]);

    const { GET } = await import('../../routes/api/leagues/[id]/value/+server');
    const response = await (GET as any)({ params: { id: 'test-league' } });
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty('player_name');
    expect(data[0]).toHaveProperty('fp_market_value');
    expect(data[0]).toHaveProperty('fc_market_value');
    expect(data[0]).toHaveProperty('vbd_value');
    expect(data[0]).toHaveProperty('ppg');
    expect(data[0]).toHaveProperty('years_exp');
  });
});
