/* main.js — RecetaRentable interactions: nav scroll, mobile menu, FAQ, reveal,
   and pre-launch CTA routing (tool not live → send to waitlist). */

(function () {
  "use strict";

  // --- Nav background on scroll ---
  var nav = document.querySelector(".nav");
  function onScroll() {
    if (window.scrollY > 40) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // --- Mobile menu ---
  var burger = document.querySelector(".nav__burger");
  var menu = document.querySelector(".mobile-menu");
  if (burger && menu) {
    burger.addEventListener("click", function () { menu.classList.toggle("open"); });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { menu.classList.remove("open"); });
    });
  }

  // --- FAQ accordion ---
  document.querySelectorAll(".faq__q").forEach(function (q) {
    q.addEventListener("click", function () {
      var item = q.closest(".faq__item");
      var ans = item.querySelector(".faq__a");
      var open = item.classList.toggle("open");
      ans.style.maxHeight = open ? ans.scrollHeight + "px" : "0";
      q.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  // --- Scroll reveal ---
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* --- Pre-launch CTA routing ---------------------------------------------
     The tool is NOT live yet. Any "Calcular gratis" / paid-plan CTA carries
     data-cta and is intercepted to scroll to the waitlist form.
     AT LAUNCH: set TOOL_URL below to the live tool URL (and PLAN_URL for
     checkout). One change flips every primary CTA from waitlist to the tool. */
  var TOOL_URL = ""; // [PLACEHOLDER] e.g. "https://app.recetarentable.com"
  var PLAN_URL = ""; // [PLACEHOLDER] checkout base URL

  function goWaitlist() {
    var wl = document.getElementById("waitlist");
    if (!wl) return;
    wl.scrollIntoView({ behavior: "smooth", block: "center" });
    var input = wl.querySelector("input[type=email]");
    if (input) setTimeout(function () { input.focus(); }, 600);
  }

  document.querySelectorAll("[data-cta]").forEach(function (el) {
    el.addEventListener("click", function (ev) {
      var type = el.getAttribute("data-cta");
      var dest = type === "plan" ? PLAN_URL : TOOL_URL;
      if (dest) { window.location.href = dest; return; }
      ev.preventDefault();
      goWaitlist();
    });
  });

  // --- Waitlist form (Formspree) ---
  var form = document.getElementById("waitlist-form");
  if (form) {
    var endpoint = form.getAttribute("action") || "";
    form.addEventListener("submit", function (ev) {
      // No real endpoint configured yet → don't pretend to submit.
      if (!endpoint || endpoint.indexOf("PLACEHOLDER") !== -1) {
        ev.preventDefault();
        var note = form.parentElement.querySelector(".form-note");
        if (note) note.textContent = "[PLACEHOLDER] Conecta tu endpoint de Formspree en index.html para activar el formulario.";
        return;
      }
      // Real endpoint present → let Formspree handle the POST natively.
    });
  }
})();
