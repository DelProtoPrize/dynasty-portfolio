import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import DiagnosticsTable from '../../lib/components/DiagnosticsTable.svelte';

const mockRows = [
  { roster_id: 11, owner_name: 'Team Full of Scrubs', team_value: 46460, n_assets: 24, value_percentile: 1, value_rank: 1, hhi: 0.113 },
  { roster_id: 2, owner_name: 'ALL STARS INC', team_value: 38423, n_assets: 21, value_percentile: 0.92, value_rank: 2, hhi: 0.087 },
  { roster_id: 3, owner_name: null, team_value: 37506, n_assets: 25, value_percentile: 0.85, value_rank: 3, hhi: 0.161 },
];

describe('DiagnosticsTable', () => {
  it('renders correct number of rows', () => {
    const { getAllByRole } = render(DiagnosticsTable, { props: { rows: mockRows, ondrill: () => {} } });
    const rows = getAllByRole('row');
    // 1 header + 3 data rows
    expect(rows.length).toBe(4);
  });

  it('displays team names', () => {
    const { getByText } = render(DiagnosticsTable, { props: { rows: mockRows, ondrill: () => {} } });
    expect(getByText('Team Full of Scrubs')).toBeTruthy();
    expect(getByText('ALL STARS INC')).toBeTruthy();
  });

  it('shows fallback name when owner_name is null', () => {
    const { getByText } = render(DiagnosticsTable, { props: { rows: mockRows, ondrill: () => {} } });
    expect(getByText('Roster 3')).toBeTruthy();
  });

  it('formats values with commas', () => {
    const { getByText } = render(DiagnosticsTable, { props: { rows: mockRows, ondrill: () => {} } });
    expect(getByText('46,460')).toBeTruthy();
    expect(getByText('38,423')).toBeTruthy();
  });

  it('shows percentile as percentage', () => {
    const { getByText } = render(DiagnosticsTable, { props: { rows: mockRows, ondrill: () => {} } });
    expect(getByText('100%')).toBeTruthy();
    expect(getByText('92%')).toBeTruthy();
  });

  it('shows HHI to 3 decimal places', () => {
    const { getByText } = render(DiagnosticsTable, { props: { rows: mockRows, ondrill: () => {} } });
    expect(getByText('0.113')).toBeTruthy();
    expect(getByText('0.087')).toBeTruthy();
  });

  it('calls ondrill with roster_id on row click', async () => {
    let drilled: number | null = null;
    const { getAllByRole } = render(DiagnosticsTable, {
      props: { rows: mockRows, ondrill: (id: number) => { drilled = id; } }
    });
    const dataRows = getAllByRole('row').slice(1); // skip header
    await dataRows[0].click();
    expect(drilled).toBe(11);
  });

  it('renders empty table with no rows', () => {
    const { getAllByRole } = render(DiagnosticsTable, { props: { rows: [], ondrill: () => {} } });
    // Just the header row
    expect(getAllByRole('row').length).toBe(1);
  });
});
