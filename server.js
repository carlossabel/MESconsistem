const express = require("express");
const path = require("path");
const multer = require("multer");
const Q = require("./questionnaire");
const db = require("./db");
const mailer = require("./mailer");

const app = express();
const PORT = process.env.PORT || 3000;

const MAX_MB = 25;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 12 },
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const esc = Q.esc;

// Serve o módulo compartilhado para o navegador
app.get("/questionnaire.js", (req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(__dirname, "questionnaire.js"));
});

function layout(title, body, extraHead = "") {
  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  ${extraHead}
</head>
<body>
${body}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
//  Formulário (wizard client-side)
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send(
    layout(
      "Levantamento Inicial – Indústria 4.0 Consistem",
      `<div id="app"></div>
       <script src="/questionnaire.js"></script>
       <script src="/app.js"></script>`
    )
  );
});

// ---------------------------------------------------------------------------
//  Recebimento das respostas
// ---------------------------------------------------------------------------
app.post(
  "/enviar",
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) {
        const msg = err.code === "LIMIT_FILE_SIZE" ? `Cada arquivo pode ter no máximo ${MAX_MB} MB.`
          : err.code === "LIMIT_FILE_COUNT" ? "Muitos arquivos por item (máximo 12)."
          : "Falha no upload dos arquivos.";
        return res.status(400).json({ ok: false, erro: msg });
      }
      next();
    });
  },
  async (req, res) => {
    // respostas chega como string (multipart) ou objeto (json)
    let respostas = {};
    try {
      const raw = req.body && req.body.respostas;
      respostas = typeof raw === "string" ? JSON.parse(raw) : raw || {};
    } catch (e) {
      return res.status(400).json({ ok: false, erro: "Dados inválidos." });
    }

    const faltando = Q.allFields()
      .filter((f) => f.required && Q.isActive(f, respostas))
      .filter((f) => {
        const v = respostas[f.id];
        return v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");
      })
      .map((f) => f.label);
    if (faltando.length) return res.status(400).json({ ok: false, faltando });

    let diag, novoId;
    try {
      diag = Q.gerarDiagnostico(respostas);
      novoId = await db.salvar({
        empresa: respostas.empresa,
        responsavel: respostas.responsavel,
        email: respostas.email,
        complexidade: diag.complexidade.nivel,
        respostas,
      });
    } catch (err) {
      console.error("Erro ao salvar:", err.code || "", err.message);
      return res.status(500).json({ ok: false, erro: "Falha ao salvar. Tente novamente." });
    }

    // Rótulo do item ao qual a mídia pertence (a partir do fieldname midia_<rep>_<idx>)
    const refDoCampo = (fieldname) => {
      const m = /^midia_(maquinas|linhas)_(\d+)$/.exec(fieldname || "");
      if (!m) return "Geral";
      const rep = m[1], idx = parseInt(m[2], 10);
      const base = rep === "maquinas" ? "Máquina" : "Linha";
      const item = (Array.isArray(respostas[rep]) ? respostas[rep] : [])[idx] || {};
      return base + " " + (idx + 1) + (item.nome ? " – " + item.nome : "");
    };

    // Salva as fotos/vídeos (não bloqueia a resposta se algum falhar)
    const arquivos = req.files || [];
    for (const f of arquivos) {
      try {
        await db.salvarAnexo({ levantamentoId: novoId, ref: refDoCampo(f.fieldname), nome: f.originalname, tipo: f.mimetype, tamanho: f.size, dados: f.buffer });
      } catch (e) {
        console.error("Falha ao salvar anexo:", e.code || "", e.message);
      }
    }

    // Notificação por e-mail (não bloqueia a resposta ao cliente se falhar)
    try {
      if (mailer.isConfigured()) {
        const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0];
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        const base = host ? proto + "://" + host : "";
        const adminUrl = base ? base + "/admin/resposta/" + novoId : "";
        const cliente = respostas.empresa || "Novo levantamento";
        const anexosInfo = arquivos.length ? `${arquivos.length} arquivo(s) de mídia enviados pelo cliente.` : "";

        // Anexa ao e-mail respeitando um teto de ~18 MB (limite dos provedores)
        const anexosEmail = [];
        let acc = 0;
        for (const f of arquivos) {
          if (acc + f.size <= 18 * 1024 * 1024) {
            anexosEmail.push({ filename: f.originalname, content: f.buffer, contentType: f.mimetype });
            acc += f.size;
          }
        }

        await mailer.enviar({
          subject: "MES Consistem – " + cliente,
          html: Q.renderDiagnosticoEmailHTML(diag, { adminUrl, anexosInfo }),
          text: Q.renderDiagnosticoTexto(diag) + (anexosInfo ? "\n\n" + anexosInfo : "") + (adminUrl ? "\n\nAbrir no painel: " + adminUrl : ""),
          attachments: anexosEmail,
        });
        console.log("Notificação enviada para: " + mailer.destinatarios());
      } else {
        console.warn("E-mail não configurado (SMTP_HOST/SMTP_USER). Notificação não enviada.");
      }
    } catch (mailErr) {
      console.error("Falha ao enviar e-mail de notificação:", mailErr.message);
    }

    res.json({ ok: true });
  }
);

// ---------------------------------------------------------------------------
//  Admin (Basic Auth)
// ---------------------------------------------------------------------------
function adminAuth(req, res, next) {
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return res.status(500).send("Configure ADMIN_PASSWORD para acessar o admin.");
  const [scheme, encoded] = (req.headers.authorization || "").split(" ");
  if (scheme === "Basic" && encoded) {
    const [u, p] = Buffer.from(encoded, "base64").toString().split(":");
    if (u === user && p === pass) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Admin", charset="UTF-8"');
  return res.status(401).send("Acesso restrito.");
}

const badgeClass = { Baixa: "baixa", "Média": "media", Alta: "alta" };

app.get("/admin", adminAuth, async (req, res) => {
  let rows;
  try { rows = await db.listar(); }
  catch (err) { return res.status(500).send("Banco indisponível: " + esc(err.message)); }

  const linhas = rows.length
    ? rows.map((r) => `
      <tr>
        <td>${r.id}</td>
        <td>${esc(r.empresa || "—")}</td>
        <td>${esc(r.responsavel || "—")}</td>
        <td><span class="badge ${badgeClass[r.complexidade] || ""}">${esc(r.complexidade || "—")}</span></td>
        <td>${Number(r.anexos) > 0 ? '<span class="clip">' + r.anexos + "</span>" : "—"}</td>
        <td>${new Date(r.criado_em).toLocaleString("pt-BR")}</td>
        <td><a class="link" href="/admin/resposta/${r.id}">abrir</a></td>
      </tr>`).join("")
    : `<tr><td colspan="7" class="empty">Nenhum levantamento ainda.</td></tr>`;

  res.send(layout("Levantamentos", `
    <main class="page admin">
      <header class="admin-head">
        <div><p class="eyebrow">Consistem · Indústria 4.0</p><h1>Levantamentos recebidos</h1></div>
        <div class="admin-actions">
          <span class="count">${rows.length} no total</span>
          <a class="btn ghost" href="/admin/export.csv">Baixar CSV</a>
        </div>
      </header>
      <table class="table">
        <thead><tr><th>#</th><th>Empresa</th><th>Responsável</th><th>Complexidade</th><th>Mídia</th><th>Recebido em</th><th></th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </main>`));
});

app.get("/admin/resposta/:id", adminAuth, async (req, res) => {
  let r;
  try { r = await db.buscar(req.params.id); }
  catch (err) { return res.status(500).send("Erro: " + esc(err.message)); }
  if (!r) return res.status(404).send(layout("Não encontrado", `<main class="page narrow"><div class="card"><h1>Não encontrado</h1><a class="btn" href="/admin">Voltar</a></div></main>`));

  const respostas = r.respostas || {};
  const diag = Q.gerarDiagnostico(respostas);

  let anexos = [];
  try { anexos = await db.listarAnexos(r.id); } catch (e) { /* ignora */ }
  const grupos = {};
  anexos.forEach((a) => { const k = a.ref || "Geral"; (grupos[k] = grupos[k] || []).push(a); });
  const midia = anexos.length ? `
    <section class="anexos-sec">
      <h3 class="anexos-titulo">Fotos e vídeos (${anexos.length})</h3>
      ${Object.keys(grupos).map((g) => `
        <div class="anexo-grupo">
          <h4 class="anexo-grupo-tit">${esc(g)}</h4>
          <div class="anexos-grid">
            ${grupos[g].map((a) => {
              const url = `/admin/anexo/${a.id}`;
              const tipo = a.tipo || "";
              const media = tipo.startsWith("image/") ? `<img src="${url}" alt="${esc(a.nome || "")}" loading="lazy">`
                : tipo.startsWith("video/") ? `<video src="${url}" controls preload="metadata"></video>`
                : `<div class="anexo-file">arquivo</div>`;
              return `<figure class="anexo">${media}<figcaption><a href="${url}" target="_blank" rel="noopener">${esc(a.nome || "abrir")}</a></figcaption></figure>`;
            }).join("")}
          </div>
        </div>`).join("")}
    </section>` : "";

  // Parque cadastrado (linhas e máquinas)
  const _linhas = Array.isArray(respostas.linhas) ? respostas.linhas : [];
  const _maquinas = Array.isArray(respostas.maquinas) ? respostas.maquinas : [];
  const parque = (_linhas.length || _maquinas.length) ? `
    <section class="parque-sec">
      <h3 class="anexos-titulo">Parque cadastrado</h3>
      ${_linhas.length ? `<h4 class="anexo-grupo-tit">Linhas (${_linhas.length})</h4>
        <ul class="parque-list">${_linhas.map((l) => `<li><strong>${esc(l.nome || "Linha")}</strong>${l.produto ? " — " + esc(l.produto) : ""}</li>`).join("")}</ul>` : ""}
      ${_maquinas.length ? `<h4 class="anexo-grupo-tit">Máquinas (${_maquinas.length})</h4>
        <ul class="parque-list">${_maquinas.map((m) => `<li><strong>${esc(m.nome || "Máquina")}</strong>${m.tipo ? " (" + esc(m.tipo) + ")" : ""}${m.linha ? " · " + esc(m.linha) : ""}${m.clp ? " · CLP: " + esc(m.clp) : ""}${m.fabricante ? " · " + esc(m.fabricante) : ""}${(m.ler && m.ler.length) ? `<br><span class="parque-ler">Ler: ${esc(m.ler.join(", "))}</span>` : ""}</li>`).join("")}</ul>` : ""}
    </section>` : "";

  // Respostas brutas (só campos ativos e respondidos)
  const blocos = Q.allFields()
    .filter((f) => Q.isActive(f, respostas) && respostas[f.id] != null && respostas[f.id] !== "" && !(Array.isArray(respostas[f.id]) && respostas[f.id].length === 0))
    .map((f) => {
      let v = respostas[f.id];
      if (Array.isArray(v)) v = v.join(", ");
      return `<div class="answer"><div class="q">${esc(f.label)}</div><div class="a">${esc(v).replace(/\n/g, "<br>")}</div></div>`;
    }).join("");

  res.send(layout("Levantamento #" + r.id, `
    <main class="page narrow admin">
      <a class="back" href="/admin">← Todos os levantamentos</a>
      ${Q.renderDiagnosticoHTML(diag)}
      ${parque}
      ${midia}
      <details class="raw">
        <summary>Ver todas as respostas (${new Date(r.criado_em).toLocaleString("pt-BR")})</summary>
        <div class="answers">${blocos || "<p>Sem dados.</p>"}</div>
      </details>
    </main>`));
});

app.get("/admin/anexo/:id", adminAuth, async (req, res) => {
  let a;
  try { a = await db.buscarAnexo(req.params.id); }
  catch (err) { return res.status(500).send("Erro: " + esc(err.message)); }
  if (!a) return res.status(404).send("Anexo não encontrado.");
  res.set("Content-Type", a.tipo || "application/octet-stream");
  res.set("Content-Disposition", `inline; filename="${String(a.nome || "anexo").replace(/"/g, "")}"`);
  res.send(a.dados);
});

app.get("/admin/export.csv", adminAuth, async (req, res) => {
  let rows;
  try { rows = await db.todos(); }
  catch (err) { return res.status(500).send("Erro: " + esc(err.message)); }

  const fields = Q.allFields();
  const header = ["id", "criado_em", "complexidade", "qtd_linhas", "qtd_maquinas", ...fields.map((f) => f.id)];
  const cell = (v) => {
    if (v == null) v = "";
    if (Array.isArray(v)) v = v.join("; ");
    return `"${String(v).replace(/"/g, '""')}"`;
  };
  const linhas = rows.map((r) => {
    const a = r.respostas || {};
    const nl = Array.isArray(a.linhas) ? a.linhas.length : 0;
    const nm = Array.isArray(a.maquinas) ? a.maquinas.length : 0;
    return [cell(r.id), cell(new Date(r.criado_em).toISOString()), cell(r.complexidade), cell(nl), cell(nm), ...fields.map((f) => cell(a[f.id]))].join(",");
  });
  const csv = "\uFEFF" + [header.map(cell).join(","), ...linhas].join("\r\n");
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", 'attachment; filename="levantamentos.csv"');
  res.send(csv);
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Servidor no ar em http://localhost:${PORT}`);
  if (!process.env.DATABASE_URL) {
    console.warn(
      "ATENÇÃO: DATABASE_URL não está definida. No serviço do app (Railway), " +
      "crie a variável DATABASE_URL com valor ${{Postgres.DATABASE_URL}} e faça redeploy."
    );
  }
  db.init()
    .then(() => console.log("Banco pronto."))
    .catch((e) => console.error("Falha ao preparar o banco:", e.code || "", e.message));
});
