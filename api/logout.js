// POST /api/logout — limpia la cookie de sesión.
const COOKIE_NAME = 'dash_session';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  res.setHeader('set-cookie',
    COOKIE_NAME + '=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  return res.status(200).json({ ok: true });
};
