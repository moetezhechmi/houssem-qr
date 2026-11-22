'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export function AdminNotifications() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [subCount, setSubCount] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [target, setTarget] = useState('all');
  const [scheduled, setScheduled] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    try {
      const [cRes, hRes, sRes] = await Promise.all([
        fetch('/api/server/push/campaigns', { credentials: 'same-origin' }),
        fetch('/api/server/push/history', { credentials: 'same-origin' }),
        fetch('/api/server/push/subscribers', { credentials: 'same-origin' }),
      ]);
      if (cRes.ok) setCampaigns(await cRes.json());
      if (hRes.ok) setHistory(await hRes.json());
      if (sRes.ok) { const d = await sRes.json(); setSubCount(d?.count ?? 0); }
    } catch {}
  };

  useEffect(() => {
    load();

    // Supabase Realtime synchronization for Admin with minimal footprint
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
    const channel = supabase
      .channel('admin_push_live_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'PushSubscriptions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'NotificationCampaigns' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'NotificationHistory' }, () => load())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const createCampaign = async (immediate: boolean) => {
    if (!title.trim() || !message.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/server/push/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          image_url: imageUrl.trim() || null,
          target,
          scheduled_at: immediate ? null : (scheduled ? new Date(scheduled).toISOString() : null),
          status: immediate ? 'send_now' : 'scheduled',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ text: immediate ? 'Campagne envoyée !' : 'Campagne programmée !', ok: true });
        setTitle(''); setMessage(''); setImageUrl(''); setScheduled('');
        load();
      } else {
        setMsg({ text: data?.error?.message ?? 'Erreur', ok: false });
      }
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div className="ui-card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>📲</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 700, color: 'var(--espresso)', lineHeight: 1 }}>{subCount}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.3rem' }}>Abonnés Push</div>
        </div>
        <div className="ui-card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>📣</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 700, color: 'var(--sage)', lineHeight: 1 }}>{campaigns.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.3rem' }}>Campagnes</div>
        </div>
        <div className="ui-card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>📜</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>{history.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.3rem' }}>Envois</div>
        </div>
      </div>

      <div className="ui-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>Nouvelle campagne</h3>
        {msg && (
          <div style={{ background: msg.ok ? 'var(--sage-light)' : 'var(--coral-light)', border: `1px solid ${msg.ok ? 'var(--sage-border)' : 'var(--coral-border)'}`, borderRadius: 'var(--r-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.84rem', color: msg.ok ? 'var(--sage)' : 'var(--coral)' }}>
            {msg.ok ? '✅' : '⚠️'} {msg.text}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" style={{ padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.9rem' }} />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" rows={3} style={{ padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.9rem', resize: 'vertical' }} />
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (facultatif)" style={{ padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.9rem' }} />
          <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.9rem' }}>
            <option value="all">Tous les abonnés</option>
            <option value="marketing">Abonnés marketing uniquement</option>
          </select>
          <input type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} style={{ padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.9rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="touch-btn touch-btn--outline" disabled={busy} onClick={() => createCampaign(false)} style={{ minHeight: '40px', fontSize: '0.84rem' }}>
              Programmer
            </button>
            <button type="button" className="touch-btn touch-btn--primary" disabled={busy} onClick={() => createCampaign(true)} style={{ minHeight: '40px', fontSize: '0.84rem' }}>
              {busy ? 'Envoi…' : 'Envoyer maintenant'}
            </button>
          </div>
        </div>
      </div>

      <div className="ui-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>Historique des envois</h3>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--coffee-mid)' }}>Aucun envoi pour le moment.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {history.slice(0, 30).map((h: any) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--r-md)', background: 'var(--crema-bg)', border: '1px solid var(--crema-border)', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--espresso)' }}>{h.title}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--coffee-mid)' }}>{h.type} · {h.status}</div>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--coffee-mid)', textAlign: 'right' }}>
                  {new Date(h.sent_at).toLocaleString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}