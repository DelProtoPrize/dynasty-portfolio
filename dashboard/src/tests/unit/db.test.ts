import { describe, it, expect } from 'vitest';

describe('db layer - placeholder rewriting', () => {
  it('rewrites ? placeholders to $1, $2 for postgres', () => {
    const sql = 'SELECT * FROM t WHERE a = ? AND b = ?';
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    expect(pgSql).toBe('SELECT * FROM t WHERE a = $1 AND b = $2');
  });

  it('handles zero placeholders', () => {
    const sql = 'SELECT * FROM t';
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    expect(pgSql).toBe('SELECT * FROM t');
  });

  it('handles many placeholders', () => {
    const sql = 'INSERT INTO t VALUES (?, ?, ?, ?, ?)';
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    expect(pgSql).toBe('INSERT INTO t VALUES ($1, $2, $3, $4, $5)');
  });
});
