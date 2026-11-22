import fs from 'node:fs';

const envContent = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m) env[m[1]] = m[2];
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function checkState() {
  const resEmp = await fetch(`${url}/rest/v1/Employees?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  console.log('Employees:', await resEmp.json());

  const resCust = await fetch(`${url}/rest/v1/Customers?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  console.log('Customers count:', (await resCust.json()).length);

  const resSettings = await fetch(`${url}/rest/v1/ProgramSettings?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  console.log('ProgramSettings:', await resSettings.json());
}
checkState();
