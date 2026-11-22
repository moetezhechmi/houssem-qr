/** Formatage des dates avec le fuseau horaire Africa/Tunis. */

const TunisTz = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Tunis',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  hour12: false,
});

const TunisiaTime = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const parts = TunisTz.formatToParts(d);
  const f: Record<string, string> = {};
  for (const p of parts) if (p.type !== 'literal') f[p.type] = p.value;
  return `${f.day}/${f.month}/${f.year} · ${f.hour}:${f.minute}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const parts = TunisiaTime.formatToParts(d);
  const f: Record<string, string> = {};
  for (const p of parts) if (p.type !== 'literal') f[p.type] = p.value;
  return `${f.day}/${f.month}/${f.year}`;
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}

export function hexColor(hash: string, light = false): string {
  // Déterministe — variations de couleur depuis l'empreinte (tons café)
  let h = 0;
  for (let i = 0; i < hash.length; i++) h = ((h << 5) - h + hash.charCodeAt(i)) | 0;
  const base = [0x6f, 0x4e, 0x37]; // café dark
  const t = ((h >>> 8) % 100) / 100;
  return light
    ? `rgb(${base[0] + (0xF5 - base[0]) * (0.4 + 0.6 * t)}, ${base[1] + (0xF0 - base[1]) * (0.4 + 0.6 * t)}, ${base[2] + (0xE8 - base[2]) * (0.4 + 0.6 * t)})`
    : `rgb(${base[0] + ((0x2C + h % 0x3A) - base[0]) * (0.5 + 0.5 * t)}, ${base[1] + ((0x1E + (h % 0x14)) - base[1]) * (0.5 + 0.5 * t)}, ${base[2] + ((0x16 + (h % 0x0A)) - base[2]) * (0.5 + 0.5 * t)})`;
}
