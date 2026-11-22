const SUPABASE = 'https://nherdvalokgjjmpvpsyr.supabase.co';
const KEY = 'sb_publishable_6RRO_F9ds0p1AnlDl8uH1w_qe4ZIwjA';

async function probe(fn, params = {}) {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const text = await r.text();
  console.log('[rpc ' + fn + ']', r.status, text.slice(0, 400));
}

await probe('fn_dashboard_stats');
await probe('fn_get_employee_by_id', { p_user_id: '8748a0b1-833b-4ac2-87fd-6cd98c155051' });
