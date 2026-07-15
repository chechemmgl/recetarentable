/* calc-scoring.js — Motor de cálculo de la Calculadora "¿Tu receta deja ganancia?"
   Módulo PURO: sin DOM, sin fetch, sin estado global mutable. Una entrada → un
   resultado. Testeable con `node --test` (require) y disponible como
   window.RecetaCalc en el navegador (funciona desde file:// sin servidor).
   Toda la lógica de negocio vive aquí; la UI (calc.js) solo formatea y pinta. */

(function (global) {
  "use strict";

  /* --- Constantes tunables (ver references/calculadora-spec.md §3) --- */
  var TARGET_MARGIN = 0.40;          // margen objetivo para el precio sugerido
  var SUGERENCIA_VALOR_HORA = 5;     // valor/hora propuesto por el gate educativo

  /* Bandas de veredicto sobre el margen (ganancia/precio, con trabajo incluido).
     Orden de mayor a menor; se evalúa con `margen >= min`. */
  var BANDS = [
    { key: "fuerte",    min: 0.50 },
    { key: "sano",      min: 0.30 },
    { key: "ajustado",  min: 0.15 },
    { key: "regalando", min: 0.00 },
    { key: "perdiendo", min: -Infinity }
  ];

  function bandaDeMargen(margen) {
    for (var i = 0; i < BANDS.length; i++) {
      if (margen >= BANDS[i].min) return BANDS[i].key;
    }
    return "perdiendo"; // inalcanzable (perdiendo cubre -Infinity), defensivo
  }

  /* Convierte un valor de entrada (string del input, undefined, etc.) a número
     >= 0. Vacío/NaN/negativo → 0. Mantiene el motor robusto a inputs sucios. */
  function num(v) {
    var n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    if (!isFinite(n) || n < 0) return 0;
    return n;
  }

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  /* scoreReceta(input) → resultado.
     input = { nombre, ingredientes, unidades, horas, valorHora, empaque,
               otros, precio }
     `horas` admite decimales (ej. 2,5). Costo de trabajo = horas × valorHora.
     Devuelve { ok:false, error } si faltan datos imprescindibles
     (unidades >= 1 y precio > 0); de lo contrario { ok:true, ... }. */
  function scoreReceta(input) {
    input = input || {};

    var ingredientes = num(input.ingredientes);
    var unidades = num(input.unidades);
    var horas = num(input.horas);
    var valorHora = num(input.valorHora);
    var empaque = num(input.empaque);
    var otros = num(input.otros);
    var precio = num(input.precio);

    if (unidades < 1) {
      return { ok: false, error: "unidades" };   // hace falta cuánto rinde
    }
    if (precio <= 0) {
      return { ok: false, error: "precio" };      // sin precio no hay veredicto
    }

    var costoTrabajoLote = horas * valorHora;
    var costoEmpaqueLote = empaque * unidades;
    var costoLote = ingredientes + costoTrabajoLote + costoEmpaqueLote + otros;

    var costoUnidad = costoLote / unidades;
    var gananciaUnidad = precio - costoUnidad;
    var margen = gananciaUnidad / precio;            // fracción (puede ser < 0)
    var contoTrabajo = horas > 0 && valorHora > 0;
    var banda = bandaDeMargen(margen);

    // Precio para alcanzar un margen sano (TARGET_MARGIN).
    var precioSugerido = costoUnidad / (1 - TARGET_MARGIN);
    var gananciaSugerida = precioSugerido - costoUnidad;

    // Desglose por unidad (para el panel desbloqueado). Cada componente y su
    // peso sobre el costo por unidad.
    var compIngredientes = ingredientes / unidades;
    var compTrabajo = costoTrabajoLote / unidades;
    var compEmpaque = empaque;                        // ya es por unidad
    var compOtros = otros / unidades;

    function pesoPct(parte) {
      return costoUnidad > 0 ? parte / costoUnidad : 0;
    }

    return {
      ok: true,
      // crudos (la UI formatea)
      costoLote: costoLote,
      costoUnidad: costoUnidad,
      gananciaUnidad: gananciaUnidad,
      margen: margen,
      margenPct: margen * 100,
      banda: banda,
      contoTrabajo: contoTrabajo,
      precioSugerido: precioSugerido,
      gananciaSugerida: gananciaSugerida,
      desglose: {
        ingredientes: { porUnidad: compIngredientes, peso: pesoPct(compIngredientes) },
        trabajo:      { porUnidad: compTrabajo,      peso: pesoPct(compTrabajo) },
        empaque:      { porUnidad: compEmpaque,      peso: pesoPct(compEmpaque) },
        otros:        { porUnidad: compOtros,        peso: pesoPct(compOtros) }
      }
    };
  }

  var api = {
    scoreReceta: scoreReceta,
    bandaDeMargen: bandaDeMargen,
    round2: round2,
    BANDS: BANDS,
    TARGET_MARGIN: TARGET_MARGIN,
    SUGERENCIA_VALOR_HORA: SUGERENCIA_VALOR_HORA
  };

  // Node / test (CommonJS)
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  // Navegador
  global.RecetaCalc = api;
})(typeof window !== "undefined" ? window : globalThis);
