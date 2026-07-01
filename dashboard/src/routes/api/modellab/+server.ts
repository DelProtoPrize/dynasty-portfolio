import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

const POS_ORDER = ['QB', 'RB', 'WR', 'TE'];

async function getMetric(model: string, season: number, pos: string, metric: string) {
  const rows = await query(
    'SELECT value, n FROM evaluations WHERE model_id=? AND test_season=? AND position=? AND metric=?',
    [model, season, pos, metric]
  );
  if (rows.length === 0) return { value: null, n: null };
  return { value: rows[0].value, n: rows[0].n };
}

export const GET: RequestHandler = async () => {
  const tables = await query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('evaluations','model_coefficients','model_runs','predictions')"
  );
  const have = new Set(tables.map((r: any) => r.name));

  if (!have.has('evaluations')) {
    return json({ error: 'No backtest data available' }, { status: 404 });
  }

  const pooledCheck = await query(
    'SELECT COUNT(*) AS cnt FROM evaluations WHERE test_season=0'
  );
  if ((pooledCheck[0] as any).cnt === 0) {
    return json({ error: 'No backtest data available' }, { status: 404 });
  }

  const b1 = await getMetric('b1_ecr_v1', 0, 'ALL', 'skill_vs_b0');
  const b1Lo = await getMetric('b1_ecr_v1', 0, 'ALL', 'skill_vs_b0_ci_lo');
  const b1Hi = await getMetric('b1_ecr_v1', 0, 'ALL', 'skill_vs_b0_ci_hi');
  const m1 = await getMetric('m1_ridge_v1', 0, 'ALL', 'skill_vs_b1');
  const m1Lo = await getMetric('m1_ridge_v1', 0, 'ALL', 'skill_vs_b1_ci_lo');
  const m1Hi = await getMetric('m1_ridge_v1', 0, 'ALL', 'skill_vs_b1_ci_hi');
  const ins = await getMetric('m1_ridge_v1', 0, 'ALL', 'skill_vs_b1_inseason');
  const insLo = await getMetric('m1_ridge_v1', 0, 'ALL', 'skill_vs_b1_inseason_ci_lo');
  const insHi = await getMetric('m1_ridge_v1', 0, 'ALL', 'skill_vs_b1_inseason_ci_hi');

  const verdicts = [
    {
      q: 'Does expert rank beat naive persistence?',
      detail: 'B1 (flat ECR curve) vs B0 (last-season ppg carried forward), rest-of-season points, common support',
      skill: b1.value, lo: b1Lo.value, hi: b1Hi.value, n: b1.n
    },
    {
      q: 'Does production data add anything ECR doesn\'t know?',
      detail: 'm1 (ridge: B1 prediction + production features) vs B1, all as-of dates pooled',
      skill: m1.value, lo: m1Lo.value, hi: m1Hi.value, n: m1.n
    },
    {
      q: '…what about once the season is underway?',
      detail: 'same comparison, week 5/9/13 as-of dates only (pre-registered split)',
      skill: ins.value, lo: insLo.value, hi: insHi.value, n: ins.n
    }
  ];

  const byPosition = [];
  for (const pos of POS_ORDER) {
    const sB1 = await getMetric('b1_ecr_v1', 0, pos, 'skill_vs_b0');
    const sM1 = await getMetric('m1_ridge_v1', 0, pos, 'skill_vs_b1');
    byPosition.push({ pos, b1_vs_b0: sB1.value, m1_vs_b1: sM1.value, n: sB1.n || sM1.n });
  }

  const weekRows = await query(
    "SELECT metric, value, n FROM evaluations WHERE model_id='m1_ridge_v1' AND test_season=0 AND position='ALL' AND metric LIKE 'skill_vs_b1_wk%'"
  );
  const byWeek = weekRows
    .map((r: any) => ({
      week: parseInt(r.metric.replace('skill_vs_b1_wk', '')),
      skill: r.value,
      n: r.n
    }))
    .sort((a: any, b: any) => a.week - b.week);

  const trendRows = await query(
    "SELECT model_id, test_season, metric, value, n FROM evaluations WHERE test_season>0 AND metric IN ('skill_vs_b0','skill_vs_b1')"
  );
  const seasons = [...new Set(trendRows.map((r: any) => r.test_season))].sort() as number[];

  function seasonSeries(modelId: string, metric: string) {
    const filtered = trendRows.filter((r: any) => r.model_id === modelId && r.metric === metric);
    return seasons.map(s => {
      const rows = filtered.filter((r: any) => r.test_season === s);
      if (rows.length === 0) return null;
      const wSum = rows.reduce((acc: number, r: any) => acc + r.value * r.n, 0);
      const nSum = rows.reduce((acc: number, r: any) => acc + r.n, 0);
      return nSum > 0 ? Math.round((wSum / nSum) * 10000) / 10000 : null;
    });
  }

  const bySeason = {
    seasons,
    b1_vs_b0: seasonSeries('b1_ecr_v1', 'skill_vs_b0'),
    m1_vs_b1: seasonSeries('m1_ridge_v1', 'skill_vs_b1')
  };

  let coefficients = null;
  if (have.has('model_coefficients')) {
    const cfRows = await query(
      "SELECT position, feature, AVG(beta) AS beta FROM model_coefficients WHERE model_id='m1_ridge_v1' GROUP BY position, feature"
    );
    if (cfRows.length > 0) {
      const featureAvg: Record<string, number> = {};
      cfRows.forEach((r: any) => {
        featureAvg[r.feature] = (featureAvg[r.feature] || 0) + Math.abs(r.beta);
      });
      const order = ['b1_rate', ...Object.entries(featureAvg)
        .filter(([f]) => f !== 'b1_rate')
        .sort((a, b) => b[1] - a[1])
        .map(([f]) => f)];

      const beta = order.map(feat =>
        POS_ORDER.map(pos => {
          const row = cfRows.find((r: any) => r.feature === feat && r.position === pos);
          return row ? Math.round((row as any).beta * 1000) / 1000 : null;
        })
      );
      coefficients = { features: order, positions: POS_ORDER, beta };
    }
  }

  let protocol = null;
  if (have.has('model_runs') && have.has('predictions')) {
    const runs = await query('SELECT model_id, MAX(run_ts) AS last_run FROM model_runs GROUP BY model_id');
    const nPred = await query('SELECT COUNT(*) AS cnt FROM predictions');
    protocol = {
      runs,
      n_predictions: (nPred[0] as any).cnt,
      grid: 'as-of = day before weeks 1/5/9/13, seasons 2020-2025, expanding-window training from 2019',
      currency: 'The Drew League points (14-team SF, TE-premium 0.5), REG season only'
    };
  }

  return json({ verdicts, by_position: byPosition, by_week: byWeek, by_season: bySeason, coefficients, protocol });
};
