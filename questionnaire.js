/* ============================================================================
 *  QUESTIONÁRIO — Levantamento Inicial Indústria 4.0 Consistem
 *  ----------------------------------------------------------------------------
 *  Este arquivo roda TANTO no navegador quanto no servidor (Node), então a
 *  lógica de perguntas condicionais e a geração do diagnóstico ficam SEMPRE
 *  iguais nos dois lados.
 *
 *  Para editar o questionário, mexa apenas em STEPS (as etapas/perguntas).
 *  O diagnóstico final é montado por gerarDiagnostico() no fim do arquivo.
 *
 *  Tipos de campo (type):
 *    info      -> texto explicativo (não é pergunta)
 *    text | email | tel | number | date
 *    textarea
 *    select    -> lista suspensa (uma opção)      -> precisa de options
 *    radio     -> uma opção visível               -> precisa de options
 *    checkbox  -> várias opções (multi)           -> precisa de options
 *
 *  Campos: { id, label, type, required, options, placeholder, help, showIf }
 *    showIf: (r) => boolean   -> mostra a pergunta só quando a condição for
 *                                verdadeira (r = respostas já dadas).
 * ==========================================================================*/

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Questionario = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---- helpers de leitura das respostas ------------------------------------
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
  //  ETAPAS
  // =========================================================================
  const STEPS = [
    // ---- ETAPA 1 ----------------------------------------------------------
    {
      title: "Empresa e responsáveis",
      subtitle: "Para sabermos com quem vamos conversar durante o projeto.",
      fields: [
        { id: "empresa", label: "Empresa", type: "text", required: true },
        { id: "unidade", label: "Unidade / fábrica", type: "text" },
        { id: "responsavel", label: "Responsável pelo projeto", type: "text", required: true },
        { id: "cargo", label: "Cargo", type: "text" },
        { id: "email", label: "E-mail", type: "email", required: true },
        { id: "telefone", label: "Telefone", type: "tel", placeholder: "(47) 99999-9999" },
        {
          id: "problema_principal",
          label: "Qual é o principal problema que vocês querem resolver no chão de fábrica?",
          help: "Pode marcar mais de um.",
          type: "checkbox", required: true,
          options: [
            "Falta de informações em tempo real", "Paradas de máquinas", "Baixa produtividade",
            "Apontamentos manuais", "Falta de controle de eficiência", "Refugo / perdas",
            "Rastreabilidade", "Qualidade", "Planejamento versus realizado", "Outros",
          ],
        },
        {
          id: "expectativa",
          label: "O que vocês gostariam de enxergar ou controlar com a solução Indústria 4.0 que hoje não conseguem?",
          type: "textarea",
        },
      ],
    },

    // ---- ETAPA 2 ----------------------------------------------------------
    {
      title: "Linhas e máquinas",
      subtitle: "Uma visão geral do parque produtivo.",
      fields: [
        { id: "qtd_linhas", label: "Quantas linhas de produção gostariam de monitorar?", type: "number", min: 0, required: true },
        { id: "qtd_maquinas", label: "Quantas máquinas, aproximadamente?", type: "number", min: 0, required: true },
        { id: "linha_piloto", label: "Com qual linha ou máquina gostariam de iniciar um projeto piloto?", type: "text" },
        { id: "info_piloto", type: "info", label: "Sobre essa linha/máquina candidata ao piloto:" },
        { id: "piloto_nome", label: "Nome da linha", type: "text" },
        { id: "piloto_processo", label: "Processo realizado", type: "text" },
        { id: "piloto_qtd_maquinas", label: "Quantidade de máquinas na linha", type: "number", min: 0 },
        { id: "piloto_produtos", label: "Principais produtos fabricados", type: "text" },
      ],
    },

    // ---- ETAPA 3 ----------------------------------------------------------
    {
      title: "Apontamentos atuais",
      subtitle: "Como a produção é registrada hoje.",
      fields: [
        {
          id: "apont_como",
          label: "Como os apontamentos de produção são realizados atualmente?",
          help: "Pode marcar mais de uma forma.",
          type: "checkbox", required: true,
          options: [
            "Papel", "Planilha", "Diretamente no ERP", "Sistema específico",
            "Terminal no chão de fábrica", "Automaticamente pelas máquinas",
            "Não são realizados", "Outro",
          ],
        },
        {
          id: "apont_o_que",
          label: "Quais informações são apontadas atualmente?",
          type: "checkbox",
          options: [
            "Quantidade produzida", "Refugo", "Paradas", "Motivos das paradas", "Setup",
            "Tempos", "Operador", "Ordem de produção", "Lote", "Qualidade", "Outros",
          ],
        },
        {
          id: "paradas_registradas",
          label: "Os motivos das paradas são registrados?",
          type: "radio", required: true, options: ["Sim", "Não"],
        },
        // Se SIM:
        { id: "paradas_como", label: "Como são registrados?", type: "text", showIf: (r) => isYes(r, "paradas_registradas") },
        {
          id: "paradas_lista_padrao", label: "Existe uma lista padronizada de motivos?",
          type: "radio", options: ["Sim", "Não"], showIf: (r) => isYes(r, "paradas_registradas"),
        },
        // Se NÃO:
        {
          id: "paradas_interesse",
          label: "Existe interesse em começar a controlar os motivos das paradas?",
          type: "radio", options: ["Sim", "Não"], showIf: (r) => val(r, "paradas_registradas") === "Não",
        },
        { id: "obs_apont", label: "Observações (opcional)", type: "textarea" },
      ],
    },

    // ---- ETAPA 4 ----------------------------------------------------------
    {
      title: "Máquinas e automação",
      subtitle: "O quanto as máquinas já conseguem se comunicar.",
      fields: [
        {
          id: "clp", label: "As máquinas possuem CLP?",
          type: "radio", required: true, options: ["Sim", "Algumas", "Não", "Não sabemos"],
        },
        { id: "clp_fabricante", label: "Fabricante do CLP", type: "text", showIf: (r) => inList(r, "clp", ["Sim", "Algumas"]) },
        { id: "clp_modelo", label: "Modelo (se conhecido)", type: "text", showIf: (r) => inList(r, "clp", ["Sim", "Algumas"]) },
        {
          id: "clp_acesso", label: "Existe acesso ao programa / documentação do CLP?",
          type: "radio", options: ["Sim", "Não", "Não sabemos"], showIf: (r) => inList(r, "clp", ["Sim", "Algumas"]),
        },
        {
          id: "clp_rede", label: "Existe comunicação de rede disponível no CLP?",
          type: "radio", options: ["Sim", "Não", "Não sabemos"], showIf: (r) => inList(r, "clp", ["Sim", "Algumas"]),
        },
        {
          id: "coleta_auto", label: "Atualmente algum dado é coletado automaticamente das máquinas?",
          type: "radio", required: true, options: ["Sim", "Não"],
        },
        // Se SIM:
        { id: "coleta_quais", label: "Quais dados são coletados hoje?", type: "textarea", showIf: (r) => isYes(r, "coleta_auto") },
        // Se NÃO:
        {
          id: "coleta_desejada",
          label: "Quais dados gostariam de coletar automaticamente?",
          type: "checkbox", showIf: (r) => val(r, "coleta_auto") === "Não",
          options: [
            "Máquina ligada / desligada", "Máquina produzindo", "Máquina parada",
            "Quantidade produzida", "Velocidade", "Ciclo", "Refugo", "Temperatura",
            "Peso", "Pressão", "Alarmes", "Outros",
          ],
        },
      ],
    },

    // ---- ETAPA 5 ----------------------------------------------------------
    {
      title: "Produção e performance",
      subtitle: "Metas, padrões e indicadores.",
      fields: [
        { id: "meta_producao", label: "Existe meta de produção por máquina, linha ou produto?", type: "radio", options: ["Sim", "Não"] },
        { id: "ciclo_padrao", label: "Existe velocidade ou ciclo padrão por produto / máquina?", type: "radio", options: ["Sim", "Não"] },
        {
          id: "controles",
          label: "Hoje vocês controlam:",
          type: "checkbox",
          options: [
            "Produção planejada", "Produção realizada", "Tempo disponível", "Tempo produzindo",
            "Tempo parado", "Setup", "Refugo",
          ],
        },
        {
          id: "oee", label: "Atualmente calculam o OEE?",
          type: "radio", required: true, options: ["Sim", "Não", "Não conhecemos o indicador"],
        },
        { id: "oee_como", label: "Como o OEE é calculado hoje?", type: "textarea", showIf: (r) => isYes(r, "oee") },
        { id: "oee_onde", label: "Onde o OEE é acompanhado?", type: "text", showIf: (r) => isYes(r, "oee") },
      ],
    },

    // ---- ETAPA 6 ----------------------------------------------------------
    {
      title: "Operador",
      subtitle: "Como o operador interage com a produção.",
      fields: [
        {
          id: "op_recebe_op",
          label: "Como o operador recebe atualmente a Ordem de Produção?",
          type: "select",
          options: ["Papel impresso", "Pelo ERP / sistema", "Planilha", "Verbalmente", "Não recebe formalmente", "Outro"],
        },
        {
          id: "op_dispositivo",
          label: "Existe algum dispositivo próximo às máquinas?",
          type: "checkbox",
          options: ["Computador", "Tablet", "Terminal industrial", "IHM da própria máquina", "Nenhum"],
        },
        {
          id: "op_poderia_informar",
          label: "O operador poderia informar pelo dispositivo:",
          type: "checkbox",
          options: [
            "Início / fim da produção", "Motivo de parada", "Refugo", "Setup",
            "Problemas de qualidade", "Outras ocorrências",
          ],
        },
      ],
    },

    // ---- ETAPA 7 ----------------------------------------------------------
    {
      title: "Qualidade e rastreabilidade",
      subtitle: "Controles do processo e do produto.",
      fields: [
        { id: "rastreab", label: "Existe necessidade de controlar rastreabilidade por lote?", type: "radio", required: true, options: ["Sim", "Não"] },
        {
          id: "rastreab_itens",
          label: "O que precisa ser rastreado?",
          type: "checkbox", showIf: (r) => isYes(r, "rastreab"),
          options: [
            "Matéria-prima", "Lote produzido", "Máquina", "Operador", "Data / hora",
            "Parâmetros do processo", "Produto acabado",
          ],
        },
        {
          id: "qualidade_itens",
          label: "Quais informações de qualidade precisam ser coletadas?",
          type: "checkbox",
          options: ["Peso", "Temperatura", "Dimensões", "Inspeção visual", "Amostras", "Aprovação / reprovação", "Outros"],
        },
        {
          id: "alimentos_itens",
          label: "Controles específicos de indústria de alimentos (se aplicável)",
          type: "checkbox",
          options: ["Temperatura", "Peso", "Lote", "Validade", "Limpeza / sanitização", "Parâmetros críticos do processo"],
        },
        { id: "obs_qualidade", label: "Observações (opcional)", type: "textarea" },
      ],
    },

    // ---- ETAPA 8 ----------------------------------------------------------
    {
      title: "Informações em tempo real",
      subtitle: "O que vocês querem enxergar ao vivo, e quem vai usar.",
      fields: [
        {
          id: "tempo_real",
          label: "Quais informações gostariam de visualizar em tempo real?",
          type: "checkbox", required: true,
          options: [
            "Status das máquinas", "Produção atual", "Planejado x realizado", "Eficiência", "OEE",
            "Disponibilidade", "Performance", "Qualidade", "Paradas", "Motivos das paradas",
            "Refugo", "Produção por máquina", "Produção por linha", "Alertas", "Outros",
          ],
        },
        {
          id: "quem_usa",
          label: "Quem utilizará essas informações?",
          type: "checkbox",
          options: ["Operador", "Líder", "Supervisor", "PCP", "Manutenção", "Qualidade", "Gerência", "Diretoria"],
        },
      ],
    },

    // ---- ETAPA 9 ----------------------------------------------------------
    {
      title: "Infraestrutura",
      subtitle: "A rede disponível no chão de fábrica.",
      fields: [
        {
          id: "rede", label: "Existe rede disponível próxima às máquinas?",
          type: "radio", required: true, options: ["Rede cabeada", "Wi-Fi", "Ambas", "Não", "Não sabemos"],
        },
        { id: "restricao_ti", label: "Existem restrições de TI para conectar equipamentos à rede industrial?", type: "radio", options: ["Sim", "Não", "Não sabemos"] },
        { id: "restricao_ti_quais", label: "Quais restrições?", type: "textarea", showIf: (r) => isYes(r, "restricao_ti") },
      ],
    },

    // ---- ETAPA 10 ---------------------------------------------------------
    {
      title: "Manutenção e automação",
      subtitle: "Quem cuida das máquinas e quem pode nos apoiar tecnicamente.",
      fields: [
        { id: "manut_por", label: "A manutenção das máquinas é realizada por:", type: "radio", options: ["Equipe interna", "Terceiros", "Ambos"] },
        { id: "autom_por", label: "A parte elétrica / automação é realizada por:", type: "radio", options: ["Equipe interna", "Terceiros", "Ambos"] },
        {
          id: "resp_tecnico",
          label: "Existe um responsável técnico que poderá apoiar nossa equipe no acesso aos painéis elétricos, CLPs e sinais das máquinas?",
          type: "radio", required: true, options: ["Sim", "Não"],
        },
        { id: "resp_tecnico_nome", label: "Nome do responsável técnico", type: "text", showIf: (r) => isYes(r, "resp_tecnico") },
        { id: "resp_tecnico_funcao", label: "Função", type: "text", showIf: (r) => isYes(r, "resp_tecnico") },
        { id: "resp_tecnico_contato", label: "Telefone / e-mail", type: "text", showIf: (r) => isYes(r, "resp_tecnico") },
      ],
    },

    // ---- ETAPA 11 ---------------------------------------------------------
    {
      title: "Definição do piloto",
      subtitle: "Onde provar o valor da solução primeiro.",
      fields: [
        { id: "poc_linha", label: "Se escolhermos uma única linha ou máquina para provar o valor da solução, qual seria?", type: "text", required: true },
        { id: "poc_porque", label: "Por que essa linha / máquina seria uma boa candidata?", type: "textarea" },
        {
          id: "poc_resultados",
          label: "Quais resultados vocês esperariam obter com esse piloto?",
          type: "checkbox", required: true,
          options: [
            "Redução de paradas", "Aumento de produtividade", "OEE em tempo real",
            "Eliminação de apontamentos manuais", "Maior confiabilidade das informações",
            "Controle de refugo", "Rastreabilidade", "Melhor gestão da produção", "Outros",
          ],
        },
        { id: "obs_final", label: "Observações finais (opcional)", type: "textarea" },
      ],
    },
  ];

  // Lista plana de todos os campos "de verdade" (ignora info)
  function allFields() {
    return STEPS.flatMap((s) => s.fields).filter((f) => f.type !== "info");
  }

  // Um campo está ativo (deve ser validado / salvo) se não tem showIf ou se ele passa
  function isActive(field, respostas) {
    return typeof field.showIf !== "function" || field.showIf(respostas);
  }

  function label(id) {
    const f = allFields().find((x) => x.id === id);
    return f ? f.label : id;
  }

  // =========================================================================
  //  DIAGNÓSTICO — "Diagnóstico Inicial – Indústria 4.0 Consistem"
  // =========================================================================
  function classificarComplexidade(r) {
    let score = 0;
    const fatores = [];
    const add = (n, texto) => { score += n; if (texto) fatores.push(texto); };

    const clp = val(r, "clp");
    if (clp === "Não" || clp === "Não sabemos") add(2, "Situação dos CLPs indefinida ou inexistente");
    else if (clp === "Algumas") add(1, "Apenas parte das máquinas possui CLP");

    if (inList(r, "clp", ["Sim", "Algumas"]) && val(r, "clp_rede") !== "Sim")
      add(1, "Comunicação de rede no CLP não confirmada");
    if (inList(r, "clp", ["Sim", "Algumas"]) && val(r, "clp_acesso") === "Não")
      add(1, "Sem acesso ao programa / documentação do CLP");

    if (val(r, "coleta_auto") === "Não") add(1, "Nenhum dado é coletado automaticamente hoje");

    const rede = val(r, "rede");
    if (rede === "Não" || rede === "Não sabemos") add(2, "Infraestrutura de rede ausente ou desconhecida no chão de fábrica");
    else if (rede === "Wi-Fi") add(0.5, "Rede apenas por Wi-Fi (avaliar estabilidade industrial)");

    if (isYes(r, "restricao_ti")) add(1, "Há restrições de TI para conexão à rede industrial");

    const nMaq = parseInt(val(r, "qtd_maquinas"), 10);
    if (!isNaN(nMaq)) { if (nMaq > 20) add(2, "Grande quantidade de máquinas"); else if (nMaq > 5) add(1, "Quantidade média de máquinas"); }
    const nLinhas = parseInt(val(r, "qtd_linhas"), 10);
    if (!isNaN(nLinhas) && nLinhas > 3) add(1, "Muitas linhas a monitorar");

    if (isYes(r, "rastreab")) add(1, "Necessidade de rastreabilidade por lote");
    if (inList(r, "autom_por", ["Terceiros"])) add(1, "Automação mantida por terceiros (acesso pode depender de agenda externa)");

    if (val(r, "oee") !== "Sim") add(1, "OEE ainda não é calculado / acompanhado");
    if (val(r, "paradas_registradas") === "Não") add(0.5, "Motivos de parada não são registrados hoje");

    let nivel = "Baixa";
    if (score > 5.5) nivel = "Alta";
    else if (score >= 3) nivel = "Média";

    let explicacao;
    if (nivel === "Baixa")
      explicacao = "O ambiente já apresenta boa parte das condições técnicas (comunicação das máquinas e infraestrutura), o que favorece uma POC rápida.";
    else if (nivel === "Média")
      explicacao = "O projeto é viável, mas alguns pontos técnicos precisam ser preparados antes ou durante a POC, como comunicação das máquinas e infraestrutura.";
    else
      explicacao = "Há dependências técnicas relevantes a resolver (comunicação das máquinas, infraestrutura e/ou acessos), que exigem uma fase de preparação antes da coleta automática.";

    return { nivel, fatores: fatores.length ? fatores : ["Sem fatores de risco relevantes identificados"], explicacao, score };
  }

  function gerarDiagnostico(r) {
    const listaOu = (a, vazio) => (a && a.length ? a.join(", ") : vazio || "Não informado");
    const txt = (id, vazio) => (val(r, id) ? val(r, id) : vazio || "Não informado");

    const secoes = [];
    const S = (titulo, linhas) => secoes.push({ titulo, linhas: linhas.filter(Boolean) });

    // 1. Cenário atual
    S("Cenário atual do cliente", [
      `Empresa: ${txt("empresa")}${val(r, "unidade") ? " — unidade " + val(r, "unidade") : ""}.`,
      `Apontamento de produção hoje: ${listaOu(arr(r, "apont_como"), "não informado")}.`,
      `Coleta automática de dados das máquinas: ${txt("coleta_auto", "não informado")}.`,
    ]);

    // 2. Dores
    S("Principais dores identificadas", [
      `Problemas apontados: ${listaOu(arr(r, "problema_principal"))}.`,
      val(r, "expectativa") ? `Expectativa: ${val(r, "expectativa")}` : "",
    ]);

    // 3. Linhas e máquinas
    S("Quantidade de linhas e máquinas", [
      `Linhas a monitorar: ${txt("qtd_linhas")}.`,
      `Máquinas (aprox.): ${txt("qtd_maquinas")}.`,
    ]);

    // 4. Piloto recomendado
    const pilotoNome = val(r, "poc_linha") || val(r, "linha_piloto") || val(r, "piloto_nome");
    S("Linha / máquina recomendada para o piloto", [
      `Candidata indicada pelo cliente: ${pilotoNome || "a definir"}.`,
      val(r, "piloto_processo") ? `Processo: ${val(r, "piloto_processo")}.` : "",
      val(r, "poc_porque") ? `Justificativa: ${val(r, "poc_porque")}` : "",
    ]);

    // 5. Apontamentos
    S("Situação atual dos apontamentos", [
      `Formas de apontamento: ${listaOu(arr(r, "apont_como"))}.`,
      `Informações apontadas: ${listaOu(arr(r, "apont_o_que"), "não detalhado")}.`,
      `Motivos de parada registrados: ${txt("paradas_registradas", "não informado")}${
        val(r, "paradas_registradas") === "Não" && val(r, "paradas_interesse")
          ? ` (interesse em controlar: ${val(r, "paradas_interesse")})`
          : val(r, "paradas_lista_padrao") ? ` (lista padronizada: ${val(r, "paradas_lista_padrao")})` : ""
      }.`,
    ]);

    // 6. Comunicação das máquinas
    S("Capacidade de comunicação das máquinas", [
      `CLP: ${txt("clp", "não informado")}.`,
      inList(r, "clp", ["Sim", "Algumas"]) ? `Fabricante: ${txt("clp_fabricante", "não informado")}${val(r, "clp_modelo") ? " (" + val(r, "clp_modelo") + ")" : ""}.` : "",
      inList(r, "clp", ["Sim", "Algumas"]) ? `Comunicação de rede no CLP: ${txt("clp_rede", "não informado")}; acesso a programa/documentação: ${txt("clp_acesso", "não informado")}.` : "",
    ]);

    // 7. Dados que poderão ser coletados
    const dadosColeta = val(r, "coleta_auto") === "Sim"
      ? `Já coletados hoje: ${txt("coleta_quais", "não detalhado")}.`
      : `Desejados para coleta automática: ${listaOu(arr(r, "coleta_desejada"), "a definir")}.`;
    S("Dados que poderão ser coletados automaticamente", [dadosColeta]);

    // 8. Interação do operador
    S("Necessidades de interação do operador", [
      `Como recebe a OP hoje: ${txt("op_recebe_op", "não informado")}.`,
      `Dispositivos próximos às máquinas: ${listaOu(arr(r, "op_dispositivo"), "nenhum informado")}.`,
      `Operador poderia informar: ${listaOu(arr(r, "op_poderia_informar"), "a definir")}.`,
    ]);

    // 9. Qualidade e rastreabilidade
    S("Necessidades de qualidade e rastreabilidade", [
      `Rastreabilidade por lote: ${txt("rastreab", "não informado")}${isYes(r, "rastreab") ? " — rastrear: " + listaOu(arr(r, "rastreab_itens"), "a definir") : ""}.`,
      arr(r, "qualidade_itens").length ? `Qualidade a coletar: ${listaOu(arr(r, "qualidade_itens"))}.` : "",
      arr(r, "alimentos_itens").length ? `Controles de alimentos: ${listaOu(arr(r, "alimentos_itens"))}.` : "",
    ]);

    // 10. Infraestrutura
    S("Infraestrutura disponível", [
      `Rede próxima às máquinas: ${txt("rede", "não informado")}.`,
      `Restrições de TI: ${txt("restricao_ti", "não informado")}${isYes(r, "restricao_ti") && val(r, "restricao_ti_quais") ? " — " + val(r, "restricao_ti_quais") : ""}.`,
    ]);

    // 11. Responsáveis técnicos
    S("Responsáveis técnicos", [
      `Responsável pelo projeto: ${txt("responsavel")}${val(r, "cargo") ? " (" + val(r, "cargo") + ")" : ""} — ${txt("email")}.`,
      isYes(r, "resp_tecnico")
        ? `Apoio técnico (painéis/CLPs): ${txt("resp_tecnico_nome", "a indicar")}${val(r, "resp_tecnico_funcao") ? ", " + val(r, "resp_tecnico_funcao") : ""}${val(r, "resp_tecnico_contato") ? " — " + val(r, "resp_tecnico_contato") : ""}.`
        : "Apoio técnico dedicado para painéis/CLPs: não confirmado.",
      `Manutenção por: ${txt("manut_por", "não informado")}; automação por: ${txt("autom_por", "não informado")}.`,
    ]);

    // 12. Indicadores desejados
    S("Indicadores desejados", [
      `Em tempo real: ${listaOu(arr(r, "tempo_real"), "a definir")}.`,
      `OEE hoje: ${txt("oee", "não informado")}.`,
      arr(r, "quem_usa").length ? `Público das informações: ${listaOu(arr(r, "quem_usa"))}.` : "",
    ]);

    // 13. Escopo sugerido para POC
    const dadosPOC = val(r, "coleta_auto") === "Sim" ? txt("coleta_quais", "dados de produção") : listaOu(arr(r, "coleta_desejada"), "status e produção");
    const via = inList(r, "clp", ["Sim", "Algumas"]) ? "coleta via CLP/rede existente" : "definição do método de coleta (CLP a avaliar)";
    S("Escopo sugerido para uma POC", [
      `Aplicar a solução na linha/máquina "${pilotoNome || "a definir"}", com ${via}.`,
      `Coletar automaticamente: ${dadosPOC}.`,
      `Disponibilizar em tempo real: ${listaOu(arr(r, "tempo_real"), "status, produção e OEE")}.`,
      arr(r, "op_poderia_informar").length ? `Apontamento do operador via dispositivo para: ${listaOu(arr(r, "op_poderia_informar"))}.` : "",
      isYes(r, "rastreab") ? "Incluir rastreabilidade por lote conforme itens indicados." : "",
    ]);

    // 14. Pontos a validar
    const pontos = [];
    if (val(r, "clp") === "Não" || val(r, "clp") === "Não sabemos") pontos.push("Confirmar existência e tipo de CLP nas máquinas.");
    if (inList(r, "clp", ["Sim", "Algumas"]) && val(r, "clp_rede") !== "Sim") pontos.push("Validar comunicação de rede dos CLPs.");
    if (inList(r, "clp", ["Sim", "Algumas"]) && val(r, "clp_acesso") === "Não") pontos.push("Obter acesso ao programa/documentação dos CLPs.");
    if (val(r, "rede") === "Não" || val(r, "rede") === "Não sabemos") pontos.push("Prover/mapear infraestrutura de rede no chão de fábrica.");
    if (isYes(r, "restricao_ti")) pontos.push("Alinhar com a TI as restrições de conexão à rede industrial.");
    if (inList(r, "autom_por", ["Terceiros"])) pontos.push("Agendar apoio da automação terceirizada para acesso aos sinais.");
    if (val(r, "coleta_auto") === "Não") pontos.push("Definir sinais e variáveis a coletar automaticamente.");
    if (val(r, "paradas_registradas") === "Não") pontos.push("Definir lista padronizada de motivos de parada.");
    if (!pontos.length) pontos.push("Nenhum bloqueio técnico crítico identificado; validar detalhes na visita técnica.");
    S("Pontos técnicos que ainda precisam ser validados", pontos);

    return {
      titulo: "Diagnóstico Inicial – Indústria 4.0 Consistem",
      empresa: val(r, "empresa"),
      secoes,
      complexidade: classificarComplexidade(r),
    };
  }

  // Renderiza o diagnóstico em HTML.
  //   opts.interno = true  -> mostra complexidade e "pontos a validar" (visão Consistem/admin)
  //   opts.interno = false -> visão do cliente (recap dos dados, sem julgamentos internos)
  function renderDiagnosticoHTML(diag, opts) {
    const interno = !opts || opts.interno !== false;
    const c = diag.complexidade;
    const nivelClass = { Baixa: "baixa", "Média": "media", Alta: "alta" }[c.nivel] || "media";

    const secoes = diag.secoes
      .filter((s) => interno || s.titulo !== "Pontos técnicos que ainda precisam ser validados")
      .map(
        (s, i) => `
      <section class="diag-sec">
        <h3><span class="diag-n">${String(i + 1).padStart(2, "0")}</span> ${esc(s.titulo)}</h3>
        <ul>${s.linhas.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      </section>`
      )
      .join("");

    const complexBloco = interno
      ? `<div class="complex ${nivelClass}">
          <span class="complex-label">Complexidade preliminar</span>
          <span class="complex-nivel">${esc(c.nivel)}</span>
          <p class="complex-exp">${esc(c.explicacao)}</p>
          <ul class="complex-fatores">${c.fatores.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        </div>`
      : "";

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

  return {
    STEPS,
    allFields,
    isActive,
    label,
    esc,
    gerarDiagnostico,
    classificarComplexidade,
    renderDiagnosticoHTML,
  };
});
