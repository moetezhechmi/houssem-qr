const SUPABASE = 'https://nherdvalokgjjmpvpsyr.supabase.co';
const KEY = 'sb_publishable_6RRO_F9ds0p1AnlDl8uH1w_qe4ZIwjA';
const EMAIL = 'admin@bieny.test';
const PASSWORD = '123456';

// 1. rpc fn_get_employee_by_id (comme fait par getEmployee — clé publishable)
const r3 = await fetch(`${SUPABASE}/rest/v1/rpc/fn_get_employee_by_id`, {
  method: 'POST',
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_user_id: '8748a0b1-833b-4ac2-87fd-6cd98c155051' }),
});
console.log('[1 rpc fn_get_employee_by_id]', r3.status, (await r3.text()).slice(0, 300));

// 2. GET /serveur sans suivre le redirect (comme fait avec redirect:'manual')
const r4 = await fetch('http://localhost:3100/serveur', { redirect: 'manual' });
console.log('[2 GET http://localhost:3100/serveur]', r4.status, r4.headers.get('location') ?? '');

// 3. Login POST (propriété idempotent, juste pour voir le statut)
const r5 = await fetch('http://localhost:3100/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
console.log('[3 POST /api/auth/login]', r5.status, (await r5.text()).slice(0, 200));
