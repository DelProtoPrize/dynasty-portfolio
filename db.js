// db.js — single data-access layer for both local (SQLite) and deployed (Postgres).
//
// Local dev (default): reads the SQLite file the ETL produces (etl/data/dynasty.db).
// Deploy: set DATABASE_URL=postgres://... and the SAME ETL (which already supports
// DATABASE_URL) loads Postgres; this server reads it. One codebase, no migration.
//
// Routes always call:  await query(sql, params)  using `?` placeholders.
// In Postgres mode, `?` is rewritten to $1,$2,... automatically.
import 'dotenv/config';

const url = (process.env.DATABASE_URL || '').trim();
let query;

if (url.startsWith('postgres')) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: url });
  query = async (sql, params = []) => {
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    const { rows } = await pool.query(pgSql, params);
    return rows;
  };
  console.log('DB: PostgreSQL');
} else {
  const { default: Database } = await import('better-sqlite3');
  const path = process.env.SQLITE_PATH || '../etl/data/dynasty.db';
  const db = new Database(path, { readonly: true, fileMustExist: true });
  db.pragma('journal_mode = WAL');
  query = async (sql, params = []) => db.prepare(sql).all(...params);
  console.log(`DB: SQLite (${path})`);
}

export { query };
