// GET /api/metrics — Node serverless (CommonJS). Proyección única del dashboard.
// Verifica la cookie de sesión (defensa en profundidad, además del middleware) y
// lee los agregados de Supabase vía la función SECURITY DEFINER dashboard_calc_metrics.
// null = no hay conector para ese número (UI pinta "—"). 0 = conector vivo, valor real 0.
//
// Env requeridas:
//   SESSION_SECRET               (misma que /api/login)
//   SUPABASE_SERVICE_ROLE_KEY    (secreta, solo servidor — nunca en el navegador)
//   SUPABASE_URL                 (opcional; default al proyecto conocido)

const crypto = require('node:crypto');

const COOKIE_NAME = 'dash_session';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fntomjrmxqdtumonryfy.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    if (Array.isArray(data)) data = data[0];   // defensivo: PostgREST devuelve el json escalar
    return { configured: true, data: data || {} };
  } catch (e) {
    return { configured: true, error: 'fetch_failed' };
  }
}

module.exports = async function handler(req, res) {
  if (!verifyCookie(req)) return res.status(401).json({ error: 'unauthorized' });

  const calc = await fetchCalcMetrics();
  const live = calc.configured && !calc.error;
  const d = live ? calc.data : {};
  const num = function (v) { return (v === null || v === undefined) ? null : v; };

  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({
    updated_at: new Date().toISOString(),
    metrics: {
      completados:        live ? (d.completados != null ? d.completados : 0) : null,
      started_sessions:   live ? (d.started_sessions != null ? d.started_sessions : 0) : null,
      completed_sessions: live ? (d.completed_sessions != null ? d.completed_sessions : 0) : null,
      completion_rate:    live ? num(d.completion_rate) : null,
      unlock_rate:        live ? num(d.unlock_rate) : null,
      no_time_pct:        live ? num(d.no_time_pct) : null,
      bands:              live ? (d.bands || {}) : {},
      daily:              live ? (d.daily || []) : [],
      latest:             live ? num(d.latest) : null
    },
    sources: {
      calc: live
        ? { status: 'live', note: 'Supabase RPC · en vivo' }
        : {
            status: 'pending',
            note: calc.configured
              ? ('Error de RPC: ' + (calc.error || '') + (calc.status ? ' (' + calc.status + ')' : ''))
              : 'Falta la variable SUPABASE_SERVICE_ROLE_KEY en Vercel'
          }
    }
  });
};
