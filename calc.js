/* calc.js — Controlador de la Calculadora "¿Tu receta deja ganancia?"
   UI + i18n + embudo. La matemática vive en calc-scoring.js (window.RecetaCalc).
   Escritura a Supabase y captura a Kit son FAIL-SOFT: si fallan, la repostera
   igual ve su resultado. Nunca rompemos la experiencia por la red. */

(function () {
  "use strict";

  /* =========================================================================
     CONFIG — swaps de una línea (ver references/calculadora-spec.md §9)
     ========================================================================= */
  var SUPABASE_URL = "https://fntomjrmxqdtumonryfy.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_HiZZOWzTFBPm7WS97CZXfA_kzkdi6EM";  // publishable key (pública por diseño; tablas solo-INSERT)
  var KIT_FORM_ID = "9590805";                      // Kit form "Calculadora" (campo email_address)

  var Calc = window.RecetaCalc;
  var VALOR_HORA_SUG = (Calc && Calc.SUGERENCIA_VALOR_HORA) || 5;

  /* =========================================================================
     i18n
     ========================================================================= */
  var I18N = {
    es: {
      "meta.title": "¿Tu receta deja ganancia? · Calculadora gratis · Modo Repostera",
      "meta.desc": "Calcula gratis si tu receta te deja ganancia: mete lo que te cuesta y lo que cobras, y mira tu margen real en segundos.",
      "head.eyebrow": "Calculadora gratis",
      "head.title": "¿Tu receta deja <em>ganancia</em>?",
      "head.sub": "Mete lo que te cuesta hacerla y lo que cobras. Te digo en segundos si ganas, cuánto, y a cuánto deberías venderla para no regalar tu trabajo.",
      "f.optional": "(opcional)",
      "f.nombre": "¿Qué receta?",
      "f.nombrePh": "Torta de zanahoria",
      "f.ingredientes": "¿Cuánto gastaste en ingredientes?",
      "f.ingredientesHelp": "Todo lo que usaste en esta tanda.",
      "f.unidades": "¿Cuántas unidades te rinde?",
      "f.unidadesHelp": "1 torta, 12 cupcakes, 24 galletas…",
      "f.horas": "¿Cuánto tiempo te tomó?",
      "f.horasUnit": "(horas)",
      "f.horasHelp": "Incluye ir al súper, hornear, decorar, limpiar.",
      "f.valorHora": "¿Cuánto vale tu hora?",
      "f.valorHoraHelp": "Lo que te gustaría ganar por hora de trabajo.",
      "f.empaque": "Empaque por unidad",
      "f.empaqueHelp": "Caja, base, cinta, etiqueta.",
      "f.otros": "Otros gastos de la tanda",
      "f.otrosHelp": "Gas, luz, delivery…",
      "f.precio": "¿A cuánto la vendes?",
      "f.precioUnit": "(por unidad)",
      "f.precioHelp": "El precio que cobras hoy por cada una.",
      "f.moneyNote": "Usa tu moneda — da igual cuál. El cálculo es relativo.",
      "f.submit": "Ver si me deja ganancia →",
      "err.unidades": "Pon cuántas unidades te rinde (al menos 1).",
      "err.precio": "Pon a cuánto la vendes para poder darte el veredicto.",
      "r.eyebrow": "Tu resultado",
      "r.marginLabel": "margen",
      "r.profitPos": "ganas por unidad",
      "r.profitNeg": "pierdes por unidad",
      "caveat.title": "Ojo: no contaste tu tiempo",
      "caveat.body": "Amasar, ir al súper, decorar, limpiar — eso es trabajo, y vale. Te lo sumé como $0, así que tu resultado se ve mejor de lo que es. Mira cómo cambia si te pagas tu hora.",
      "gate.title": "Ve tu ganancia y el desglose completo",
      "gate.body": "Déjame tu correo y te muestro tu ganancia por unidad, tu margen, y en qué se va tu dinero — más a cuánto deberías vender para ganar bien. Gratis.",
      "gate.emailPh": "tu@correo.com",
      "gate.btn": "Ver mi desglose →",
      "gate.note": "Sin spam. Solo tips de repostería con cariño — y te sales cuando quieras.",
      "bd.title": "En qué se va tu costo",
      "bd.sub": "Por unidad. Aquí ves qué te está pesando más.",
      "bd.ingredientes": "Ingredientes",
      "bd.trabajo": "Tu tiempo",
      "bd.empaque": "Empaque",
      "bd.otros": "Otros",
      "bd.total": "Costo por unidad",
      "sug.title": "Para un margen sano deberías cobrar",
      "share.btn": "Compartir mi resultado",
      "share.recalc": "Probar otra receta",
      "share.copied": "¡Copiado!",
      "cta.title": "Esto fue a mano. Con RecetaRentable es <em>personalizado y más rápido</em>.",
      "cta.body": "Pones lo que tengas a mano — una foto de la receta o la escribes, todos o algunos precios, tu margen de ganancia, el país y la moneda en que quieres tus resultados — y te lo genera todo detallado.",
      "cta.btn": "Probar el tool →",
      "cta.fineprint": "Funciona siempre y cuando existan supermercados con precios publicados en la web.",
      "cta.brandshot": "¿Y tus fotos? Mira BrandShot",
      "foot.share": "¿Te sirvió? Compártelo con otra repostera: <a href=\"index.html\">recetarentable.vercel.app</a>",
      "foot.colophon": "Calculadora gratis · by Modo Repostera · Hecho por una repostera, para reposteras.",
      "bands.perdiendo.claim": "Estás perdiendo plata",
      "bands.perdiendo.verdict": "Cada unidad que vendes te cuesta más de lo que cobras. No es tu culpa — nadie te enseñó a sacar este número. Pero ahora lo sabes, y se arregla.",
      "bands.regalando.claim": "Casi regalas tu trabajo",
      "bands.regalando.verdict": "Te queda algo, pero tan poco que prácticamente trabajas gratis. Tu esfuerzo vale más que eso.",
      "bands.ajustado.claim": "Te alcanza, pero apenas",
      "bands.ajustado.verdict": "Ganas, sí — pero el margen es justo. Un imprevisto (sube la harina, se te quema una) y te quedas en cero.",
      "bands.sano.claim": "Margen sano",
      "bands.sano.verdict": "Vas bien. Cobras lo suficiente para cubrir todo y quedarte con una ganancia real. Sigue así — y revisa que no se te escape ningún costo.",
      "bands.fuerte.claim": "Margen fuerte",
      "bands.fuerte.verdict": "Excelente margen. Solo asegúrate de que tu precio siga siendo competitivo en tu zona para no espantar pedidos."
    },
    en: {
      "meta.title": "Is your recipe profitable? · Free calculator · Modo Repostera",
      "meta.desc": "Find out for free if your recipe makes money: enter what it costs and what you charge, and see your real margin in seconds.",
      "head.eyebrow": "Free calculator",
      "head.title": "Is your recipe <em>making money</em>?",
      "head.sub": "Enter what it costs you to make and what you charge. I'll tell you in seconds if you're profitable, how much, and what you should charge so you stop giving your work away.",
      "f.optional": "(optional)",
      "f.nombre": "Which recipe?",
      "f.nombrePh": "Carrot cake",
      "f.ingredientes": "How much did ingredients cost?",
      "f.ingredientesHelp": "Everything you used for this batch.",
      "f.unidades": "How many units does it make?",
      "f.unidadesHelp": "1 cake, 12 cupcakes, 24 cookies…",
      "f.horas": "How long did it take?",
      "f.horasUnit": "(hours)",
      "f.horasHelp": "Include grocery run, baking, decorating, cleanup.",
      "f.valorHora": "What's your hour worth?",
      "f.valorHoraHelp": "What you'd like to earn per hour of work.",
      "f.empaque": "Packaging per unit",
      "f.empaqueHelp": "Box, base, ribbon, label.",
      "f.otros": "Other batch costs",
      "f.otrosHelp": "Gas, electricity, delivery…",
      "f.precio": "What do you sell it for?",
      "f.precioUnit": "(per unit)",
      "f.precioHelp": "The price you charge today for each one.",
      "f.moneyNote": "Use your own currency — any one works. The math is relative.",
      "f.submit": "See if it's profitable →",
      "err.unidades": "Enter how many units it makes (at least 1).",
      "err.precio": "Enter what you sell it for so I can give you the verdict.",
      "r.eyebrow": "Your result",
      "r.marginLabel": "margin",
      "r.profitPos": "you make per unit",
      "r.profitNeg": "you lose per unit",
      "caveat.title": "Heads up: you didn't count your time",
      "caveat.body": "Mixing, the grocery run, decorating, cleanup — that's work, and it's worth money. I counted it as $0, so your result looks better than it is. See how it changes when you pay yourself.",
      "gate.title": "See your profit and full breakdown",
      "gate.body": "Leave your email and I'll show you your profit per unit, your margin, and where your money goes — plus what you should charge to earn well. Free.",
      "gate.emailPh": "you@email.com",
      "gate.btn": "Show my breakdown →",
      "gate.note": "No spam. Just baking tips with love — leave whenever you want.",
      "bd.title": "Where your cost goes",
      "bd.sub": "Per unit. Here's what's weighing on you most.",
      "bd.ingredientes": "Ingredients",
      "bd.trabajo": "Your time",
      "bd.empaque": "Packaging",
      "bd.otros": "Other",
      "bd.total": "Cost per unit",
      "sug.title": "For a healthy margin you should charge",
      "share.btn": "Share my result",
      "share.recalc": "Try another recipe",
      "share.copied": "Copied!",
      "cta.title": "You did this by hand. With RecetaRentable it's <em>personalized and faster</em>.",
      "cta.body": "You add whatever you have — a photo of the recipe or type it out, all or some prices, your profit margin, the country and currency you want your results in — and it generates everything in detail.",
      "cta.btn": "Try the tool →",
      "cta.fineprint": "Works as long as there are supermarkets with prices published online.",
      "cta.brandshot": "And your photos? See BrandShot",
      "foot.share": "Did it help? Share it with another baker: <a href=\"index.html\">recetarentable.vercel.app</a>",
      "foot.colophon": "Free calculator · by Modo Repostera · Made by a baker, for bakers.",
      "bands.perdiendo.claim": "You're losing money",
      "bands.perdiendo.verdict": "Every unit you sell costs you more than you charge. It's not your fault — nobody taught you to run this number. But now you know, and it's fixable.",
      "bands.regalando.claim": "You're almost giving it away",
      "bands.regalando.verdict": "You keep a little, but so little you're practically working for free. Your effort is worth more than that.",
      "bands.ajustado.claim": "It covers it, but barely",
      "bands.ajustado.verdict": "You do make money — but the margin is tight. One surprise (flour goes up, one burns) and you're at zero.",
      "bands.sano.claim": "Healthy margin",
      "bands.sano.verdict": "You're doing well. You charge enough to cover everything and keep a real profit. Keep it up — and double-check no cost is slipping by.",
      "bands.fuerte.claim": "Strong margin",
      "bands.fuerte.verdict": "Excellent margin. Just make sure your price stays competitive in your area so you don't scare off orders."
    }
  };

  function t(key) {
    var d = I18N[CUR] || I18N.es;
    return d[key] != null ? d[key] : (I18N.es[key] != null ? I18N.es[key] : key);
  }

  /* =========================================================================
     Estado + helpers
     ========================================================================= */
  var CUR = "es";
  try { CUR = localStorage.getItem("rr_lang") || "es"; } catch (e) {}
  if (CUR !== "es" && CUR !== "en") CUR = "es";

  var state = { input: null, result: null, unlocked: false, started: false };
  var SESSION = uuid();

  function uuid() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? el.value : ""; }

  function fmtMoney(n) {
    var loc = CUR === "es" ? "es-ES" : "en-US";
    var abs = Math.abs(n).toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 ? "-" : "") + "$" + abs;
  }
  function fmtPct(frac) {
    var p = Math.round(frac * 100);
    return (p > 0 ? "" : "") + p + "%";
  }

  /* =========================================================================
     i18n apply
     ========================================================================= */
  function applyI18n() {
    document.documentElement.lang = CUR;
    document.querySelectorAll("[data-t]").forEach(function (el) {
      var key = el.getAttribute("data-t");
      var v = I18N[CUR] && I18N[CUR][key];
      if (v == null) return;
      var attr = el.getAttribute("data-t-attr");
      if (attr) el.setAttribute(attr, v); else el.textContent = v;
    });
    document.querySelectorAll("[data-t-html]").forEach(function (el) {
      var key = el.getAttribute("data-t-html");
      var v = I18N[CUR] && I18N[CUR][key];
      if (v != null) el.innerHTML = v;
    });
    // botón del caveat con el valor/hora sugerido
    var cb = $("caveat-btn");
    if (cb) cb.textContent = (CUR === "es"
      ? "Calcular pagándome " + fmtMoney(VALOR_HORA_SUG) + " la hora →"
      : "Recalculate paying myself " + fmtMoney(VALOR_HORA_SUG) + "/hour →");
    if (state.result) renderResult();   // re-pinta dinámicos al cambiar idioma
  }

  function setLang(lang) {
    if (lang !== "es" && lang !== "en") lang = "es";
    CUR = lang;
    try { localStorage.setItem("rr_lang", lang); } catch (e) {}
    document.querySelectorAll(".lang-toggle button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.lang === lang);
    });
    applyI18n();
  }

  /* =========================================================================
     Telemetría (fail-soft) — Supabase REST, insert-only
     ========================================================================= */
  function sbReady() {
    return SUPABASE_ANON_KEY.indexOf("PLACEHOLDER") < 0 && SUPABASE_URL.indexOf("PLACEHOLDER") < 0;
  }
  function sbInsert(table, row) {
    if (!sbReady()) return Promise.resolve();
    return fetch(SUPABASE_URL + "/rest/v1/" + table, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(row)
    }).catch(function () {});
  }
  function recordEvent(type, meta) {
    sbInsert("calc_events", { id: uuid(), session_id: SESSION, event_type: type, metadata: meta || null });
  }
  function recordSubmission(input, r) {
    sbInsert("calc_submissions", {
      id: uuid(),
      session_id: SESSION,
      inputs: input,
      computed: {
        costoUnidad: r.costoUnidad, gananciaUnidad: r.gananciaUnidad,
        margen: r.margen, banda: r.banda, contoTrabajo: r.contoTrabajo,
        precioSugerido: r.precioSugerido
      },
      lang: CUR,
      referrer: document.referrer || null,
      user_agent_hash: null
    });
  }

  /* =========================================================================
     Lectura de inputs + validación
     ========================================================================= */
  function readInput() {
    return {
      nombre: val("nombre").trim(),
      ingredientes: val("ingredientes"),
      unidades: val("unidades"),
      horas: val("horas"),
      valorHora: val("valorHora"),
      empaque: val("empaque"),
      otros: val("otros"),
      precio: val("precio")
    };
  }
  function markInvalid(id, on) {
    var el = $(id); if (!el) return;
    var field = el.closest(".field");
    if (field) field.classList.toggle("invalid", !!on);
  }

  /* =========================================================================
     Render del resultado
     ========================================================================= */
  function renderResult() {
    var r = state.result, input = state.input;
    if (!r) return;

    var card = $("result-card");
    card.style.setProperty("--band-color", "var(--band-" + r.banda + ")");

    $("r-recipe").textContent = input.nombre || "";
    $("r-claim").textContent = t("bands." + r.banda + ".claim");
    $("r-profit").textContent = fmtMoney(r.gananciaUnidad);
    $("r-profit-label").textContent = r.gananciaUnidad < 0 ? t("r.profitNeg") : t("r.profitPos");
    $("r-margin").textContent = fmtPct(r.margen);
    $("r-verdict").textContent = t("bands." + r.banda + ".verdict");

    // gate educativo
    $("caveat").hidden = r.contoTrabajo;

    if (state.unlocked) renderUnlocked();
  }

  function renderUnlocked() {
    var r = state.result;
    var rows = [
      { key: "ingredientes", cls: "ingredientes" },
      { key: "trabajo", cls: "trabajo" },
      { key: "empaque", cls: "empaque" },
      { key: "otros", cls: "otros" }
    ];
    var bd = $("breakdown");
    bd.innerHTML = "";
    rows.forEach(function (row) {
      var comp = r.desglose[row.key];
      var pct = Math.max(0, Math.min(1, comp.peso)) * 100;
      var el = document.createElement("div");
      el.className = "bd-row";
      el.innerHTML =
        '<span class="bd-row__label">' + t("bd." + row.key) + "</span>" +
        '<div class="bd-bar"><div class="bd-bar__fill ' + row.cls + '" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '<span class="bd-row__val">' + fmtMoney(comp.porUnidad) + "</span>";
      bd.appendChild(el);
    });
    $("bd-total-val").textContent = fmtMoney(r.costoUnidad);

    $("sug-price").textContent = fmtMoney(r.precioSugerido);
    var precioActual = (window.RecetaCalc.round2 ? RecetaCalc.round2(r.gananciaUnidad + r.costoUnidad) : (r.gananciaUnidad + r.costoUnidad));
    var deltaPrecio = r.precioSugerido - precioActual;
    var sd = $("sug-delta");
    if (deltaPrecio > 0.005) {
      sd.innerHTML = CUR === "es"
        ? "Subiendo de " + fmtMoney(precioActual) + " a <b>" + fmtMoney(r.precioSugerido) + "</b> ganarías <b>" + fmtMoney(deltaPrecio) + "</b> más por unidad."
        : "Going from " + fmtMoney(precioActual) + " to <b>" + fmtMoney(r.precioSugerido) + "</b> would earn you <b>" + fmtMoney(deltaPrecio) + "</b> more per unit.";
    } else {
      sd.innerHTML = CUR === "es"
        ? "Ya cobras por encima de eso. Vas bien — revisa solo que sigas siendo competitiva en tu zona."
        : "You already charge above that. You're doing well — just check you're still competitive in your area.";
    }
  }

  /* =========================================================================
     Acciones
     ========================================================================= */
  function calcular() {
    var input = readInput();

    // validación
    var nUn = parseFloat(input.unidades), nPr = parseFloat(input.precio);
    var okUn = isFinite(nUn) && nUn >= 1;
    var okPr = isFinite(nPr) && nPr > 0;
    markInvalid("unidades", !okUn);
    markInvalid("precio", !okPr);
    if (!okUn || !okPr) {
      var first = !okUn ? "unidades" : "precio";
      var elf = $(first); if (elf) elf.focus();
      return;
    }

    var r = Calc.scoreReceta(input);
    if (!r.ok) { markInvalid(r.error, true); return; }

    state.input = input;
    state.result = r;
    state.unlocked = false;
    $("r-numbers").hidden = true;   // ganancia/margen gateados tras el email
    $("unlocked").hidden = true;
    $("gate").hidden = false;

    renderResult();
    $("result").hidden = false;
    recordSubmission(input, r);
    recordEvent("completed", { banda: r.banda, contoTrabajo: r.contoTrabajo });

    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function recalcConTiempo() {
    var el = $("valorHora");
    if (el && (!el.value || parseFloat(el.value) <= 0)) el.value = String(VALOR_HORA_SUG);
    if ($("horas") && (!$("horas").value || parseFloat($("horas").value) <= 0)) $("horas").value = "2";
    calcular();
  }

  function unlock() {
    if (state.unlocked) return;
    state.unlocked = true;
    $("gate").hidden = true;
    $("r-numbers").hidden = false;  // revela ganancia/margen
    $("unlocked").hidden = false;
    renderUnlocked();
    recordEvent("email_unlocked", { banda: state.result && state.result.banda });
    $("unlocked").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function submitEmail(email) {
    // Fail-soft: si Kit no está configurado o falla, igual desbloqueamos.
    if (KIT_FORM_ID.indexOf("PLACEHOLDER") >= 0) { unlock(); return; }
    var body = new URLSearchParams();
    body.set("email_address", email);
    fetch("https://app.kit.com/forms/" + KIT_FORM_ID + "/subscriptions", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }).then(function () { unlock(); }).catch(function () { unlock(); });
  }

  function share() {
    var r = state.result; if (!r) return;
    var recipe = (state.input && state.input.nombre) || (CUR === "es" ? "mi receta" : "my recipe");
    var txt = CUR === "es"
      ? "Calculé " + recipe + " en RecetaRentable: " + fmtPct(r.margen) + " de margen. Mira si la tuya te deja ganancia 👉"
      : "I ran " + recipe + " through RecetaRentable: " + fmtPct(r.margen) + " margin. See if yours is profitable 👉";
    var url = "https://recetarentable.vercel.app/calculadora";
    recordEvent("cta_clicked", { kind: "share" });
    if (navigator.share) {
      navigator.share({ text: txt, url: url }).catch(function () {});
    } else {
      var full = txt + " " + url;
      var copy = navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText(full) : Promise.reject();
      copy.then(function () {
        var b = $("share-btn"), prev = b.textContent;
        b.textContent = t("share.copied");
        setTimeout(function () { b.textContent = prev; }, 1600);
      }).catch(function () {});
    }
  }

  function reset() {
    state.result = null; state.input = null; state.unlocked = false;
    $("result").hidden = true;
    $("calc-form").reset();
    document.querySelectorAll(".field.invalid").forEach(function (f) { f.classList.remove("invalid"); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* =========================================================================
     Wiring
     ========================================================================= */
  document.querySelectorAll(".lang-toggle button").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.dataset.lang); });
  });

  $("calc-form").addEventListener("submit", function (e) { e.preventDefault(); calcular(); });
  $("calc-form").addEventListener("focusin", function () {
    if (!state.started) { state.started = true; recordEvent("started"); }
  });
  $("gate-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = val("email").trim();
    if (!email || email.indexOf("@") < 1) { $("email").focus(); return; }
    submitEmail(email);
  });
  $("caveat-btn").addEventListener("click", recalcConTiempo);
  $("share-btn").addEventListener("click", share);
  $("recalc-btn").addEventListener("click", reset);
  $("cta-tool").addEventListener("click", function () { recordEvent("cta_clicked", { kind: "tool" }); });

  // limpiar invalid al escribir
  ["unidades", "precio"].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener("input", function () { markInvalid(id, false); });
  });

  setLang(CUR);
})();
