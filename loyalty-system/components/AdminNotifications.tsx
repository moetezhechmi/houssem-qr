'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type NotificationType = 'marketing' | 'greetings' | 'reminder' | 'reward' | 'announcement';

export function AdminNotifications() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [subCount, setSubCount] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('marketing');
  const [imageUrl, setImageUrl] = useState('');
  const [btnText, setBtnText] = useState('Découvrir & Profiter');
  const [btnAction, setBtnAction] = useState('close'); // 'close' | 'menu' | 'reward'
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
          type,
          image_url: imageUrl.trim() || null,
          btn_text: btnText.trim() || 'Découvrir & Profiter',
          btn_action: btnAction,
          target,
          scheduled_at: immediate ? null : (scheduled ? new Date(scheduled).toISOString() : null),
          status: immediate ? 'send_now' : 'scheduled',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ text: immediate ? 'Notification envoyée avec succès !' : 'Notification programmée !', ok: true });
        setTitle('');
        setMessage('');
        setImageUrl('');
        setScheduled('');
        load();
      } else {
        setMsg({ text: data?.error?.message ?? 'Erreur lors de la création', ok: false });
      }
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    } finally {
      setBusy(false);
    }
  };

  const getTypeMeta = (t: NotificationType) => {
    switch (t) {
      case 'marketing':
        return { label: 'Offre Spéciale', icon: '✨', bg: '#FDF6E2', color: '#B37D14' };
      case 'greetings':
        return { label: 'Message & Salutations', icon: '👋', bg: '#EBF4F6', color: '#2C6E7E' };
      case 'reminder':
        return { label: 'Rappel Fidélité', icon: '⏰', bg: '#F9ECE5', color: '#9E4B28' };
      case 'reward':
        return { label: 'Récompense', icon: '🎁', bg: '#EAF4EE', color: '#3A6B4E' };
      case 'announcement':
        return { label: 'Nouveauté & Annonce', icon: '📢', bg: '#F3EEFB', color: '#68459B' };
    }
  };

  const previewMeta = getTypeMeta(type);

  return (
    <div className="animate-in">
      {/* ─── Stats KPI ─── */}
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

      {/* ─── Studio Création + Live Preview Modal ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Formulaire */}
        <div className="ui-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--espresso)', margin: 0 }}>
              Créer une Notification Pop-up
            </h3>
            <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'var(--sage-light)', color: 'var(--sage)', fontWeight: 600 }}>
              PWA & Push
            </span>
          </div>

          {msg && (
            <div style={{ background: msg.ok ? 'var(--sage-light)' : 'var(--coral-light)', border: `1px solid ${msg.ok ? 'var(--sage-border)' : 'var(--coral-border)'}`, borderRadius: 'var(--r-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.84rem', color: msg.ok ? 'var(--sage)' : 'var(--coral)' }}>
              {msg.ok ? '✅' : '⚠️'} {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Type de notification */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--coffee-dark)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Thème / Catégorie du Pop-up
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.4rem' }}>
                {(['marketing', 'greetings', 'reminder', 'reward', 'announcement'] as NotificationType[]).map((t) => {
                  const m = getTypeMeta(t);
                  const isSel = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{
                        padding: '0.5rem 0.6rem',
                        borderRadius: '10px',
                        border: isSel ? '2px solid var(--espresso)' : '1px solid var(--crema-border)',
                        background: isSel ? 'var(--crema-bg)' : '#fff',
                        fontSize: '0.78rem',
                        fontWeight: isSel ? 700 : 500,
                        color: 'var(--espresso)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span>{m.icon}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Titre */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--coffee-dark)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Titre accrocheur
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Joyeux vendredi ! ☕ / -20% sur les Cookies"
                style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.9rem' }}
              />
            </div>

            {/* Message */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--coffee-dark)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Message détaillé (contenu du pop-up)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Écrivez le message qui apparaîtra dans la notification et dans la modale plein écran du client..."
                rows={3}
                style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.9rem', resize: 'vertical' }}
              />
            </div>

            {/* Image d'illustration */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--coffee-dark)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Image d'illustration (optionnelle)
              </label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Ex : https://... ou /images/cookie_pistachio.jpg"
                style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.9rem' }}
              />
            </div>

            {/* Action du bouton */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--coffee-dark)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Texte du Bouton
                </label>
                <input
                  value={btnText}
                  onChange={(e) => setBtnText(e.target.value)}
                  placeholder="Ex : Découvrir & Profiter"
                  style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--coffee-dark)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Action au Clic
                </label>
                <select
                  value={btnAction}
                  onChange={(e) => setBtnAction(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.85rem' }}
                >
                  <option value="close">Fermer la fenêtre</option>
                  <option value="menu">Ouvrir le Menu Bieny</option>
                  <option value="reward">Voir les Récompenses</option>
                </select>
              </div>
            </div>

            {/* Cible & Programmation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--coffee-dark)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Destinataires
                </label>
                <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.85rem' }}>
                  <option value="all">Tous les abonnés</option>
                  <option value="marketing">Abonnés marketing uniquement</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--coffee-dark)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Planifier (optionnel)
                </label>
                <input type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-bg)', fontSize: '0.85rem' }} />
              </div>
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="touch-btn touch-btn--outline" disabled={busy} onClick={() => createCampaign(false)} style={{ minHeight: '42px', fontSize: '0.85rem' }}>
                Programmer
              </button>
              <button type="button" className="touch-btn touch-btn--primary" disabled={busy} onClick={() => createCampaign(true)} style={{ minHeight: '42px', fontSize: '0.85rem' }}>
                {busy ? 'Envoi en cours…' : '🚀 Envoyer le Pop-up'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Aperçu en Direct (Ce que le client voit) ─── */}
        <div className="ui-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--espresso)', margin: 0 }}>
              👁️ Aperçu Pop-up Client
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)' }}>Temps réel</span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--coffee-mid)', margin: '0 0 1.25rem' }}>
            Voici exactement la fenêtre interactive qui apparaîtra sur l'écran du client lorsqu'il cliquera sur la notification :
          </p>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(24, 16, 10, 0.04)', borderRadius: '20px', padding: '1.5rem' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '1.5rem',
                borderRadius: '24px',
                background: '#FFFFFF',
                boxShadow: '0 16px 36px rgba(24, 16, 10, 0.18)',
                textAlign: 'center',
                border: '1px solid var(--crema-border)',
              }}
            >
              {/* Logo Bieny */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
                <img
                  src="/logo_houssem.jpeg"
                  alt="Bieny Logo"
                  style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 3px 8px rgba(24, 16, 10, 0.12)' }}
                />
              </div>

              {/* Tag Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  backgroundColor: previewMeta.bg,
                  color: previewMeta.color,
                  marginBottom: '0.75rem',
                }}
              >
                <span style={{ fontSize: '0.85rem' }}>{previewMeta.icon}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {previewMeta.label}
                </span>
              </div>

              {/* Preview image */}
              {imageUrl.trim() && (
                <div style={{ marginBottom: '0.85rem', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(24,16,10,0.1)' }}>
                  <img src={imageUrl.trim()} alt="Illustration" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
              )}

              {/* Title */}
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 0.5rem', lineHeight: 1.25 }}>
                {title.trim() || 'Titre de la notification'}
              </h4>

              {/* Message */}
              <p style={{ fontSize: '0.85rem', lineHeight: 1.45, color: 'var(--coffee-dark)', margin: '0 0 1.25rem', whiteSpace: 'pre-line' }}>
                {message.trim() || 'Votre texte d’offre, de rappel ou de bienvenue apparaîtra ici avec une typographie soignée.'}
              </p>

              {/* Action Button */}
              <div
                style={{
                  background: 'var(--sage)',
                  color: '#fff',
                  padding: '0.7rem 1rem',
                  borderRadius: '14px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(143, 175, 154, 0.35)',
                }}
              >
                {btnText.trim() || 'Découvrir & Profiter'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Historique des envois ─── */}
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
