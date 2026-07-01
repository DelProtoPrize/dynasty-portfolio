import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import RosterDetail from '../../lib/components/RosterDetail.svelte';

const mockMeta = {
  roster_id: 11,
  owner_name: 'Team Full of Scrubs',
  team_value: 46460,
  value_rank: 1,
  hhi: 0.113,
  n_assets: 24,
};

const mockDiagnostics = [
  { roster_id: 11, owner_name: 'Team Full of Scrubs', team_value: 46460, value_rank: 1, hhi: 0.113 },
  { roster_id: 2, owner_name: 'ALL STARS INC', team_value: 38423, value_rank: 2, hhi: 0.087 },
];

const mockProduction = [
  { roster_id: 11, production_vbd: 14000 },
  { roster_id: 2, production_vbd: 8000 },
];

const mockProjected = [
  { roster_id: 11, production_vbd: 13000 },
  { roster_id: 2, production_vbd: 9000 },
];

const mockAssets = [
  { player_name: 'CeeDee Lamb', position: 'WR', age: 25, nfl_team: 'DAL',
    fp_market_value: 9162, fc_market_value: 6695, vbd_value: 5500, ppg: 20.1,
    arb_delta_fp_minus_fc: 2467, fc_trend_30day: 200 },
  { player_name: 'Jahmyr Gibbs', position: 'RB', age: 22, nfl_team: 'DET',
    fp_market_value: 9013, fc_market_value: 10694, vbd_value: 8000, ppg: 18.5,
    arb_delta_fp_minus_fc: -1681, fc_trend_30day: -50 },
  { player_name: 'Rookie Guy', position: 'WR', age: 21, nfl_team: 'NYG',
    fp_market_value: null, fc_market_value: null, vbd_value: null, ppg: null,
    arb_delta_fp_minus_fc: null, fc_trend_30day: null },
];

describe('RosterDetail', () => {
  it('renders team name in heading', () => {
    const { getByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    expect(getByText(/Team Full of Scrubs/)).toBeTruthy();
  });

  it('shows total value stat', () => {
    const { getByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    expect(getByText('46,460')).toBeTruthy();
  });

  it('shows league rank', () => {
    const { getByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    expect(getByText('#1')).toBeTruthy();
  });

  it('shows HHI value', () => {
    const { getByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    expect(getByText('0.113')).toBeTruthy();
  });

  it('shows value share', () => {
    const { getByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    // 46460 / (46460 + 38423) = 54.7%
    expect(getByText('54.7%')).toBeTruthy();
  });

  it('shows realized production share', () => {
    const { getByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    // 14000 / (14000 + 8000) = 63.6%
    expect(getByText('63.6%')).toBeTruthy();
    expect(getByText('Prod. share (realized)')).toBeTruthy();
  });

  it('shows projected production share', () => {
    const { getByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    // 13000 / (13000 + 9000) = 59.1%
    expect(getByText('59.1%')).toBeTruthy();
    expect(getByText('Prod. share (projected)')).toBeTruthy();
  });

  it('shows dash for projected share when no projected data', () => {
    const { getAllByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: []
    }});
    // Should have a dash somewhere for projected
    expect(getAllByText('–').length).toBeGreaterThan(0);
  });

  it('renders all player rows', () => {
    const { getByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    expect(getByText('CeeDee Lamb')).toBeTruthy();
    expect(getByText('Jahmyr Gibbs')).toBeTruthy();
    expect(getByText('Rookie Guy')).toBeTruthy();
  });

  it('renders arb delta with correct sign', () => {
    const { getByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    expect(getByText('+2,467')).toBeTruthy();
    expect(getByText('-1,681')).toBeTruthy();
  });

  it('renders 30d trend', () => {
    const { getByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    expect(getByText('200')).toBeTruthy();
    expect(getByText('-50')).toBeTruthy();
  });

  it('handles null values gracefully', () => {
    const { getAllByText } = render(RosterDetail, { props: {
      rosterId: 11, assets: mockAssets, meta: mockMeta,
      diagnostics: mockDiagnostics, production: mockProduction, projected: mockProjected
    }});
    // Rookie Guy has all nulls — should render dashes
    expect(getAllByText('–').length).toBeGreaterThan(0);
  });
});
