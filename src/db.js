import pg from 'pg';

export function createDb(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 10 });
  pool.on('error', (err) => console.error('postgres pool error', err));

  return {
    pool,
    query: (text, params) => pool.query(text, params),
    one: async (text, params) => (await pool.query(text, params)).rows[0] ?? null,
    many: async (text, params) => (await pool.query(text, params)).rows,
    close: () => pool.end(),
  };
}
