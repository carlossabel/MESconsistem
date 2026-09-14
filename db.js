// Acesso ao PostgreSQL.
// No Railway: adicione o serviço PostgreSQL e, NO SERVIÇO DO APP, crie a
// variável DATABASE_URL com valor de referência ${{Postgres.DATABASE_URL}}.

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => console.error("Erro no pool do Postgres:", err.code || "", err.message));

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS levantamentos (
    id           SERIAL PRIMARY KEY,
    empresa      TEXT,
    responsavel  TEXT,
    email        TEXT,
    complexidade TEXT,
    respostas    JSONB NOT NULL,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS anexos (
    id              SERIAL PRIMARY KEY,
    levantamento_id INTEGER NOT NULL,
    ref             TEXT,
    nome            TEXT,
    tipo            TEXT,
    tamanho         INTEGER,
    dados           BYTEA NOT NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`;

async function ensureTable() {
  await pool.query(CREATE_SQL);
  // Para bancos criados antes da coluna ref existir (não quebra se já existir/indisponível)
  try { await pool.query("ALTER TABLE anexos ADD COLUMN IF NOT EXISTS ref TEXT"); } catch (e) { /* ok */ }
}

// Cria as tabelas no boot, com algumas tentativas (a rede interna do Railway
// pode levar alguns segundos para ficar pronta logo após o deploy).
async function init(retries = 6, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try { await ensureTable(); return; }
    catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Banco ainda não pronto (tentativa ${attempt}/${retries}: ${err.code || err.message}). Nova tentativa em ${delayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function _insert({ empresa, responsavel, email, complexidade, respostas }) {
  const res = await pool.query(
    `INSERT INTO levantamentos (empresa, responsavel, email, complexidade, respostas)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [empresa || null, responsavel || null, email || null, complexidade || null, respostas]
  );
  return res.rows[0].id;
}

async function salvar(data) {
  try {
    return await _insert(data);
  } catch (err) {
    const tabelaAusente = (err && err.code === "42P01") || (err && err.message && /does not exist/i.test(err.message));
    if (tabelaAusente) { await ensureTable(); return await _insert(data); }
    throw err;
  }
}

async function salvarAnexo({ levantamentoId, ref, nome, tipo, tamanho, dados }) {
  const res = await pool.query(
    `INSERT INTO anexos (levantamento_id, ref, nome, tipo, tamanho, dados)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [levantamentoId, ref || null, nome || null, tipo || null, tamanho || null, dados]
  );
  return res.rows[0].id;
}

async function listar() {
  const res = await pool.query(
    `SELECT l.id, l.empresa, l.responsavel, l.complexidade, l.criado_em,
            COUNT(a.id) AS anexos
       FROM levantamentos l
       LEFT JOIN anexos a ON a.levantamento_id = l.id
      GROUP BY l.id, l.empresa, l.responsavel, l.complexidade, l.criado_em
      ORDER BY l.criado_em DESC`
  );
  return res.rows;
}

async function buscar(id) {
  const res = await pool.query(`SELECT * FROM levantamentos WHERE id = $1`, [id]);
  return res.rows[0] || null;
}

async function listarAnexos(levantamentoId) {
  const res = await pool.query(
    `SELECT id, ref, nome, tipo, tamanho FROM anexos WHERE levantamento_id = $1 ORDER BY id`,
    [levantamentoId]
  );
  return res.rows;
}

async function buscarAnexo(id) {
  const res = await pool.query(`SELECT id, nome, tipo, tamanho, dados FROM anexos WHERE id = $1`, [id]);
  return res.rows[0] || null;
}

async function todos() {
  const res = await pool.query(`SELECT * FROM levantamentos ORDER BY criado_em ASC`);
  return res.rows;
}

module.exports = {
  pool, init, ensureTable, salvar, salvarAnexo,
  listar, buscar, listarAnexos, buscarAnexo, todos,
  hasUrl: !!process.env.DATABASE_URL,
};
