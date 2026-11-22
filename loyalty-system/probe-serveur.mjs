// Login + GET /serveur (avec cookie) — voit le message d'erreur si 500
const login = await fetch('http://localhost:3100/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@bieny.test', password: '123456' }),
});
const setCookies = [...login.headers.entries()].filter(([k]) => k === 'set-cookie').map(([, v]) => v.split(';')[0]);
console.log('login:', login.status, 'cookie:', setCookies[0]?.slice(0, 30) + '...');

const r = await fetch('http://localhost:3100/serveur', { headers: { Cookie: setCookies.join('; ') }, redirect: 'manual' });
console.log('GET /serveur:', r.status, r.headers.get('location') ?? '');
const t = await r.text();
console.log(t.includes('Erreur interne') ? '→ 500 generic error' : t.slice(0, 600));

// raw body snippet if error
if (!r.ok) {
  const m = t.match(/<script id="__next_f\d+">\s*\S+\s*\((.*?)\)<\/script>/);
  console.log('body head:', t.slice(0, 200).replace(/\s+/g, ' '));
}
