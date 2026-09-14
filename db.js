// Acesso ao PostgreSQL. No Railway, adicione o plugin "PostgreSQL" e a
// variável DATABASE_URL é criada e injetada automaticamente.

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS levantamentos (
      id           SERIAL PRIMARY KEY,
      empresa      TEXT,
      responsavel  TEXT,
      email        TEXT,
      complexidade TEXT,
      respostas    JSONB NOT NULL,
      criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function salvar({ empresa, responsavel, email, complexidade, respostas }) {
  const res = await pool.query(
    `INSERT INTO levantamentos (empresa, responsavel, email, complexidade, respostas)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [empresa || null, responsavel || null, email || null, complexidade || null, respostas]
  );
  return res.rows[0].id;
}

async function listar() {
  const res = await pool.query(
    `SELECT id, empresa, responsavel, email, complexidade, criado_em
       FROM levantamentos ORDER BY criado_em DESC`
  );
  return res.rows;
}

async function buscar(id) {
  const res = await pool.query(`SELECT * FROM levantamentos WHERE id = $1`, [id]);
  return res.rows[0] || null;
}

async function todos() {
  const res = await pool.query(`SELECT * FROM levantamentos ORDER BY criado_em ASC`);
  return res.rows;
}

module.exports = { pool, init, salvar, listar, buscar, todos };
