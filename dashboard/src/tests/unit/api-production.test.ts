import { describe, it, expect, vi } from 'vitest';

const mockQuery = vi.fn();
vi.mock('$lib/server/db', () => ({ query: mockQuery }));

describe('GET /api/leagues/[id]/production', () => {
  it('returns pooled production by roster', async () => {
    mockQuery.mockResolvedValue([
      { roster_id: 1, production_vbd: 14000, team_value: 30000 },
      { roster_id: 2, production_vbd: 8000, team_value: 20000 },
    ]);

    const { GET } = await import('../../routes/api/leagues/[id]/production/+server');
    const response = await (GET as any)({
      params: { id: 'league-1' },
      url: new URL('http://localhost/api/leagues/league-1/production')
    });
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('roster_id');
    expect(data[0]).toHaveProperty('production_vbd');
    expect(data[0]).toHaveProperty('team_value');
  });

  it('returns positional breakdown with ?by=position', async () => {
    mockQuery.mockResolvedValue([
      { roster_id: 1, position: 'QB', production_vbd: 5000, team_value: 10000 },
      { roster_id: 1, position: 'RB', production_vbd: 9000, team_value: 20000 },
    ]);

    const { GET } = await import('../../routes/api/leagues/[id]/production/+server');
    const response = await (GET as any)({
      params: { id: 'league-1' },
      url: new URL('http://localhost/api/leagues/league-1/production?by=position')
    });
    const data = await response.json();

    expect(data[0]).toHaveProperty('position');
  });

  it('returns projected basis with ?basis=projected', async () => {
    mockQuery.mockResolvedValue([
      { roster_id: 1, production_vbd: 12000, as_of_date: '2026-06-29', model_id: 'm1' },
    ]);

    const { GET } = await import('../../routes/api/leagues/[id]/production/+server');
    const response = await (GET as any)({
      params: { id: 'league-1' },
      url: new URL('http://localhost/api/leagues/league-1/production?basis=projected')
    });
    const data = await response.json();

    expect(data[0]).toHaveProperty('production_vbd');
    expect(data[0]).toHaveProperty('model_id');
  });
});
