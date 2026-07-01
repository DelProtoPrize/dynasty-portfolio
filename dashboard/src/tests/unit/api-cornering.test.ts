import { describe, it, expect, vi } from 'vitest';

const mockQuery = vi.fn();
vi.mock('$lib/server/db', () => ({ query: mockQuery }));

describe('GET /api/leagues/[id]/cornering', () => {
  it('returns { basis, league, rosters } shape', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { position: 'QB', replacement_bar: 13.7, bar_currency: 'Drew', hhi: 0.158,
          elite_total: 13, top_roster_id: 5, top_share: 0.254, n_unprojected: 0 }
      ])
      .mockResolvedValueOnce([
        { position: 'QB', roster_id: 5, vona: 3400, vona_share: 0.254, elite_count: 2 },
        { position: 'QB', roster_id: 7, vona: 2600, vona_share: 0.192, elite_count: 2 },
      ]);

    const { GET } = await import('../../routes/api/leagues/[id]/cornering/+server');
    const response = await (GET as any)({
      params: { id: 'league-1' },
      url: new URL('http://localhost/api/leagues/league-1/cornering')
    });
    const data = await response.json();

    expect(data).toHaveProperty('basis', 'realized');
    expect(data).toHaveProperty('league');
    expect(data).toHaveProperty('rosters');
    expect(Array.isArray(data.league)).toBe(true);
    expect(Array.isArray(data.rosters)).toBe(true);
    expect(data.league[0]).toHaveProperty('position');
    expect(data.league[0]).toHaveProperty('hhi');
    expect(data.rosters[0]).toHaveProperty('vona_share');
  });

  it('accepts ?basis=projected', async () => {
    mockQuery.mockResolvedValue([]);

    const { GET } = await import('../../routes/api/leagues/[id]/cornering/+server');
    const response = await (GET as any)({
      params: { id: 'league-1' },
      url: new URL('http://localhost/api/leagues/league-1/cornering?basis=projected')
    });
    const data = await response.json();

    expect(data.basis).toBe('projected');
  });
});
