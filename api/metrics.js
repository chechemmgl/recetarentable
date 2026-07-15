// GET /api/metrics — Node serverless (CommonJS). Proyección única del dashboard.
// Verifica la cookie de sesión (defensa en profundidad, además del middleware) y arma
// el contrato desde 2 adaptadores independientes: Supabase (calc) y Kit (emails).
// null = no hay conector para ese número (UI pinta "—"). 0 = conector vivo, valor real 0.
//
// Env:
//   SESSION_SECRET               (misma que /api/login)
//   SUPABASE_SERVICE_ROLE_KEY    (secreta — solo servidor)
//   SUPABASE_URL                 (opcional; default al proyecto)
//   KIT_API_SECRET               (opcional; habilita el mosaico "Emails captados")
//   KIT_FORM_ID                  (opcional; default 9590805)

const crypto = require('node:crypto');

const COOKIE_NAME = 'dash_session';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fntomjrmxqdtumonryfy.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KIT_API_SECRET = process.env.KIT_API_SECRET;
const KIT_FORM_ID = process.env.KIT_FORM_ID || '9590805';

function verifyCookie(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const header = req.headers.cookie || '';
  const match = header.split(';').map(function (s) { return s.trim(); })
    .find(function (s) { return s.indexOf(COOKIE_NAME + '=') === 0; });
  if (!match) return false;
  const value = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  const parts = value.split('.');
  const exp = parts[0], sig = parts[1];
  if (!exp || !sig) return false;
  if (Date.now() > Number(exp)) return false;
  const expected = crypto.createHmac('sha256', secret).update(String(exp)).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex'), b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) { return false; }
}

// --- Adaptador Supabase (agregados de la calculadora) -----------------------
async function fetchCalcMetrics() {
  if (!SERVICE_KEY) return { configured: false };
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/dashboard_calc_metrics', {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: 'Bearer ' + SERVICE_KEY,
        'content-type': 'application/json'
      },
      body: '{}'
    });
    if (!r.ok) return { configured: true, error: 'rpc_failed', status: r.status };
    let data = await r.json();
    if (Array.isArray(data)) data = data[0];
    return { configured: true, data: data || {} };
  } catch (e) {
    return { configured: true, error: 'fetch_failed' };
  }
}

// --- Adaptador Kit (total de suscriptoras del form) -------------------------
async function fetchKitEmails() {
  if (!KIT_API_SECRET) return { configured: false };
  try {
    const url = 'https://api.convertkit.com/v3/forms/' + KIT_FORM_ID +
      '/subscriptions?api_secret=' + encodeURIComponent(KIT_API_SECRET) + '&per_page=1';
    const r = await fetch(url);
    if (!r.ok) return { configured: true, error: 'kit_failed', status: r.status };
    const j = await r.json();
    var total = (j && j.total_subscriptions != null) ? j.total_subscriptions : null;
    return { configured: true, total: total };
  } catch (e) {
    return { configured: true, error: 'fetch_failed' };
  }
}

module.exports = async function handler(req, res) {
  if (!verifyCookie(req)) return res.status(401).json({ error: 'unauthorized' });

  const results = await Promise.all([fetchCalcMetrics(), fetchKitEmails()]);
  const calc = results[0], kit = results[1];
  const live = calc.configured && !calc.error;
  const d = live ? calc.data : {};
  const kitLive = kit.configured && !kit.error;
  const num = function (v) { return (v === null || v === undefined) ? null : v; };
  const pick = function (k, fallback) { return live ? (d[k] != null ? d[k] : fallback) : null; };

  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({
    updated_at: new Date().toISOString(),
    metrics: {
      // núcleo
      completados:        live ? (d.completados != null ? d.completados : 0) : null,
      started_sessions:   live ? (d.started_sessions != null ? d.started_sessions : 0) : null,
      completed_sessions: live ? (d.completed_sessions != null ? d.completed_sessions : 0) : null,
      unlocked_sessions:  live ? (d.unlocked_sessions != null ? d.unlocked_sessions : 0) : null,
      tool_clicks:        live ? (d.tool_clicks != null ? d.tool_clicks : 0) : null,
      share_clicks:       live ? (d.share_clicks != null ? d.share_clicks : 0) : null,
      completion_rate:    live ? num(d.completion_rate) : null,
      unlock_rate:        live ? num(d.unlock_rate) : null,
      tool_rate:          live ? num(d.tool_rate) : null,
      share_rate:         live ? num(d.share_rate) : null,
      // dolor
      pain_pct:           live ? num(d.pain_pct) : null,
      margen_mediano:     live ? num(d.margen_mediano) : null,
      sub_cobro_prom:     live ? num(d.sub_cobro_prom) : null,
      no_time_pct:        live ? num(d.no_time_pct) : null,
      // instrumento
      unidades_mediana:   live ? num(d.unidades_mediana) : null,
      horas_mediana:      live ? num(d.horas_mediana) : null,
      opcionales_pct:     live ? num(d.opcionales_pct) : null,
      // audiencia
      reincidentes:       live ? (d.reincidentes != null ? d.reincidentes : 0) : null,
      by_lang:            live ? (d.by_lang || {}) : {},
      top_referrers:      live ? (d.top_referrers || []) : [],
      by_dow:             live ? (d.by_dow || []) : [],
      // contenido
      bands:              live ? (d.bands || {}) : {},
      top_recetas:        live ? (d.top_recetas || []) : [],
      daily:              live ? (d.daily || []) : [],
      latest:             live ? num(d.latest) : null,
      // crecimiento (Kit)
      emails_total:       kitLive ? num(kit.total) : null
    },
    sources: {
      calc: live
        ? { status: 'live', note: 'Supabase RPC · en vivo' }
        : {
            status: 'pending',
            note: calc.configured
              ? ('Error de RPC: ' + (calc.error || '') + (calc.status ? ' (' + calc.status + ')' : ''))
              : 'Falta SUPABASE_SERVICE_ROLE_KEY en Vercel'
          },
      emails: kitLive
        ? { status: 'live', note: 'Kit · en vivo' }
        : {
            status: 'pending',
            note: kit.configured
              ? ('Kit no respondió' + (kit.status ? ' (' + kit.status + ')' : ''))
              : 'Falta KIT_API_SECRET en Vercel'
          }
    }
  });
};
