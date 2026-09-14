/* Wizard do Levantamento Inicial – Indústria 4.0 Consistem (client-side) */
(function () {
  "use strict";
  var Q = window.Questionario;
  var app = document.getElementById("app");
  var STEPS = Q.STEPS;
  var answers = {};
  var step = 0;
  var mode = "intro"; // intro | steps | review | done
  var diag = null;
  var arquivos = [];  // fotos/vídeos selecionados (persistem entre etapas)
  var MAX_MB = 25;

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  function escAttr(v) { return Q.esc(v); }

  // ------------------------------------------------------------------ render
  function render() {
    app.innerHTML = "";
    if (mode === "intro") return renderIntro();
    if (mode === "review") return renderReview();
    if (mode === "done") return renderDone();
    return renderStep();
  }

  function renderIntro() {
    var fases = [
      { n: "01", nome: "Monitorar", texto: "Conectamos as máquinas e iniciamos a coleta automática de dados de produção, paradas e desempenho. Uma implantação pouco intrusiva, sem alterar a rotina atual da operação." },
      { n: "02", nome: "Integrar", texto: "Integramos máquinas, ERP e operadores, relacionando os dados às ordens de produção. Entram apontamentos, motivos de parada, refugo, planejado × realizado, eficiência e OEE." },
      { n: "03", nome: "Otimizar", texto: "Transformamos os dados em gestão e ação, com gestão à vista em TVs e dashboards, alertas, qualidade, rastreabilidade, automações e inteligência, apoiando a melhoria contínua da operação." },
    ];
    var fasesHTML = fases.map(function (f) {
      return '<article class="fase">' +
        '<span class="fase-n">Fase ' + f.n + '</span>' +
        '<h3>' + f.nome + '</h3>' +
        '<p>' + f.texto + '</p>' +
      '</article>';
    }).join("");

    app.appendChild(el(
      '<main class="page intro-page">' +
        '<div class="hero">' +
          '<p class="eyebrow">Consistem · Indústria 4.0</p>' +
          '<h1>Levantamento Inicial para Implantação</h1>' +
          '<p class="lead">Uma conversa técnica guiada para entendermos seu ambiente industrial, ' +
          'escolhermos uma linha para um projeto piloto e prepararmos uma proposta sob medida.</p>' +
          '<ul class="facts">' +
            '<li><strong>' + STEPS.length + '</strong> etapas rápidas</li>' +
            '<li><strong>5–10</strong> minutos</li>' +
            '<li>Ao final, um <strong>diagnóstico</strong> resumido</li>' +
          '</ul>' +
        '</div>' +
        '<section class="jornada">' +
          '<div class="jornada-head">' +
            '<p class="eyebrow">Como funciona</p>' +
            '<h2>Jornada de Implantação</h2>' +
          '</div>' +
          '<div class="fases">' + fasesHTML + '</div>' +
          '<p class="jornada-foot">Começamos com baixo impacto, conectamos os processos e evoluímos ' +
          'para uma fábrica cada vez mais visível, integrada e eficiente.</p>' +
        '</section>' +
        '<div class="intro-cta">' +
          '<button class="btn lg" id="start">Começar o levantamento</button>' +
        '</div>' +
      '</main>'
    ));
    document.getElementById("start").onclick = function () { mode = "steps"; step = 0; render(); scrollTop(); };
  }

  function renderStep() {
    var s = STEPS[step];
    var total = STEPS.length;
    var pct = Math.round(((step) / total) * 100);

    var page = el('<main class="page wizard"></main>');

    // progresso
    page.appendChild(el(
      '<div class="progress">' +
        '<div class="progress-top"><span class="eyebrow">Consistem · Indústria 4.0</span>' +
        '<span class="stepcount">Etapa ' + (step + 1) + ' de ' + total + '</span></div>' +
        '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
      '</div>'
    ));

    var card = el('<section class="step-card"></section>');
    card.appendChild(el('<h2 class="step-title">' + Q.esc(s.title) + '</h2>'));
    if (s.subtitle) card.appendChild(el('<p class="step-sub">' + Q.esc(s.subtitle) + '</p>'));

    var form = el('<div class="fields"></div>');
    s.fields.forEach(function (f) { form.appendChild(renderField(f)); });
    card.appendChild(form);

    var nav = el('<div class="nav"></div>');
    if (step > 0) {
      var back = el('<button class="btn ghost" type="button">Voltar</button>');
      back.onclick = function () { step--; render(); scrollTop(); };
      nav.appendChild(back);
    } else { nav.appendChild(el('<span></span>')); }

    var next = el('<button class="btn" type="button">' + (step === total - 1 ? "Ver diagnóstico" : "Continuar") + '</button>');
    next.onclick = function () { if (validateStep(s)) advance(); };
    nav.appendChild(next);

    card.appendChild(nav);
    page.appendChild(card);
    app.appendChild(page);

    hydrate(s);
    updateVisibility(s);
  }

  // Cria o HTML de um campo
  function renderField(f) {
    if (f.type === "info") {
      return el('<div class="field-info" data-fid="' + f.id + '"><p class="subhead">' + Q.esc(f.label) + '</p></div>');
    }

    var req = f.required ? ' <span class="req">*</span>' : "";
    var help = f.help ? '<p class="help">' + Q.esc(f.help) + '</p>' : "";
    var control = "";
    var id = f.id;

    if (f.type === "textarea") {
      control = '<textarea id="' + id + '" data-fid="' + id + '" rows="3"></textarea>';
    } else if (f.type === "select") {
      control = '<select id="' + id + '" data-fid="' + id + '"><option value="">Selecione...</option>' +
        f.options.map(function (o) { return '<option value="' + escAttr(o) + '">' + Q.esc(o) + '</option>'; }).join("") + '</select>';
    } else if (f.type === "radio") {
      control = '<div class="options">' + f.options.map(function (o) {
        return '<label class="option"><input type="radio" name="' + id + '" data-fid="' + id + '" value="' + escAttr(o) + '"><span>' + Q.esc(o) + '</span></label>';
      }).join("") + '</div>';
    } else if (f.type === "checkbox") {
      control = '<div class="options">' + f.options.map(function (o) {
        return '<label class="option"><input type="checkbox" name="' + id + '" data-fid="' + id + '" value="' + escAttr(o) + '"><span>' + Q.esc(o) + '</span></label>';
      }).join("") + '</div>';
    } else if (f.type === "file") {
      control =
        '<div class="dropzone" data-drop="' + id + '">' +
          '<input type="file" data-fileinput="' + id + '" accept="' + escAttr(f.accept || "") + '"' + (f.multiple ? " multiple" : "") + ' hidden>' +
          '<div class="dz-inner"><div class="dz-ico">+</div>' +
          '<p class="dz-text">Arraste aqui ou <span class="dz-link">toque para escolher</span></p></div>' +
        '</div>' +
        '<div class="file-list" data-filelist="' + id + '"></div>';
    } else {
      var type = ["email", "tel", "number", "date"].indexOf(f.type) >= 0 ? f.type : "text";
      var extra = (f.min != null ? ' min="' + escAttr(f.min) + '"' : "") + (f.placeholder ? ' placeholder="' + escAttr(f.placeholder) + '"' : "");
      control = '<input type="' + type + '" id="' + id + '" data-fid="' + id + '"' + extra + '>';
    }

    var wrap = el(
      '<div class="field" data-field="' + id + '"' + (f.showIf ? ' data-cond="1"' : "") + '>' +
        '<label for="' + id + '">' + Q.esc(f.label) + req + '</label>' + help + control +
        '<p class="err" hidden>Campo obrigatório.</p>' +
      '</div>'
    );
    return wrap;
  }

  // Preenche valores salvos e liga os listeners
  function hydrate(s) {
    s.fields.forEach(function (f) {
      if (f.type === "info") return;
      if (f.type === "file") { wireFile(f); return; }
      var saved = answers[f.id];
      var nodes = app.querySelectorAll('[data-fid="' + f.id + '"]');

      if (f.type === "radio" || f.type === "checkbox") {
        nodes.forEach(function (n) {
          if (f.type === "checkbox") n.checked = Array.isArray(saved) && saved.indexOf(n.value) >= 0;
          else n.checked = saved === n.value;
          n.addEventListener("change", function () { collect(f); clearErr(f.id); updateVisibility(s); });
        });
      } else {
        var node = nodes[0];
        if (node && saved != null) node.value = saved;
        if (node) {
          node.addEventListener("input", function () { collect(f); clearErr(f.id); });
          node.addEventListener("change", function () { collect(f); clearErr(f.id); updateVisibility(s); });
        }
      }
    });
  }

  // ------------------------------------------------------------ upload de mídia
  function wireFile(f) {
    var dz = app.querySelector('[data-drop="' + f.id + '"]');
    var input = app.querySelector('[data-fileinput="' + f.id + '"]');
    if (!dz || !input) return;
    dz.addEventListener("click", function () { input.click(); });
    dz.addEventListener("dragover", function (e) { e.preventDefault(); dz.classList.add("drag"); });
    dz.addEventListener("dragleave", function () { dz.classList.remove("drag"); });
    dz.addEventListener("drop", function (e) { e.preventDefault(); dz.classList.remove("drag"); addFiles(f.id, e.dataTransfer.files); });
    input.addEventListener("change", function () { addFiles(f.id, input.files); input.value = ""; });
    refreshFileList(f.id);
  }

  function addFiles(id, list) {
    var rejeitados = [];
    Array.prototype.forEach.call(list, function (file) {
      if (file.size > MAX_MB * 1024 * 1024) { rejeitados.push(file.name); return; }
      if (arquivos.length >= 12) { rejeitados.push(file.name); return; }
      arquivos.push(file);
    });
    refreshFileList(id);
    if (rejeitados.length) alert("Não adicionados (máx. " + MAX_MB + " MB cada, até 12 arquivos): " + rejeitados.join(", "));
  }

  function refreshFileList(id) {
    var list = app.querySelector('[data-filelist="' + id + '"]');
    if (!list) return;
    list.innerHTML = "";
    arquivos.forEach(function (file, i) {
      var chip = el('<div class="file-chip"><span class="fc-name">' + Q.esc(file.name) + '</span><span class="fc-size">' + fmtSize(file.size) + '</span><button type="button" class="fc-x" aria-label="Remover">×</button></div>');
      chip.querySelector(".fc-x").onclick = function () { arquivos.splice(i, 1); refreshFileList(id); };
      list.appendChild(chip);
    });
  }

  function fmtSize(b) {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return Math.round(b / 1024) + " KB";
    return (b / (1024 * 1024)).toFixed(1) + " MB";
  }

  function collect(f) {
    var nodes = app.querySelectorAll('[data-fid="' + f.id + '"]');
    if (f.type === "checkbox") {
      var vals = [];
      nodes.forEach(function (n) { if (n.checked) vals.push(n.value); });
      answers[f.id] = vals;
    } else if (f.type === "radio") {
      var v = "";
      nodes.forEach(function (n) { if (n.checked) v = n.value; });
      answers[f.id] = v;
    } else {
      answers[f.id] = nodes[0] ? nodes[0].value : "";
    }
  }

  // Mostra/esconde campos condicionais
  function updateVisibility(s) {
    s.fields.forEach(function (f) {
      if (!f.showIf) return;
      var node = app.querySelector('[data-field="' + f.id + '"]');
      if (!node) return;
      var show = f.showIf(answers);
      node.classList.toggle("hidden", !show);
      if (!show) { // limpa valor escondido para não validar/salvar
        if (f.type === "checkbox") answers[f.id] = [];
        else answers[f.id] = "";
        app.querySelectorAll('[data-fid="' + f.id + '"]').forEach(function (n) {
          if (n.type === "checkbox" || n.type === "radio") n.checked = false; else n.value = "";
        });
        clearErr(f.id);
      }
    });
  }

  function clearErr(id) {
    var node = app.querySelector('[data-field="' + id + '"]');
    if (node) { node.classList.remove("invalid"); var e = node.querySelector(".err"); if (e) e.hidden = true; }
  }

  function validateStep(s) {
    var firstBad = null;
    s.fields.forEach(function (f) {
      if (f.type === "info" || !f.required) return;
      if (f.showIf && !f.showIf(answers)) return; // escondido não valida
      collect(f);
      var v = answers[f.id];
      var empty = v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");
      var node = app.querySelector('[data-field="' + f.id + '"]');
      if (empty) {
        if (node) { node.classList.add("invalid"); var e = node.querySelector(".err"); if (e) e.hidden = false; }
        if (!firstBad) firstBad = node;
      }
    });
    if (firstBad) { firstBad.scrollIntoView({ behavior: "smooth", block: "center" }); return false; }
    return true;
  }

  function advance() {
    if (step < STEPS.length - 1) { step++; render(); scrollTop(); }
    else { diag = Q.gerarDiagnostico(answers); mode = "review"; render(); scrollTop(); }
  }

  // ------------------------------------------------------------ review/done
  function renderReview() {
    var page = el('<main class="page result"></main>');
    page.appendChild(el(Q.renderDiagnosticoHTML(diag, { interno: false })));

    var nav = el('<div class="nav result-nav"></div>');
    var back = el('<button class="btn ghost" type="button">Revisar respostas</button>');
    back.onclick = function () { mode = "steps"; step = STEPS.length - 1; render(); scrollTop(); };
    var send = el('<button class="btn" type="button" id="send">Confirmar e enviar</button>');
    send.onclick = enviar;
    nav.appendChild(back); nav.appendChild(send);
    page.appendChild(el('<p class="review-note">Confira o resumo acima. Ao enviar, nossa equipe recebe seu levantamento e entra em contato.</p>'));
    page.appendChild(nav);
    app.appendChild(page);
  }

  function enviar() {
    var btn = document.getElementById("send");
    btn.disabled = true; btn.textContent = "Enviando...";
    var fd = new FormData();
    fd.append("respostas", JSON.stringify(answers));
    arquivos.forEach(function (file) { fd.append("anexos", file, file.name); });
    fetch("/enviar", { method: "POST", body: fd })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.ok) { mode = "done"; render(); scrollTop(); }
        else {
          btn.disabled = false; btn.textContent = "Confirmar e enviar";
          alert(res.j.faltando ? "Faltam campos: " + res.j.faltando.join(", ") : (res.j.erro || "Não foi possível enviar."));
        }
      }).catch(function () {
        btn.disabled = false; btn.textContent = "Confirmar e enviar";
        alert("Falha de conexão. Tente novamente.");
      });
  }

  function renderDone() {
    var page = el('<main class="page result"></main>');
    page.appendChild(el(
      '<div class="done-banner"><div class="check">✓</div>' +
      '<h1>Levantamento enviado</h1>' +
      '<p>Obrigado! Recebemos suas informações e nossa equipe vai preparar o próximo passo.</p>' +
      '<button class="btn ghost" type="button" id="print">Imprimir / salvar em PDF</button></div>'
    ));
    page.appendChild(el(Q.renderDiagnosticoHTML(diag, { interno: false })));
    app.appendChild(page);
    document.getElementById("print").onclick = function () { window.print(); };
  }

  function scrollTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

  render();
})();
