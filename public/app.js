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
  var mediaStore = {}; // fotos/vídeos por item: mediaStore["maquinas"][idx] = [File,...]
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
          '<div class="hero-inner">' +
            '<p class="eyebrow">Consistem · Indústria 4.0</p>' +
            '<h1>Levantamento Inicial para Implantação</h1>' +
            '<ul class="facts">' +
              '<li><strong>' + STEPS.length + '</strong> etapas rápidas</li>' +
              '<li><strong>5–10</strong> minutos</li>' +
              '<li>Ao final, um <strong>diagnóstico</strong> resumido</li>' +
            '</ul>' +
          '</div>' +
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
    next.onclick = function () { if (validateStep(s)) advance(s); };
    nav.appendChild(next);

    card.appendChild(nav);
    page.appendChild(card);
    app.appendChild(page);

    hydrate(s);
    updateVisibility(s);
  }

  // Cria o HTML de um campo
  function renderField(f) {
    if (f.type === "repeater") return renderRepeater(f);
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

  // ---------------------------------------------------------- cadastro repetível
  function renderSubfield(repId, idx, sf, item) {
    var name = repId + "_" + idx + "_" + sf.id;
    var key = repId + ":" + idx + ":" + sf.id;
    var saved = item ? item[sf.id] : undefined;
    var control;
    if (sf.type === "radio") {
      control = '<div class="options">' + sf.options.map(function (o) {
        var c = saved === o ? " checked" : "";
        return '<label class="option"><input type="radio" name="' + name + '" data-sub="' + key + '" value="' + escAttr(o) + '"' + c + '><span>' + Q.esc(o) + '</span></label>';
      }).join("") + '</div>';
    } else if (sf.type === "checkbox") {
      var savedArr = Array.isArray(saved) ? saved : [];
      control = '<div class="options">' + sf.options.map(function (o) {
        var c = savedArr.indexOf(o) >= 0 ? " checked" : "";
        return '<label class="option"><input type="checkbox" name="' + name + '" data-sub="' + key + '" value="' + escAttr(o) + '"' + c + '><span>' + Q.esc(o) + '</span></label>';
      }).join("") + '</div>';
    } else if (sf.type === "textarea") {
      control = '<textarea data-sub="' + key + '" rows="2">' + Q.esc(saved || "") + '</textarea>';
    } else {
      var ph = sf.placeholder ? ' placeholder="' + escAttr(sf.placeholder) + '"' : "";
      control = '<input type="text" data-sub="' + key + '"' + ph + ' value="' + escAttr(saved || "") + '">';
    }
    return '<div class="subfield"><label>' + Q.esc(sf.label) + '</label>' + control + '</div>';
  }

  function itemSummary(f, item, idx, mediaCount) {
    var nome = item.nome || (f.itemLabel + " " + (idx + 1));
    var bits = [];
    f.subfields.forEach(function (sf) {
      if (sf.id === "nome") return;
      var v = item[sf.id];
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return;
      if (Array.isArray(v)) bits.push((sf.sum || sf.label) + ": " + v.join(", "));
      else bits.push(sf.sum ? sf.sum + ": " + v : v);
    });
    if (mediaCount) bits.push(mediaCount + (mediaCount > 1 ? " mídias" : " mídia"));
    return { nome: nome, sub: bits.join(" · ") };
  }

  function renderRepeater(f) {
    var items = answers[f.id] || (answers[f.id] = []);
    if (!mediaStore[f.id]) mediaStore[f.id] = [];
    var anyEditing = items.some(function (it) { return it._edit; });

    var cards = items.map(function (item, idx) {
      var mediaCount = (mediaStore[f.id][idx] || []).length;

      if (!item._edit) {
        var s = itemSummary(f, item, idx, mediaCount);
        return '<div class="rep-item saved">' +
          '<div class="rep-saved">' +
            '<div class="rep-saved-main"><span class="rep-saved-nome">' + Q.esc(s.nome) + '</span>' +
            (s.sub ? '<span class="rep-saved-sub">' + Q.esc(s.sub) + '</span>' : "") + '</div>' +
            '<div class="rep-saved-acts">' +
              '<button type="button" class="rep-edit" data-edit="' + f.id + ':' + idx + '">Editar</button>' +
              '<button type="button" class="rep-remove" data-remove="' + f.id + ':' + idx + '">Remover</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      var sub = f.subfields.map(function (sf) { return renderSubfield(f.id, idx, sf, item); }).join("");
      var media = f.media ?
        '<div class="rep-media">' +
          '<span class="rep-media-label">Fotos / vídeos desta ' + Q.esc(f.itemLabel.toLowerCase()) + '</span>' +
          '<div class="dropzone" data-drop="' + f.id + ':' + idx + '">' +
            '<input type="file" data-fileinput="' + f.id + ':' + idx + '" accept="image/*,video/*" multiple hidden>' +
            '<div class="dz-inner"><div class="dz-ico">+</div>' +
            '<p class="dz-text">Arraste aqui ou <span class="dz-link">toque para escolher</span></p></div>' +
          '</div>' +
          '<div class="file-list" data-filelist="' + f.id + ':' + idx + '"></div>' +
        '</div>' : "";
      return '<div class="rep-item editing">' +
        '<div class="rep-head"><span class="rep-title">' + Q.esc(f.itemLabel) + ' ' + (idx + 1) + '</span>' +
        '<button type="button" class="rep-remove" data-remove="' + f.id + ':' + idx + '">Remover</button></div>' +
        '<div class="rep-fields">' + sub + '</div>' + media +
        '<p class="rep-err" data-reperr="' + f.id + ':' + idx + '" hidden>Informe ao menos o nome.</p>' +
        '<div class="rep-item-actions"><button type="button" class="rep-save" data-save="' + f.id + ':' + idx + '">Salvar ' + Q.esc(f.itemLabel.toLowerCase()) + '</button></div>' +
      '</div>';
    }).join("");

    var addLabel = items.length ? "Adicionar mais " + f.itemLabel.toLowerCase() : "Adicionar " + f.itemLabel.toLowerCase();
    var addBtn = anyEditing ? "" : '<button type="button" class="rep-add" data-add="' + f.id + '">+ ' + Q.esc(addLabel) + '</button>';

    return el(
      '<div class="field repeater" data-field="' + f.id + '">' +
        '<label>' + Q.esc(f.label) + '</label>' +
        (f.help ? '<p class="help">' + Q.esc(f.help) + '</p>' : "") +
        '<div class="rep-items">' + cards + '</div>' + addBtn +
      '</div>'
    );
  }

  // Preenche valores salvos e liga os listeners
  function hydrate(s) {
    s.fields.forEach(function (f) {
      if (f.type === "info") return;
      if (f.type === "repeater") { wireRepeater(f); return; }
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

  // ------------------------------------------------ wiring do cadastro repetível
  function rerenderStep() { render(); }

  function wireRepeater(f) {
    if (!mediaStore[f.id]) mediaStore[f.id] = [];
    var addBtn = app.querySelector('[data-add="' + f.id + '"]');
    if (addBtn) addBtn.onclick = function () {
      (answers[f.id] = answers[f.id] || []).push({ _edit: true });
      (mediaStore[f.id] = mediaStore[f.id] || []).push([]);
      rerenderStep();
    };
    app.querySelectorAll('[data-remove^="' + f.id + ':"]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute("data-remove").split(":")[1], 10);
        answers[f.id].splice(idx, 1);
        if (mediaStore[f.id]) mediaStore[f.id].splice(idx, 1);
        rerenderStep();
      };
    });
    app.querySelectorAll('[data-edit^="' + f.id + ':"]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute("data-edit").split(":")[1], 10);
        answers[f.id][idx]._edit = true; rerenderStep();
      };
    });
    app.querySelectorAll('[data-save^="' + f.id + ':"]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute("data-save").split(":")[1], 10);
        f.subfields.forEach(function (sf) { writeSub(f, idx, sf.id); });
        var item = answers[f.id][idx];
        if (!item.nome || !String(item.nome).trim()) {
          var errEl = app.querySelector('[data-reperr="' + f.id + ':' + idx + '"]');
          if (errEl) errEl.hidden = false;
          return;
        }
        item._edit = false; rerenderStep();
      };
    });
    app.querySelectorAll('[data-sub^="' + f.id + ':"]').forEach(function (node) {
      var handler = function () {
        var parts = node.getAttribute("data-sub").split(":");
        writeSub(f, parseInt(parts[1], 10), parts[2]);
        var errEl = app.querySelector('[data-reperr="' + f.id + ':' + parts[1] + '"]');
        if (errEl) errEl.hidden = true;
      };
      node.addEventListener("input", handler);
      node.addEventListener("change", handler);
    });
    (answers[f.id] || []).forEach(function (it, idx) { if (it._edit) wireFile(f.id + ":" + idx); });
  }

  function writeSub(f, idx, sfid) {
    var sf = f.subfields.filter(function (x) { return x.id === sfid; })[0];
    var item = answers[f.id][idx];
    if (!sf || !item) return;
    var name = f.id + "_" + idx + "_" + sfid;
    if (sf.type === "checkbox") {
      item[sfid] = [].slice.call(app.querySelectorAll('input[name="' + name + '"]:checked')).map(function (n) { return n.value; });
    } else if (sf.type === "radio") {
      var sel = app.querySelector('input[name="' + name + '"]:checked');
      item[sfid] = sel ? sel.value : "";
    } else {
      var node = app.querySelector('[data-sub="' + f.id + ":" + idx + ":" + sfid + '"]');
      item[sfid] = node ? node.value : "";
    }
  }

  // ------------------------------------------------------------ upload de mídia
  function mediaArr(key) {
    var parts = key.split(":"), rep = parts[0], idx = parseInt(parts[1], 10);
    mediaStore[rep] = mediaStore[rep] || [];
    mediaStore[rep][idx] = mediaStore[rep][idx] || [];
    return mediaStore[rep][idx];
  }

  function wireFile(key) {
    var dz = app.querySelector('[data-drop="' + key + '"]');
    var input = app.querySelector('[data-fileinput="' + key + '"]');
    if (!dz || !input) return;
    dz.addEventListener("click", function () { input.click(); });
    dz.addEventListener("dragover", function (e) { e.preventDefault(); dz.classList.add("drag"); });
    dz.addEventListener("dragleave", function () { dz.classList.remove("drag"); });
    dz.addEventListener("drop", function (e) { e.preventDefault(); dz.classList.remove("drag"); addFiles(key, e.dataTransfer.files); });
    input.addEventListener("change", function () { addFiles(key, input.files); input.value = ""; });
    refreshFileList(key);
  }

  function addFiles(key, list) {
    var arrq = mediaArr(key), rejeitados = [];
    Array.prototype.forEach.call(list, function (file) {
      if (file.size > MAX_MB * 1024 * 1024) { rejeitados.push(file.name); return; }
      if (arrq.length >= 12) { rejeitados.push(file.name); return; }
      arrq.push(file);
    });
    refreshFileList(key);
    if (rejeitados.length) alert("Não adicionados (máx. " + MAX_MB + " MB cada, até 12 por item): " + rejeitados.join(", "));
  }

  function refreshFileList(key) {
    var list = app.querySelector('[data-filelist="' + key + '"]');
    if (!list) return;
    var arrq = mediaArr(key);
    list.innerHTML = "";
    arrq.forEach(function (file, i) {
      var chip = el('<div class="file-chip"><span class="fc-name">' + Q.esc(file.name) + '</span><span class="fc-size">' + fmtSize(file.size) + '</span><button type="button" class="fc-x" aria-label="Remover">×</button></div>');
      chip.querySelector(".fc-x").onclick = function () { arrq.splice(i, 1); refreshFileList(key); };
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

  // Remove itens de repeater totalmente vazios (sem dados e sem mídia)
  function pruneRepeaters(s) {
    s.fields.forEach(function (f) {
      if (f.type !== "repeater") return;
      var items = answers[f.id] || [];
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        var hasData = f.subfields.some(function (sf) {
          var v = it[sf.id];
          return v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
        });
        var hasMedia = mediaStore[f.id] && mediaStore[f.id][i] && mediaStore[f.id][i].length;
        if (!hasData && !hasMedia) { items.splice(i, 1); if (mediaStore[f.id]) mediaStore[f.id].splice(i, 1); }
      }
    });
  }

  // Cópia das respostas sem os marcadores internos (_edit etc.)
  function cleanAnswers() {
    var out = {};
    Object.keys(answers).forEach(function (k) {
      var v = answers[k];
      if (Array.isArray(v)) {
        out[k] = v.map(function (item) {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            var o = {}; Object.keys(item).forEach(function (kk) { if (kk.charAt(0) !== "_") o[kk] = item[kk]; }); return o;
          }
          return item;
        });
      } else out[k] = v;
    });
    return out;
  }

  function advance(s) {
    pruneRepeaters(s);
    if (step < STEPS.length - 1) { step++; render(); scrollTop(); }
    else { diag = Q.gerarDiagnostico(cleanAnswers()); mode = "review"; render(); scrollTop(); }
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
    fd.append("respostas", JSON.stringify(cleanAnswers()));
    Object.keys(mediaStore).forEach(function (rep) {
      (mediaStore[rep] || []).forEach(function (files, idx) {
        (files || []).forEach(function (file) { fd.append("midia_" + rep + "_" + idx, file, file.name); });
      });
    });
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
