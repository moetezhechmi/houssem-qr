const URL = 'https://nherdvalokgjjmpvpsyr.supabase.co';
const KEY = 'sb_publishable_6RRO_F9ds0p1AnlDl8uH1w_qe4ZIwjA';

async function probe(p, token) {
  try {
    const r = await fetch(URL + p, { headers: { apikey: KEY, Authorization: `Bearer ${token ?? 'bogus-token'}` } });
    const t = await r.text();
    console.log(r.status, p, '->', t.slice(0, 400));
  } catch (e) { console.log('ERR', p, e.message); }
}

await probe('/auth/v1/user');
await probe('/auth/v1/token?grant_type=password', 'x'); // pas d'utile ici, juste contexte
