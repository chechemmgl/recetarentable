// POST /api/login — Node serverless (CommonJS). Cambia contraseña por cookie firmada (HMAC).
// Env: DASHBOARD_PASSWORD_HASH (sha256 hex del password), SESSION_SECRET (hex 32+ bytes).
// Generar: node -e "const c=require('crypto');console.log(c.createHash('sha256').update('TUPASSWORD').digest('hex'));console.log(c.randomBytes(32).toString('hex'))"

const crypto = require('node:crypto');

const COOKIE_NAME = 'dash_session';
const SESSION_DAYS = 7;
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 60000;
const attempts = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter(function (t) { return now - t < WINDOW_MS; });
  list.push(now);
  attempts.set(ip, list);
  return list.length > MAX_ATTEMPTS;
}

function timingSafeEqualStr(a, b) {
  const ab = Buffer.from(a, 'utf8'), bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const fwd = req.headers['x-forwarded-for'];
  const ip = (fwd && String(fwd).split(',')[0].trim())
    || (req.socket && req.socket.remoteAddress) || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'rate_limited' });

  const hash = process.env.DASHBOARD_PASSWORD_HASH;
  const secret = process.env.SESSION_SECRET;
  if (!hash || !secret) return res.status(500).json({ error: 'auth_not_configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const password = body && body.password;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'password_required' });
  }

  const candidate = crypto.createHash('sha256').update(password).digest('hex');
  if (!timingSafeEqualStr(candidate, hash)) {
    return res.status(401).json({ error: 'invalid_password' });
  }

  const exp = Date.now() + SESSION_DAYS * 86400000;
  const sig = crypto.createHmac('sha256', secret).update(String(exp)).digest('hex');
  res.setHeader('set-cookie',
    COOKIE_NAME + '=' + exp + '.' + sig +
    '; Max-Age=' + (SESSION_DAYS * 86400) + '; Path=/; HttpOnly; Secure; SameSite=Lax');
  return res.status(200).json({ ok: true });
};
