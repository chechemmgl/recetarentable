/* kit.js — "Fotos que provocan" asset page.
   Language toggle (shares rr_lang with the main site), checklist persistence,
   copy-to-clipboard prompts, and print/save-as-PDF. No dependencies. */

(function () {
  "use strict";

  /* --- Language toggle (ES/EN blocks) --- */
  var LABELS = {
    es: { copy: "Copiar prompt", copied: "¡Copiado!" },
    en: { copy: "Copy prompt", copied: "Copied!" }
  };

  function setLang(lang) {
    if (lang !== "es" && lang !== "en") lang = "es";
    document.querySelectorAll("[data-lang-block]").forEach(function (block) {
      block.classList.toggle("active", block.getAttribute("data-lang-block") === lang);
    });
    document.querySelectorAll(".lang-toggle button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.lang === lang);
    });
    document.documentElement.lang = lang;
    try { localStorage.setItem("rr_lang", lang); } catch (e) {}
    return lang;
  }

  var current = "es";
  try { current = localStorage.getItem("rr_lang") || "es"; } catch (e) {}
  current = setLang(current);

  document.querySelectorAll(".lang-toggle button").forEach(function (b) {
    b.addEventListener("click", function () { current = setLang(b.dataset.lang); });
  });

  /* --- Checklist: toggle + persist (per-position, language-independent) --- */
  document.querySelectorAll("[data-lang-block]").forEach(function (block) {
    var lang = block.getAttribute("data-lang-block");
    block.querySelectorAll(".check__item").forEach(function (item, i) {
      var key = "rr_kit_check_" + lang + "_" + i;
      try { if (localStorage.getItem(key) === "1") item.classList.add("done"); } catch (e) {}
      item.addEventListener("click", function (ev) {
        ev.preventDefault(); // label wraps no real input — manage state ourselves
        var done = item.classList.toggle("done");
        try { localStorage.setItem(key, done ? "1" : "0"); } catch (e) {}
      });
    });
  });

  /* --- Copy-to-clipboard for prompts --- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  document.querySelectorAll(".prompt__copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest(".prompt");
      var textEl = card ? card.querySelector(".prompt__text") : null;
      if (!textEl) return;
      var text = textEl.textContent.trim().replace(/\s+/g, " ");
      var label = btn.querySelector("[data-copy-label]");
      var lang = card.closest("[data-lang-block]").getAttribute("data-lang-block");
      copyText(text).then(function () {
        btn.classList.add("copied");
        if (label) label.textContent = LABELS[lang].copied;
        setTimeout(function () {
          btn.classList.remove("copied");
          if (label) label.textContent = LABELS[lang].copy;
        }, 1600);
      }).catch(function () {});
    });
  });
})();
