/* ============================================================================
 *  QUESTIONÁRIO — Levantamento Inicial Indústria 4.0 Consistem  (versão enxuta)
 *  ----------------------------------------------------------------------------
 *  Roda no navegador E no servidor (Node): a lógica condicional e o diagnóstico
 *  ficam sempre iguais dos dois lados.
 *
 *  Edite apenas STEPS para mudar as perguntas. Tipos de campo (type):
 *    info | text | email | tel | number | date | textarea
 *    select | radio | checkbox   (precisam de options)
 *    file                        (upload de fotos/vídeos — tratado no cliente)
 *
 *  showIf: (r) => boolean  -> mostra a pergunta só quando a condição for verdadeira.
 * ==========================================================================*/

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Questionario = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const val = (r, id) => (r && r[id] != null ? r[id] : "");
  const arr = (r, id) => {
    const v = r ? r[id] : undefined;
    if (v == null || v === "") return [];
    return Array.isArray(v) ? v : [v];
  };
  const isYes = (r, id) => val(r, id) === "Sim";
  const inList = (r, id, list) => list.includes(val(r, id));

  function esc(v) {
    if (v == null) return "";
    return String(v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // =========================================================================
  //  ETAPAS (enxutas e objetivas)
  // =========================================================================
  const STEPS = [
    // 1
    {
      title: "Identificação",
      subtitle: "Só para sabermos com quem estamos falando.",
      fields: [
        { id: "empresa", label: "Empresa", type: "text", required: true },
        { id: "responsavel", label: "Quem está respondendo", type: "text", required: true },
      ],
    },

    // 2
    {
      title: "Parque de máquinas",
      subtitle: "Cadastre as linhas e as máquinas que deseja monitorar. Em cada uma dá para anexar fotos e vídeos.",
      fields: [
        {
          id: "linhas", type: "repeater", itemLabel: "Linha", addLabel: "Adicionar linha", media: true,
          label: "Linhas de produção",
          help: "Cadastre cada linha que deseja acompanhar (opcional, mas ajuda bastante).",
          subfields: [
            { id: "nome", label: "Nome / identificação da linha", type: "text", placeholder: "Ex.: Linha de Envase 1" },
            { id: "produto", label: "Produto ou processo (opcional)", type: "text", placeholder: "Ex.: Iogurte 170g" },
          ],
        },
        {
          id: "maquinas", type: "repeater", itemLabel: "Máquina", addLabel: "Adicionar máquina", media: true,
          label: "Máquinas / equipamentos",
          help: "Cadastre as máquinas e, principalmente, o que deseja ler de cada uma.",
          subfields: [
            { id: "nome", label: "Nome / identificação da máquina", type: "text", placeholder: "Ex.: Envasadora 1" },
            { id: "linha", label: "Linha / área (opcional)", type: "text", placeholder: "Ex.: Linha de Envase 1" },
            { id: "tipo", label: "Tipo / função (opcional)", type: "text", placeholder: "Ex.: Envasadora, forno, rotuladora" },
            {
              id: "ler", label: "O que deseja ler / monitorar desta máquina", type: "checkbox", sum: "Ler",
              options: ["Ligada / parada", "Produção (contagem)", "Velocidade / ciclo", "Refugo", "Temperatura", "Pressão", "Alarmes / falhas", "Consumo de energia", "Outros"],
            },
            { id: "clp", label: "Possui CLP / controlador?", type: "radio", sum: "CLP", options: ["Sim", "Não", "Não sei"] },
            { id: "fabricante", label: "Fabricante / modelo (se souber)", type: "text" },
          ],
        },
        {
          id: "apont_como", label: "Como os apontamentos são feitos hoje?",
          type: "checkbox",
          options: ["Papel", "Planilha", "No ERP", "Sistema específico", "Terminal no chão de fábrica", "Automático pelas máquinas", "Não são feitos"],
        },
        { id: "paradas_registradas", label: "Os motivos de parada são registrados?", type: "radio", options: ["Sim", "Não"] },
        { id: "paradas_interesse", label: "Há interesse em passar a controlar os motivos de parada?", type: "radio", options: ["Sim", "Não"], showIf: (r) => val(r, "paradas_registradas") === "Não" },
      ],
    },

    // 3
    {
      title: "Indicadores",
      subtitle: "O que vocês querem enxergar.",
      fields: [
        {
          id: "tempo_real", label: "O que gostariam de ver em tempo real?",
          type: "checkbox", required: true,
          options: ["Status das máquinas", "Produção atual", "Planejado x realizado", "OEE", "Disponibilidade", "Performance", "Qualidade", "Paradas e motivos", "Refugo", "Alertas"],
        },
      ],
    },

    // 4
    {
      title: "Infraestrutura",
      subtitle: "A rede e o acesso no chão de fábrica.",
      fields: [
        { id: "rede", label: "Existe rede próxima às máquinas?", type: "radio", required: true, options: ["Cabeada", "Wi-Fi", "Ambas", "Não", "Não sabemos"] },
      ],
    },

    // 5
    {
      title: "Time técnico e piloto",
      subtitle: "Quem apoia no acesso às máquinas e por onde começar.",
      fields: [
        { id: "autom_por", label: "A automação/elétrica das máquinas é feita por:", type: "radio", options: ["Equipe interna", "Terceiros", "Ambos"] },
        { id: "resp_tecnico", label: "Hoje o técnico responsável pelas máquinas tem conhecimento de como ler os sinais das máquinas?", type: "radio", options: ["Sim", "Não"] },
        { id: "resp_tecnico_nome", label: "Nome do responsável técnico", type: "text", showIf: (r) => isYes(r, "resp_tecnico") },
        { id: "resp_tecnico_contato", label: "Contato (telefone ou e-mail)", type: "text", showIf: (r) => isYes(r, "resp_tecnico") },
        { id: "linha_piloto", label: "Se fôssemos começar por uma linha/máquina, qual seria?", type: "text" },
        {
          id: "poc_resultados", label: "Resultados esperados com o piloto",
          type: "checkbox", required: true,
          options: ["Redução de paradas", "Aumento de produtividade", "OEE em tempo real", "Fim dos apontamentos manuais", "Informação confiável", "Controle de refugo", "Rastreabilidade", "Melhor gestão da produção"],
        },
      ],
    },

    // 6
    {
      title: "Observações",
      subtitle: "Para fechar. Tudo aqui é opcional.",
      fields: [
        { id: "midia_links", label: "Links de fotos/vídeos (opcional)", type: "textarea", placeholder: "Cole aqui links do Google Drive, YouTube, etc." },
        { id: "obs_final", label: "Observações (opcional)", type: "textarea" },
      ],
    },
  ];

  // Campos "de dado" planos (ignora info, file e repeater — tratados à parte no cliente)
  function allFields() {
    return STEPS.flatMap((s) => s.fields).filter((f) => f.type !== "info" && f.type !== "file" && f.type !== "repeater");
  }
  function isActive(field, respostas) {
    return typeof field.showIf !== "function" || field.showIf(respostas);
  }
  function label(id) {
    const f = STEPS.flatMap((s) => s.fields).find((x) => x.id === id);
    return f ? f.label : id;
  }

  // =========================================================================
  //  COMPLEXIDADE
  // =========================================================================
  function classificarComplexidade(r) {
    let score = 0;
    const fatores = [];
    const add = (n, texto) => { score += n; if (texto) fatores.push(texto); };

    const maquinas = Array.isArray(r.maquinas) ? r.maquinas : [];
    const comCLP = maquinas.filter((m) => m.clp === "Sim").length;
    const semCLP = maquinas.filter((m) => m.clp && m.clp !== "Sim").length; // "Não" / "Não sei"
    const semInfoCLP = maquinas.filter((m) => !m.clp).length;
    if (!maquinas.length) add(1, "Nenhuma máquina cadastrada para avaliar comunicação");
    else if (comCLP === 0) add(2, "Nenhuma máquina com CLP confirmado");
    else if (semCLP + semInfoCLP > 0) add(1, "Parte das máquinas sem CLP confirmado");

    const rede = val(r, "rede");
    if (rede === "Não" || rede === "Não sabemos") add(2, "Infraestrutura de rede ausente ou desconhecida");
    else if (rede === "Wi-Fi") add(0.5, "Rede apenas por Wi-Fi (avaliar estabilidade industrial)");

    const nMaq = maquinas.length;
    if (nMaq > 20) add(2, "Grande quantidade de máquinas"); else if (nMaq > 5) add(1, "Quantidade média de máquinas");
    const nLin = (Array.isArray(r.linhas) ? r.linhas : []).length;
    if (nLin > 3) add(1, "Muitas linhas a monitorar");

    if (val(r, "autom_por") === "Terceiros") add(1, "Automação mantida por terceiros (acesso depende de agenda externa)");
    if (val(r, "paradas_registradas") === "Não") add(0.5, "Motivos de parada não são registrados hoje");

    let nivel = "Baixa";
    if (score > 5.5) nivel = "Alta"; else if (score >= 3) nivel = "Média";

    const explicacao = nivel === "Baixa"
      ? "O ambiente já reúne boa parte das condições técnicas (comunicação das máquinas e infraestrutura), o que favorece uma POC rápida."
      : nivel === "Média"
        ? "Projeto viável, com alguns pontos técnicos a preparar antes ou durante a POC (comunicação das máquinas e/ou infraestrutura)."
        : "Há dependências técnicas relevantes (comunicação das máquinas, infraestrutura e/ou acessos) que pedem uma fase de preparação antes da coleta automática.";

    return { nivel, fatores: fatores.length ? fatores : ["Sem fatores de risco relevantes identificados"], explicacao, score };
  }

  // =========================================================================
  //  DIAGNÓSTICO
  // =========================================================================
  function gerarDiagnostico(r) {
    const lista = (a, vazio) => (a && a.length ? a.join(", ") : vazio || "Não informado");
    const txt = (id, vazio) => (val(r, id) ? val(r, id) : vazio || "Não informado");
    const secoes = [];
    const S = (titulo, linhas) => secoes.push({ titulo, linhas: linhas.filter(Boolean) });

    const _linhas = Array.isArray(r.linhas) ? r.linhas : [];
    const _maquinas = Array.isArray(r.maquinas) ? r.maquinas : [];
    const comCLP = _maquinas.filter((m) => m.clp === "Sim").length;
    const semCLPinfo = _maquinas.filter((m) => !m.clp || m.clp === "Não sei").length;
    const lerUniao = [];
    _maquinas.forEach((m) => (Array.isArray(m.ler) ? m.ler : []).forEach((x) => { if (lerUniao.indexOf(x) < 0) lerUniao.push(x); }));

    S("Cenário atual", [
      `Empresa: ${txt("empresa")}.`,
      `Apontamento hoje: ${lista(arr(r, "apont_como"), "não informado")}.`,
    ]);
    const linMaqLinhas = [
      `Linhas cadastradas: ${_linhas.length}${_linhas.length ? " — " + _linhas.map((l) => l.nome || "sem nome").join(", ") : ""}.`,
      `Máquinas cadastradas: ${_maquinas.length}.`,
    ].concat(_maquinas.map((m) => {
      const ler = m.ler && m.ler.length ? m.ler.join(", ") : "a definir";
      return `• ${m.nome || "Máquina"}${m.tipo ? " (" + m.tipo + ")" : ""} — ler: ${ler}${m.clp ? " · CLP: " + m.clp : ""}.`;
    }));
    S("Linhas e máquinas", linMaqLinhas);
    S("Linha/máquina para o piloto", [
      `Candidata indicada: ${txt("linha_piloto", "a definir")}.`,
      arr(r, "poc_resultados").length ? `Resultados esperados: ${lista(arr(r, "poc_resultados"))}.` : "",
    ]);
    S("Situação dos apontamentos", [
      `Formas: ${lista(arr(r, "apont_como"))}.`,
      `Motivos de parada registrados: ${txt("paradas_registradas", "não informado")}${
        val(r, "paradas_registradas") === "Não" && val(r, "paradas_interesse") ? ` (interesse: ${val(r, "paradas_interesse")})` : ""}.`,
    ]);
    S("Comunicação das máquinas", [
      _maquinas.length
        ? `CLP confirmado em ${comCLP} de ${_maquinas.length} máquina(s)${semCLPinfo ? ` (${semCLPinfo} sem CLP ou sem informação)` : ""}.`
        : "Nenhuma máquina cadastrada para avaliar a comunicação.",
    ]);
    S("Dados desejados nas máquinas", [
      lerUniao.length ? `A ler / monitorar: ${lerUniao.join(", ")}.` : "A definir com o cliente.",
    ]);
    S("Infraestrutura", [
      `Rede próxima às máquinas: ${txt("rede", "não informado")}.`,
    ]);
    S("Time técnico", [
      `Automação/elétrica por: ${txt("autom_por", "não informado")}.`,
      isYes(r, "resp_tecnico")
        ? `Apoio técnico: ${txt("resp_tecnico_nome", "a indicar")}${val(r, "resp_tecnico_contato") ? " — " + val(r, "resp_tecnico_contato") : ""}.`
        : "Apoio técnico dedicado: não confirmado.",
    ]);
    S("Indicadores desejados", [
      `Tempo real: ${lista(arr(r, "tempo_real"), "a definir")}.`,
    ]);
    const via = comCLP > 0 ? "coleta via CLP existente" : "definição do método de coleta (CLP a avaliar)";
    const dadosPOC = lerUniao.length ? lerUniao.join(", ") : "status e produção";
    S("Escopo sugerido para a POC", [
      `Provar o valor na linha/máquina "${txt("linha_piloto", "a definir")}", com ${via}.`,
      `Coletar: ${dadosPOC}.`,
      `Disponibilizar em tempo real: ${lista(arr(r, "tempo_real"), "status, produção e OEE")}.`,
    ]);

    const pontos = [];
    if (!_maquinas.length) pontos.push("Cadastrar as máquinas e o que se deseja ler de cada uma.");
    else if (comCLP === 0) pontos.push("Confirmar existência e tipo de CLP nas máquinas.");
    else if (semCLPinfo > 0) pontos.push("Validar CLP/comunicação das máquinas ainda sem CLP confirmado.");
    if (val(r, "rede") === "Não" || val(r, "rede") === "Não sabemos") pontos.push("Prover/mapear a rede no chão de fábrica.");
    if (val(r, "autom_por") === "Terceiros") pontos.push("Agendar apoio da automação terceirizada para acesso aos sinais.");
    if (!lerUniao.length) pontos.push("Definir sinais e variáveis a coletar de cada máquina.");
    if (!pontos.length) pontos.push("Nenhum bloqueio técnico crítico aparente; validar detalhes na visita técnica.");
    S("Pontos técnicos a validar", pontos);

    return {
      titulo: "Diagnóstico Inicial – Indústria 4.0 Consistem",
      empresa: val(r, "empresa"),
      secoes,
      complexidade: classificarComplexidade(r),
    };
  }

  // =========================================================================
  //  RENDER (tela e admin)
  // =========================================================================
  function renderDiagnosticoHTML(diag, opts) {
    const interno = !opts || opts.interno !== false;
    const c = diag.complexidade;
    const nivelClass = { Baixa: "baixa", "Média": "media", Alta: "alta" }[c.nivel] || "media";
    const secoes = diag.secoes
      .filter((s) => interno || s.titulo !== "Pontos técnicos a validar")
      .map((s, i) => `
      <section class="diag-sec">
        <h3><span class="diag-n">${String(i + 1).padStart(2, "0")}</span> ${esc(s.titulo)}</h3>
        <ul>${s.linhas.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      </section>`).join("");
    const complexBloco = interno ? `
      <div class="complex ${nivelClass}">
        <span class="complex-label">Complexidade preliminar</span>
        <span class="complex-nivel">${esc(c.nivel)}</span>
        <p class="complex-exp">${esc(c.explicacao)}</p>
        <ul class="complex-fatores">${c.fatores.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      </div>` : "";
    return `
    <div class="diagnostico">
      <div class="diag-head">
        <p class="diag-eyebrow">Consistem · Indústria 4.0</p>
        <h2>${esc(diag.titulo)}</h2>
        ${diag.empresa ? `<p class="diag-empresa">${esc(diag.empresa)}</p>` : ""}
      </div>
      ${complexBloco}
      ${secoes}
    </div>`;
  }

  function renderDiagnosticoTexto(diag) {
    const linhas = [diag.titulo];
    if (diag.empresa) linhas.push("Cliente: " + diag.empresa);
    const c = diag.complexidade;
    linhas.push("", "Complexidade preliminar: " + c.nivel, c.explicacao);
    if (c.fatores && c.fatores.length) linhas.push("Fatores: " + c.fatores.join("; "));
    diag.secoes.forEach((s, i) => {
      linhas.push("", String(i + 1).padStart(2, "0") + ". " + s.titulo);
      s.linhas.forEach((l) => linhas.push("  - " + l));
    });
    return linhas.join("\n");
  }

  function renderDiagnosticoEmailHTML(diag, opts) {
    opts = opts || {};
    const c = diag.complexidade;
    const cor = { Baixa: "#1f9d6b", "Média": "#c78a00", Alta: "#d1483a" }[c.nivel] || "#566674";
    const link = opts.adminUrl
      ? `<p style="margin:0 0 18px"><a href="${esc(opts.adminUrl)}" style="background:#0e56d0;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block;font-weight:600">Abrir no painel</a></p>` : "";
    const extra = opts.anexosInfo ? `<p style="color:#566674;font:13px Arial;margin:0 0 14px">${esc(opts.anexosInfo)}</p>` : "";
    const secoes = diag.secoes.map((s, i) => {
      const itens = s.linhas.map((l) => `<li style="margin:2px 0">${esc(l)}</li>`).join("");
      return `<div style="padding:12px 0;border-bottom:1px solid #eef2f6">
        <h3 style="font:600 15px Arial,sans-serif;color:#16283a;margin:0 0 6px">${String(i + 1).padStart(2, "0")}. ${esc(s.titulo)}</h3>
        <ul style="margin:0;padding-left:18px;color:#26333f;font:14px/1.5 Arial,sans-serif">${itens}</ul></div>`;
    }).join("");
    return `<div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;color:#16283a">
      <p style="font:600 12px Arial;letter-spacing:.1em;text-transform:uppercase;color:#10b5c9;margin:0 0 4px">Consistem · Indústria 4.0</p>
      <h2 style="font:700 20px Arial;margin:0 0 4px">${esc(diag.titulo)}</h2>
      ${diag.empresa ? `<p style="color:#566674;margin:0 0 16px">Cliente: <strong>${esc(diag.empresa)}</strong></p>` : ""}
      ${link}${extra}
      <div style="border:1px solid ${cor}33;background:${cor}11;border-radius:10px;padding:14px 16px;margin:0 0 14px">
        <span style="font:600 12px Arial;letter-spacing:.08em;text-transform:uppercase;color:#566674">Complexidade preliminar</span>
        <div style="font:700 22px Arial;color:${cor};margin:2px 0 6px">${esc(c.nivel)}</div>
        <p style="margin:0 0 8px;font:14px Arial;color:#26333f">${esc(c.explicacao)}</p>
        <ul style="margin:0;padding-left:18px;font:13px/1.5 Arial;color:#26333f">${c.fatores.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      </div>${secoes}</div>`;
  }

  return {
    STEPS, allFields, isActive, label, esc,
    gerarDiagnostico, classificarComplexidade,
    renderDiagnosticoHTML, renderDiagnosticoTexto, renderDiagnosticoEmailHTML,
  };
});
