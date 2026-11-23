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
        return {
          label: 'Offre Spéciale',
          icon: '✨',
          bg: 'var(--notif-marketing-bg)',
          color: 'var(--notif-marketing-text)',
          border: 'var(--notif-marketing-bdr)',
        };
      case 'greetings':
        return {
          label: 'Message & Accueil',
          icon: '👋',
          bg: 'var(--notif-greetings-bg)',
          color: 'var(--notif-greetings-text)',
          border: 'var(--notif-greetings-bdr)',
        };
      case 'reminder':
        return {
          label: 'Rappel Fidélité',
          icon: '⏰',
          bg: 'var(--notif-reminder-bg)',
          color: 'var(--notif-reminder-text)',
          border: 'var(--notif-reminder-bdr)',
        };
      case 'reward':
        return {
          label: 'Récompense',
          icon: '🎁',
          bg: 'var(--notif-reward-bg)',
          color: 'var(--notif-reward-text)',
          border: 'var(--notif-reward-bdr)',
        };
      case 'announcement':
        return {
          label: 'Nouveauté & Carte',
          icon: '📢',
          bg: 'var(--notif-announce-bg)',
          color: 'var(--notif-announce-text)',
          border: 'var(--notif-announce-bdr)',
        };
    }
  };

  const previewMeta = getTypeMeta(type);

  return (
    <div className="animate-in">
      {/* ─── Stats KPI ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Abonnés Push
            </span>
            <span style={{ fontSize: '1.25rem' }}>📲</span>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--espresso)' }}>
            {subCount}
          </div>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--sage-dark)' }}>Clients réceptifs</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Campagnes
            </span>
            <span style={{ fontSize: '1.25rem' }}>📣</span>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--sage-dark)' }}>
            {campaigns.length}
          </div>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)' }}>Créées au total</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notifications
            </span>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--gold-dark)' }}>
            {history.length}
          </div>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)' }}>Envois envoyés</div>
        </div>
      </div>

      {/* ─── Studio Création + Live Preview Modal ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Formulaire */}
        <div className="ui-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <div className="section-label">Studio Push</div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--espresso)', margin: 0 }}>
                Créer un Pop-up Interactif
              </h3>
            </div>
            <span className="ui-badge ui-badge--sage">
              Live PWA
            </span>
          </div>

          {msg && (
            <div
              style={{
                background: msg.ok ? 'var(--sage-light)' : 'var(--coral-light)',
                border: `1px solid ${msg.ok ? 'var(--sage-border)' : 'var(--coral-border)'}`,
                borderRadius: 'var(--r-sm)',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: 'var(--text-sm)',
                color: msg.ok ? 'var(--sage-dark)' : 'var(--coral)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{msg.ok ? '✅' : '⚠️'}</span>
              <span>{msg.text}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
            {/* Type de notification */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Thème & Catégorie
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.45rem' }}>
                {(['marketing', 'greetings', 'reminder', 'reward', 'announcement'] as NotificationType[]).map((t) => {
                  const m = getTypeMeta(t);
                  const isSel = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{
                        padding: '0.55rem 0.65rem',
                        borderRadius: 'var(--r-sm)',
                        border: isSel ? '2px solid var(--espresso)' : '1px solid var(--crema-border)',
                        background: isSel ? 'var(--crema-subtle)' : 'var(--crema-surface)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: isSel ? 700 : 500,
                        color: 'var(--espresso)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{m.icon}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Titre */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Titre de la notification
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Joyeux vendredi ! ☕ / -20% sur les Cookies"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--r-sm)',
                  border: '1.5px solid var(--crema-border)',
                  background: 'var(--crema-bg)',
                  fontSize: 'var(--text-base)',
                  color: 'var(--espresso)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Message */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Message détaillé (contenu du pop-up)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Rédigez l'annonce qui sera présentée dans le modal plein écran du client..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--r-sm)',
                  border: '1.5px solid var(--crema-border)',
                  background: 'var(--crema-bg)',
                  fontSize: 'var(--text-base)',
                  color: 'var(--espresso)',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* Image d'illustration */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                Image d'illustration (URL optionnelle)
              </label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... ou URL d'image"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--r-sm)',
                  border: '1.5px solid var(--crema-border)',
                  background: 'var(--crema-bg)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--espresso)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Action du bouton */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Texte du Bouton
                </label>
                <input
                  value={btnText}
                  onChange={(e) => setBtnText(e.target.value)}
                  placeholder="Découvrir & Profiter"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-bg)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--espresso)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Action au Clic
                </label>
                <select
                  value={btnAction}
                  onChange={(e) => setBtnAction(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-bg)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--espresso)',
                    outline: 'none',
                  }}
                >
                  <option value="close">Fermer la modale</option>
                  <option value="menu">Ouvrir le Menu Bieny</option>
                  <option value="reward">Voir les Récompenses</option>
                </select>
              </div>
            </div>

            {/* Cible & Programmation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Destinataires
                </label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-bg)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--espresso)',
                    outline: 'none',
                  }}
                >
                  <option value="all">Tous les abonnés</option>
                  <option value="marketing">Abonnés marketing</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  Planifier (optionnel)
                </label>
                <input
                  type="datetime-local"
                  value={scheduled}
                  onChange={(e) => setScheduled(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-bg)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--espresso)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="touch-btn touch-btn--outline"
                disabled={busy}
                onClick={() => createCampaign(false)}
                style={{ minHeight: '44px', fontSize: 'var(--text-sm)' }}
              >
                Planifier
              </button>
              <button
                type="button"
                className="touch-btn touch-btn--primary"
                disabled={busy}
                onClick={() => createCampaign(true)}
                style={{ minHeight: '44px', fontSize: 'var(--text-sm)' }}
              >
                {busy ? 'Envoi en cours…' : '🚀 Envoyer le Pop-up'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Aperçu en Direct (Ce que le client voit) ─── */}
        <div className="ui-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--espresso)', margin: 0 }}>
              👁️ Aperçu Pop-up Client
            </h3>
            <span className="ui-badge ui-badge--neutral">
              Temps réel
            </span>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--coffee-mid)', margin: '0 0 1.25rem', lineHeight: 1.4 }}>
            Voici la modale haute fidélité que le client verra en cliquant sur la push notification :
          </p>

          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(circle at center, #F4EFEA 0%, #EAE2D5 100%)',
              borderRadius: 'var(--r-lg)',
              padding: '1.5rem 1rem',
              border: '1px solid var(--crema-border)',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '310px',
                padding: '1.5rem 1.25rem',
                borderRadius: 'var(--r-xl)',
                background: '#FFFFFF',
                boxShadow: 'var(--shadow-lg)',
                textAlign: 'center',
                border: '1.5px solid var(--crema-border)',
              }}
            >
              {/* Logo Bieny */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <img
                  src="/logo_houssem.jpeg"
                  alt="Bieny Coffeeshop"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    objectFit: 'cover',
                    boxShadow: '0 3px 8px rgba(24, 16, 10, 0.12)',
                    border: '1.5px solid rgba(212, 160, 84, 0.35)',
                  }}
                />
              </div>

              {/* Tag Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.8rem',
                  borderRadius: 'var(--r-pill)',
                  backgroundColor: previewMeta.bg,
                  color: previewMeta.color,
                  border: `1px solid ${previewMeta.border}`,
                  marginBottom: '0.85rem',
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>{previewMeta.icon}</span>
                <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {previewMeta.label}
                </span>
              </div>

              {/* Preview image */}
              {imageUrl.trim() && (
                <div style={{ marginBottom: '0.85rem', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                  <img
                    src={imageUrl.trim()}
                    alt="Illustration"
                    style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Title */}
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 0.5rem', lineHeight: 1.25 }}>
                {title.trim() || 'Titre de la notification'}
              </h4>

              {/* Message */}
              <p style={{ fontSize: 'var(--text-xs)', lineHeight: 1.5, color: 'var(--coffee-dark)', margin: '0 0 1.25rem', whiteSpace: 'pre-line' }}>
                {message.trim() || 'Votre texte d’offre, de rappel ou de bienvenue apparaîtra ici avec une typographie élégante et lisible.'}
              </p>

              {/* Action Button */}
              <div
                style={{
                  background: 'var(--gold-gradient)',
                  color: 'var(--espresso-dark)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--r-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px var(--gold-glow)',
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
        <div className="section-label">Journal</div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>
          Historique des campagnes push
        </h3>
        {history.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <div className="empty-state__icon">📜</div>
            <div className="empty-state__title">Aucun envoi pour le moment</div>
            <div className="empty-state__desc">Vos notifications envoyées apparaîtront ici avec leur date et statut de diffusion.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {history.slice(0, 30).map((h: any) => (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 1.15rem',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--crema-surface)',
                  border: '1px solid var(--crema-border)',
                  boxShadow: 'var(--shadow-xs)',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--espresso)' }}>{h.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    <span className="ui-badge ui-badge--neutral" style={{ fontSize: '0.65rem' }}>{h.type}</span>
                    <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)' }}>· {h.status}</span>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--coffee-mid)', textAlign: 'right' }}>
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
