// Vercel Edge Middleware — gatea el dashboard tras la cookie de sesión firmada.
// Corre en el runtime EDGE: solo Web Crypto, nada de node:crypto.
// Las rutas /api/* se auto-verifican (metrics.js devuelve 401 propio); aquí solo la página.

export const config = {
  matcher: ['/dashboard', '/dashboard.html', '/dashboard/:path*'],
};

const COOKIE_NAME = 'dash_session';

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function verify(cookieValue, secret) {
  if (!cookieValue || !secret) return false;
  const parts = cookieValue.split('.');
  const exp = parts[0], sig = parts[1];
  if (!exp || !sig) return false;
  if (Date.now() > Number(exp)) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  try {
    return await crypto.subtle.verify('HMAC', key, hexToBytes(sig), enc.encode(exp));
  } catch (e) {
    return false;
  }
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.split(';').map(function (s) { return s.trim(); })
    .find(function (s) { return s.indexOf(COOKIE_NAME + '=') === 0; });
  const value = match ? decodeURIComponent(match.slice(COOKIE_NAME.length + 1)) : null;

  if (await verify(value, process.env.SESSION_SECRET)) return; // pasa

  const loginUrl = new URL('/login.html', url);
  loginUrl.searchParams.set('next', url.pathname);
  return Response.redirect(loginUrl, 302);
}
