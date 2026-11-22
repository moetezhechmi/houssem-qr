// Teste les ordres PostgREST v3 pour AuditLogs
const URL = 'https://nherdvalokgjjmpvpsyr.supabase.co';
const KEY = 'sb_publishable_6RRO_F9ds0p1AnlDl8uH1w_qe4ZIwjA';

for (const order of ['created_at.desc', 'created_at.asc', 'created_at']) {
  try {
    const r = await fetch(`${URL}/rest/v1/AuditLogs?order=${encodeURIComponent(order)}&limit=1`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    console.log('[' + order + ']', r.status, (await r.text()).slice(0, 160));
  } catch (e) { console.log('[' + order + ']', 'ERR', e.message); }
}

// et la forme (col, {ascending:false}) de supabase-js → le "order=" qu'elle envoie
try {
  const r = await fetch(`${URL}/rest/v1/AuditLogs?order=created_at.desc&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  console.log('[order=created_at.desc raw]', r.status, (await r.text()).slice(0, 160));
} catch (e) { console.log('[order=created_at.desc raw]', 'ERR', e.message); }
