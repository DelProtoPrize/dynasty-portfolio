import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import KpiCard from '../../lib/components/KpiCard.svelte';

describe('KpiCard', () => {
  it('renders label', () => {
    const { getByText } = render(KpiCard, { props: {
      label: 'Portfolio Value', value: '435,453', tone: 'kpi-accent', tooltip: ''
    }});
    expect(getByText('Portfolio Value')).toBeTruthy();
  });

  it('renders value', () => {
    const { getByText } = render(KpiCard, { props: {
      label: 'HHI', value: '0.162', tone: 'kpi-warn', tooltip: ''
    }});
    expect(getByText('0.162')).toBeTruthy();
  });

  it('renders subtitle HTML', () => {
    const { container } = render(KpiCard, { props: {
      label: 'Value Share', value: '10.7%', tone: 'kpi-accent',
      sub: '<span class="delta-tag up">LEADER</span><span>Team Full of Scrubs</span>'
    }});
    expect(container.querySelector('.delta-tag')).toBeTruthy();
    expect(container.textContent).toContain('LEADER');
    expect(container.textContent).toContain('Team Full of Scrubs');
  });

  it('applies accent tone class', () => {
    const { container } = render(KpiCard, { props: {
      label: 'Test', value: '100', tone: 'kpi-accent'
    }});
    const card = container.querySelector('[class*="before:bg-accent"]');
    expect(card).toBeTruthy();
  });

  it('applies good tone class', () => {
    const { container } = render(KpiCard, { props: {
      label: 'Test', value: '100', tone: 'kpi-good'
    }});
    const card = container.querySelector('[class*="before:bg-good"]');
    expect(card).toBeTruthy();
  });

  it('applies bad tone class', () => {
    const { container } = render(KpiCard, { props: {
      label: 'Test', value: '100', tone: 'kpi-bad'
    }});
    const card = container.querySelector('[class*="before:bg-bad"]');
    expect(card).toBeTruthy();
  });

  it('renders dash value gracefully', () => {
    const { getByText } = render(KpiCard, { props: {
      label: 'Empty', value: '–', tone: ''
    }});
    expect(getByText('–')).toBeTruthy();
  });
});
