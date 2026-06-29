import 'dotenv/config';
import { resolve } from 'node:path';

const url = (process.env.DATABASE_URL || '').trim();
let query: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

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
  const dbPath = process.env.SQLITE_PATH
    ? resolve(process.cwd(), process.env.SQLITE_PATH)
    : resolve(process.cwd(), '../etl/data/dynasty.db');
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  query = async (sql, params = []) => db.prepare(sql).all(...params) as Record<string, unknown>[];
  console.log(`DB: SQLite (${dbPath})`);
}

export { query };
