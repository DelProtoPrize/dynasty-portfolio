import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
  query: vi.fn().mockResolvedValue([
    { league_id: 'abc123', league_name: 'Test League', season: '2026',
      number_of_teams: 14, is_superflex: 1, te_premium_value: 0.5 },
    { league_id: 'def456', league_name: 'Another League', season: '2025',
      number_of_teams: 12, is_superflex: 0, te_premium_value: 0 }
  ])
}));

describe('GET /api/leagues', () => {
  it('returns array of league objects with expected shape', async () => {
    const { GET } = await import('../../routes/api/leagues/+server');
    const response = await GET({} as any);
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty('league_id', 'abc123');
    expect(data[0]).toHaveProperty('league_name', 'Test League');
    expect(data[0]).toHaveProperty('season', '2026');
    expect(data[0]).toHaveProperty('number_of_teams', 14);
    expect(data[0]).toHaveProperty('is_superflex', 1);
    expect(data[0]).toHaveProperty('te_premium_value', 0.5);
  });
});
