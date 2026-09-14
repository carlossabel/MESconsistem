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
      title: "O que resolver",
      subtitle: "O principal que vocês querem atacar no chão de fábrica.",
      fields: [
        {
          id: "problema_principal",
          label: "Principais problemas hoje",
          help: "Marque quantos quiser.",
          type: "checkbox", required: true,
          options: [
            "Falta de informação em tempo real", "Paradas de máquina", "Baixa produtividade",
            "Apontamentos manuais", "Controle de eficiência (OEE)", "Refugo / perdas",
            "Rastreabilidade", "Qualidade", "Planejado x realizado", "Outros",
          ],
        },
      ],
    },

    // 3
    {
      title: "Parque e apontamentos",
      subtitle: "O tamanho da operação e como a produção é registrada.",
      fields: [
        { id: "qtd_linhas", label: "Linhas a monitorar", type: "number", min: 0, required: true },
        { id: "qtd_maquinas", label: "Máquinas (aprox.)", type: "number", min: 0, required: true },
        {
          id: "apont_como", label: "Como os apontamentos são feitos hoje?",
          type: "checkbox",
          options: ["Papel", "Planilha", "No ERP", "Sistema específico", "Terminal no chão de fábrica", "Automático pelas máquinas", "Não são feitos"],
        },
        { id: "paradas_registradas", label: "Os motivos de parada são registrados?", type: "radio", options: ["Sim", "Não"] },
        { id: "paradas_interesse", label: "Há interesse em passar a controlar os motivos de parada?", type: "radio", options: ["Sim", "Não"], showIf: (r) => val(r, "paradas_registradas") === "Não" },
      ],
    },

    // 4
    {
      title: "Máquinas e dados",
      subtitle: "O quanto as máquinas já conseguem se comunicar.",
      fields: [
        { id: "clp", label: "As máquinas possuem CLP?", type: "radio", required: true, options: ["Sim", "Algumas", "Não", "Não sabemos"] },
        { id: "clp_rede", label: "Há comunicação de rede disponível no CLP?", type: "radio", options: ["Sim", "Não", "Não sabemos"], showIf: (r) => inList(r, "clp", ["Sim", "Algumas"]) },
        { id: "coleta_auto", label: "Algum dado já é coletado automaticamente das máquinas?", type: "radio", required: true, options: ["Sim", "Não"] },
        {
          id: "coleta_desejada", label: "O que gostariam de coletar automaticamente?",
          type: "checkbox", showIf: (r) => val(r, "coleta_auto") === "Não",
          options: ["Máquina ligada/parada", "Produzindo", "Quantidade produzida", "Velocidade / ciclo", "Refugo", "Temperatura", "Alarmes", "Outros"],
        },
      ],
    },

    // 5
    {
      title: "Indicadores",
      subtitle: "O que vocês querem enxergar.",
      fields: [
        { id: "oee", label: "Hoje vocês calculam o OEE?", type: "radio", options: ["Sim", "Não", "Não conhecemos o indicador"] },
        {
          id: "tempo_real", label: "O que gostariam de ver em tempo real?",
          type: "checkbox", required: true,
          options: ["Status das máquinas", "Produção atual", "Planejado x realizado", "OEE", "Disponibilidade", "Performance", "Qualidade", "Paradas e motivos", "Refugo", "Alertas"],
        },
      ],
    },

    // 6
    {
      title: "Qualidade e infraestrutura",
      subtitle: "Rastreabilidade e a rede no chão de fábrica.",
      fields: [
        { id: "rastreab", label: "Precisam de rastreabilidade por lote?", type: "radio", options: ["Sim", "Não"] },
        {
          id: "rastreab_itens", label: "Rastrear o quê?",
          type: "checkbox", showIf: (r) => isYes(r, "rastreab"),
          options: ["Matéria-prima", "Lote", "Máquina", "Operador", "Data/hora", "Parâmetros do processo", "Validade"],
        },
        { id: "rede", label: "Existe rede próxima às máquinas?", type: "radio", required: true, options: ["Cabeada", "Wi-Fi", "Ambas", "Não", "Não sabemos"] },
        { id: "restricao_ti", label: "Há restrições de TI para conectar equipamentos?", type: "radio", options: ["Sim", "Não", "Não sabemos"] },
        { id: "restricao_ti_quais", label: "Quais restrições?", type: "text", showIf: (r) => isYes(r, "restricao_ti") },
      ],
    },

    // 7
    {
      title: "Time técnico e piloto",
      subtitle: "Quem apoia no acesso às máquinas e por onde começar.",
      fields: [
        { id: "autom_por", label: "A automação/elétrica das máquinas é feita por:", type: "radio", options: ["Equipe interna", "Terceiros", "Ambos"] },
        { id: "resp_tecnico", label: "Há um responsável técnico que pode nos apoiar no acesso a painéis e CLPs?", type: "radio", options: ["Sim", "Não"] },
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

    // 8
    {
      title: "Fotos e vídeos",
      subtitle: "Ajuda muito ver as máquinas, painéis e etiquetas. É opcional.",
      fields: [
        {
          id: "anexos", type: "file", label: "Fotos ou vídeos das máquinas",
          accept: "image/*,video/*", multiple: true,
          help: "Arraste aqui ou toque para escolher. Aceita imagens e vídeos (até 25 MB cada).",
        },
        { id: "midia_links", label: "Links de fotos/vídeos (opcional)", type: "textarea", placeholder: "Cole aqui links do Google Drive, YouTube, etc." },
        { id: "obs_final", label: "Observações (opcional)", type: "textarea" },
      ],
    },
  ];

  // Campos "de dado" (ignora info e file — file é tratado à parte no cliente)
  function allFields() {
    return STEPS.flatMap((s) => s.fields).filter((f) => f.type !== "info" && f.type !== "file");
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

    const clp = val(r, "clp");
    if (clp === "Não" || clp === "Não sabemos") add(2, "Situação dos CLPs indefinida ou inexistente");
    else if (clp === "Algumas") add(1, "Apenas parte das máquinas possui CLP");
    if (inList(r, "clp", ["Sim", "Algumas"]) && val(r, "clp_rede") !== "Sim") add(1, "Comunicação de rede no CLP não confirmada");

    if (val(r, "coleta_auto") === "Não") add(1, "Nenhum dado é coletado automaticamente hoje");

    const rede = val(r, "rede");
    if (rede === "Não" || rede === "Não sabemos") add(2, "Infraestrutura de rede ausente ou desconhecida");
    else if (rede === "Wi-Fi") add(0.5, "Rede apenas por Wi-Fi (avaliar estabilidade industrial)");

    if (isYes(r, "restricao_ti")) add(1, "Há restrições de TI para conexão à rede industrial");

    const nMaq = parseInt(val(r, "qtd_maquinas"), 10);
    if (!isNaN(nMaq)) { if (nMaq > 20) add(2, "Grande quantidade de máquinas"); else if (nMaq > 5) add(1, "Quantidade média de máquinas"); }
    const nLin = parseInt(val(r, "qtd_linhas"), 10);
    if (!isNaN(nLin) && nLin > 3) add(1, "Muitas linhas a monitorar");

    if (isYes(r, "rastreab")) add(1, "Necessidade de rastreabilidade por lote");
    if (val(r, "autom_por") === "Terceiros") add(1, "Automação mantida por terceiros (acesso depende de agenda externa)");
    if (val(r, "oee") !== "Sim") add(1, "OEE ainda não é calculado");
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

    S("Cenário atual", [
      `Empresa: ${txt("empresa")}.`,
      `Apontamento hoje: ${lista(arr(r, "apont_como"), "não informado")}.`,
      `Coleta automática de dados: ${txt("coleta_auto", "não informado")}.`,
    ]);
    S("Principais dores", [`${lista(arr(r, "problema_principal"))}.`]);
    S("Linhas e máquinas", [`Linhas: ${txt("qtd_linhas")} · Máquinas: ${txt("qtd_maquinas")}.`]);
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
      `CLP: ${txt("clp", "não informado")}.`,
      inList(r, "clp", ["Sim", "Algumas"]) ? `Comunicação de rede no CLP: ${txt("clp_rede", "não informado")}.` : "",
    ]);
    S("Dados a coletar automaticamente", [
      val(r, "coleta_auto") === "Sim" ? "Já há coleta automática hoje." : `Desejados: ${lista(arr(r, "coleta_desejada"), "a definir")}.`,
    ]);
    S("Qualidade e rastreabilidade", [
      `Rastreabilidade por lote: ${txt("rastreab", "não informado")}${isYes(r, "rastreab") ? " — " + lista(arr(r, "rastreab_itens"), "itens a definir") : ""}.`,
    ]);
    S("Infraestrutura", [
      `Rede próxima às máquinas: ${txt("rede", "não informado")}.`,
      `Restrições de TI: ${txt("restricao_ti", "não informado")}${isYes(r, "restricao_ti") && val(r, "restricao_ti_quais") ? " — " + val(r, "restricao_ti_quais") : ""}.`,
    ]);
    S("Time técnico", [
      `Automação/elétrica por: ${txt("autom_por", "não informado")}.`,
      isYes(r, "resp_tecnico")
        ? `Apoio técnico: ${txt("resp_tecnico_nome", "a indicar")}${val(r, "resp_tecnico_contato") ? " — " + val(r, "resp_tecnico_contato") : ""}.`
        : "Apoio técnico dedicado: não confirmado.",
    ]);
    S("Indicadores desejados", [
      `Tempo real: ${lista(arr(r, "tempo_real"), "a definir")}.`,
      `OEE hoje: ${txt("oee", "não informado")}.`,
    ]);
    const dadosPOC = val(r, "coleta_auto") === "Sim" ? "dados já disponíveis nas máquinas" : lista(arr(r, "coleta_desejada"), "status e produção");
    const via = inList(r, "clp", ["Sim", "Algumas"]) ? "coleta via CLP/rede existente" : "definição do método de coleta (CLP a avaliar)";
    S("Escopo sugerido para a POC", [
      `Provar o valor na linha/máquina "${txt("linha_piloto", "a definir")}", com ${via}.`,
      `Coletar: ${dadosPOC}.`,
      `Disponibilizar em tempo real: ${lista(arr(r, "tempo_real"), "status, produção e OEE")}.`,
      isYes(r, "rastreab") ? "Incluir rastreabilidade por lote." : "",
    ]);

    const pontos = [];
    if (val(r, "clp") === "Não" || val(r, "clp") === "Não sabemos") pontos.push("Confirmar existência e tipo de CLP nas máquinas.");
    if (inList(r, "clp", ["Sim", "Algumas"]) && val(r, "clp_rede") !== "Sim") pontos.push("Validar comunicação de rede dos CLPs.");
    if (val(r, "rede") === "Não" || val(r, "rede") === "Não sabemos") pontos.push("Prover/mapear a rede no chão de fábrica.");
    if (isYes(r, "restricao_ti")) pontos.push("Alinhar restrições de TI com a equipe do cliente.");
    if (val(r, "autom_por") === "Terceiros") pontos.push("Agendar apoio da automação terceirizada para acesso aos sinais.");
    if (val(r, "coleta_auto") === "Não") pontos.push("Definir sinais e variáveis a coletar automaticamente.");
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
