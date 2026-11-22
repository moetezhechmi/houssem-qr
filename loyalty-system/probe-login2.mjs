const SUPABASE = 'https://nherdvalokgjjmpvpsyr.supabase.co';
const KEY = 'sb_publishable_6RRO_F9ds0p1AnlDl8uH1w_qe4ZIwjA';
const EMAIL = 'admin@bieny.test';
const PASSWORD = '123456';

// 1. sign-in (GoTrue)
const r1 = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const j1 = await r1.json();
const token = j1.access_token;
console.log('[1 sign-in]', r1.status, 'token?', !!token, 'user.id:', j1.user?.id, 'aud:', j1.user?.aud);

// 2. GET /auth/v1/user avec le token (exactement ce que fetchUserFromToken fait)
const r2 = await fetch(`${SUPABASE}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
const t2 = await r2.text();
console.log('[2 GET /auth/v1/user]', r2.status);
console.log('   body:', t2.slice(0, 300));
const parsed2 = JSON.parse(t2);
const user = parsed2?.user ?? parsed2;
console.log('   -> user.id =', user?.id, 'keys:', Object.keys(parsed2).slice(0, 10));

// 3. rpc fn_get_employee_by_id (service)
const r3 = await fetch(`${SUPABASE}/rest/v1/rpc/fn_get_employee_by_id`, {
  method: 'POST',
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_user_id: user?.id }),
});
console.log('[3 rpc fn_get_employee_by_id]', r3.status, (await r3.text()).slice(0, 300));

// 4. Current server listening?
const r4 = await fetch('http://localhost:3100/serveur', { redirect: 'manual' });
console.log('[4 GET http://localhost:3100/serveur]', r4.status, r4.headers.get('location') ?? '');
