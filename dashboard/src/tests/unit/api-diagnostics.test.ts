import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
  query: vi.fn().mockResolvedValue([
    { owner_name: 'Team A', roster_id: 1, team_value: 46460, n_assets: 24,
      value_percentile: 1, value_rank: 1, hhi: 0.113 },
    { owner_name: 'Team B', roster_id: 2, team_value: 38423, n_assets: 21,
      value_percentile: 0.92, value_rank: 2, hhi: 0.087 }
  ])
}));

describe('GET /api/leagues/[id]/diagnostics', () => {
  it('returns array with team diagnostics', async () => {
    const { GET } = await import('../../routes/api/leagues/[id]/diagnostics/+server');
    const response = await (GET as any)({ params: { id: 'test-league' } });
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('owner_name');
    expect(data[0]).toHaveProperty('roster_id');
    expect(data[0]).toHaveProperty('team_value');
    expect(data[0]).toHaveProperty('hhi');
    expect(data[0]).toHaveProperty('value_rank');
  });
});
