export const POS_COLOR: Record<string, string> = {
  QB: '#3d80f5', RB: '#3ecf74', WR: '#e8a838', TE: '#b47cf5'
};
export const INK = '#dde4ee';
export const GRID = '#1e2530';

export function fmt(n: number | null | undefined): string {
  return n == null ? '–' : Number(n).toLocaleString();
}

export function pctShare(x: number | null | undefined, total: number): string {
  return total > 0 && x != null ? ((x / total) * 100).toFixed(1) + '%' : '–';
}

export function median(xs: number[]): number | null {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : null;
}

export function hhiTone(h: number): string {
  return h > 0.2 ? 'kpi-bad' : h > 0.15 ? 'kpi-warn' : 'kpi-good';
}
