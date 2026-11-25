'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type NotificationType = 'marketing' | 'greetings' | 'reminder' | 'reward' | 'announcement';

interface Preset {
  label: string;
  icon: string;
  type: NotificationType;
  title: string;
  message: string;
  btnText: string;
  btnAction: string;
}

const PRESETS: Preset[] = [
  {
    label: 'Remise 30%',
    icon: '🎁',
    type: 'reward',
    title: 'Votre réduction de -30% vous attend ! 🎁',
    message: 'Félicitations pour votre fidélité ! Présentez votre carte en caisse pour bénéficier de 30% de remise immédiate sur votre commande.',
    btnText: 'Voir mes Récompenses',
    btnAction: 'reward',
  },
  {
    label: 'Joyeux Vendredi',
    icon: '☕',
    type: 'greetings',
    title: 'Joyeux Vendredi ! ☕',
    message: 'Le week-end commence maintenant ! Venez savourer votre boisson signature préférée et faire le plein d’énergie.',
    btnText: 'Voir ma Carte',
    btnAction: 'close',
  },
  {
    label: 'Offre Spéciale',
    icon: '✨',
    type: 'marketing',
    title: 'Offre Spéciale du Jour ✨',
    message: 'Offre exclusive aujourd’hui chez nous ! Venez déguster nos douceurs artisanales et cafés de spécialité.',
    btnText: 'Découvrir & Profiter',
    btnAction: 'close',
  },
  {
    label: 'Rappel Carte',
    icon: '⏰',
    type: 'reminder',
    title: 'Votre carte expire bientôt ⏰',
    message: 'N’oubliez pas d’utiliser vos points ou de renouveler votre cycle avant son expiration.',
    btnText: 'Ouvrir ma Carte',
    btnAction: 'close',
  },
  {
    label: 'Nouveauté',
    icon: '📢',
    type: 'announcement',
    title: 'Nouveautés du moment ! 📢',
    message: 'Découvrez nos nouvelles boissons fraîches et douceurs du jour disponibles dès maintenant.',
    btnText: 'Découvrir',
    btnAction: 'close',
  },
];

export function AdminNotifications() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [subCount, setSubCount] = useState(0);

  // Mobile active tab: 'form' | 'preview' | 'history'
  const [mobileTab, setMobileTab] = useState<'form' | 'preview' | 'history'>('form');

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('marketing');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [btnText, setBtnText] = useState('Découvrir & Profiter');
  const [btnAction, setBtnAction] = useState('close'); // 'close' | 'menu' | 'reward'
  const [target, setTarget] = useState('all');
  const [scheduled, setScheduled] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const HISTORY_PER_PAGE = 10;

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('L’image est trop volumineuse (max 4 Mo).');
      return;
    }

    setUploadingImage(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/super-admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, data: base64 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur upload image');

      setImageUrl(data.url);
    } catch (err: any) {
      alert(`Erreur upload : ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const applyPreset = (p: Preset) => {
    setType(p.type);
    setTitle(p.title);
    setMessage(p.message);
    setBtnText(p.btnText);
    setBtnAction(p.btnAction);
  };

  const createCampaign = async (immediate: boolean) => {
    if (!title.trim() || !message.trim()) {
      setMsg({ text: 'Veuillez saisir au minimum un titre et un message.', ok: false });
      return;
    }
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
        const sentCount = data?.sent_count ?? subCount;
        setMsg({
          text: immediate
            ? `Notification envoyée avec succès à ${sentCount} abonné(s) de votre établissement !`
            : 'Notification programmée avec succès !',
          ok: true,
        });
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
          label: 'Nouveauté Carte',
          icon: '📢',
          bg: 'var(--notif-announce-bg)',
          color: 'var(--notif-announce-text)',
          border: 'var(--notif-announce-bdr)',
        };
    }
  };

  const previewMeta = getTypeMeta(type);

  return (
    <div className="animate-in" style={{ paddingBottom: '1rem' }}>
      {/* ─── Top Studio Bar : Titre & Statut Abonnés ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--crema-border)',
        }}
      >
        <div>
          <div className="section-label">Studio Marketing & PWA</div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.45rem',
              fontWeight: 700,
              color: 'var(--espresso)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Créer une Notification Pop-up
          </h2>
        </div>

        {/* Badge Abonnés Actifs */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--r-pill)',
            background: 'var(--crema-surface)',
            border: '1.5px solid var(--crema-border)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: subCount > 0 ? 'var(--sage)' : 'var(--coffee-mid)',
              boxShadow: subCount > 0 ? '0 0 8px var(--sage)' : 'none',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--espresso)' }}>
            {subCount} client{subCount > 1 ? 's' : ''} abonné{subCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ─── Mobile Segmented Switcher (évite le défilement vertical) ─── */}
      <div
        className="notif-mobile-switcher"
        style={{
          display: 'flex',
          background: 'var(--crema-subtle)',
          padding: '4px',
          borderRadius: 'var(--r-md)',
          marginBottom: '1.15rem',
          border: '1px solid var(--crema-border)',
        }}
      >
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 'var(--r-sm)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            border: 'none',
            background: mobileTab === 'form' ? 'var(--espresso)' : 'transparent',
            color: mobileTab === 'form' ? '#FAF8F5' : 'var(--coffee-mid)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: mobileTab === 'form' ? 'var(--shadow-xs)' : 'none',
          }}
        >
          ✍️ Créer le Pop-up
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 'var(--r-sm)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            border: 'none',
            background: mobileTab === 'preview' ? 'var(--espresso)' : 'transparent',
            color: mobileTab === 'preview' ? '#FAF8F5' : 'var(--coffee-mid)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: mobileTab === 'preview' ? 'var(--shadow-xs)' : 'none',
          }}
        >
          👁️ Aperçu Client
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('history')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 'var(--r-sm)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            border: 'none',
            background: mobileTab === 'history' ? 'var(--espresso)' : 'transparent',
            color: mobileTab === 'history' ? '#FAF8F5' : 'var(--coffee-mid)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: mobileTab === 'history' ? 'var(--shadow-xs)' : 'none',
          }}
        >
          📜 Historique ({history.length})
        </button>
      </div>

      {/* ─── Feedback Toast Message ─── */}
      {msg && (
        <div
          style={{
            background: msg.ok ? 'var(--sage-light)' : 'var(--coral-light)',
            border: `1.5px solid ${msg.ok ? 'var(--sage-border)' : 'var(--coral-border)'}`,
            borderRadius: 'var(--r-md)',
            padding: '0.85rem 1.15rem',
            marginBottom: '1.15rem',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: msg.ok ? 'var(--sage-dark)' : 'var(--coral)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>{msg.ok ? '🎉' : '⚠️'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* ─── Main Two-Column Container (Desktop Side-by-Side / Mobile Tabbed) ─── */}
      <div className="notif-grid-layout">
        {/* COLONNE GAUCHE : FORMULAIRE DE CRÉATION */}
        <div className={`notif-col-form ${mobileTab === 'form' ? 'active-mobile' : ''}`}>
          {/* ── Modèles Rapides (1-Tap Presets) ── */}
          <div style={{ marginBottom: '1.15rem' }}>
            <div
              style={{
                fontSize: 'var(--text-2xs)',
                fontWeight: 800,
                color: 'var(--coffee-mid)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
              }}
            >
              ⚡ Modèles rapides (cliquez pour remplir en 1 tap) :
            </div>

            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '4px',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--r-pill)',
                    background: 'var(--crema-surface)',
                    border: '1.5px solid var(--crema-border)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--espresso)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gold)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--crema-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Carte du Formulaire ── */}
          <div
            className="ui-card"
            style={{
              padding: '1.35rem',
              border: '1.5px solid var(--crema-border)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Choix de la catégorie */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 800,
                    color: 'var(--coffee-mid)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '0.45rem',
                  }}
                >
                  Type de Pop-up
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
                    gap: '6px',
                  }}
                >
                  {(['marketing', 'reward', 'reminder', 'greetings', 'announcement'] as NotificationType[]).map((t) => {
                    const m = getTypeMeta(t);
                    const isSel = type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        style={{
                          padding: '0.55rem 0.5rem',
                          borderRadius: 'var(--r-sm)',
                          border: isSel ? '2px solid var(--espresso)' : '1px solid var(--crema-border)',
                          background: isSel ? 'var(--crema-subtle)' : 'var(--crema-surface)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: isSel ? 800 : 600,
                          color: 'var(--espresso)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSel ? 'var(--shadow-xs)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: '0.95rem' }}>{m.icon}</span>
                        <span>{m.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Titre */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 800,
                    color: 'var(--coffee-mid)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '0.35rem',
                  }}
                >
                  Titre du Pop-up
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Joyeux vendredi ! ☕ / -30% sur vos cafés"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    fontSize: 'var(--text-base)',
                    color: 'var(--espresso)',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--crema-border)')}
                />
              </div>

              {/* Message */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 800,
                    color: 'var(--coffee-mid)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '0.35rem',
                  }}
                >
                  Message explicatif
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Rédigez l'annonce qui apparaîtra au clic sur la notification..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    fontSize: 'var(--text-base)',
                    color: 'var(--espresso)',
                    lineHeight: 1.45,
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--crema-border)')}
                />
              </div>

              {/* Bouton d'action client */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 800,
                      color: 'var(--coffee-mid)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Libellé Bouton
                  </label>
                  <input
                    value={btnText}
                    onChange={(e) => setBtnText(e.target.value)}
                    placeholder="Découvrir & Profiter"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.8rem',
                      borderRadius: 'var(--r-sm)',
                      border: '1.5px solid var(--crema-border)',
                      background: 'var(--crema-surface)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--espresso)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 800,
                      color: 'var(--coffee-mid)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Action au Clic
                  </label>
                  <select
                    value={btnAction}
                    onChange={(e) => setBtnAction(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.8rem',
                      borderRadius: 'var(--r-sm)',
                      border: '1.5px solid var(--crema-border)',
                      background: 'var(--crema-surface)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--espresso)',
                      outline: 'none',
                    }}
                  >
                    <option value="close">Fermer la modale / Rester sur la carte</option>
                    <option value="reward">Voir les Récompenses</option>
                  </select>
                </div>
              </div>

              {/* Toggle Options Avancées (Image, Planification) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--coffee-mid)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{showAdvanced ? '▾ Masquer les options avancées' : '▸ Plus d’options (Image, Date...)'}</span>
                </button>

                {showAdvanced && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.85rem',
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--crema-subtle)',
                      border: '1px solid var(--crema-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', marginBottom: '0.35rem' }}>
                        Image d'illustration
                      </label>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt="Illustration"
                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--crema-border)' }}
                          />
                        )}

                        <input
                          type="file"
                          accept="image/*"
                          id="notif-image-upload"
                          style={{ display: 'none' }}
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                        <label
                          htmlFor="notif-image-upload"
                          className="touch-btn touch-btn--secondary"
                          style={{
                            minHeight: '34px',
                            padding: '4px 12px',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>📷</span>
                          <span>{uploadingImage ? 'Upload...' : imageUrl ? 'Changer l’image' : 'Choisir une image'}</span>
                        </label>

                        {imageUrl && (
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            style={{ background: 'none', border: 'none', color: 'var(--coral)', fontSize: '0.78rem', cursor: 'pointer' }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>

                      <input
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Ou collez une URL : https://..."
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.75rem',
                          borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--crema-border)',
                          background: '#FFFFFF',
                          fontSize: 'var(--text-xs)',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', marginBottom: '0.25rem' }}>
                          Destinataires
                        </label>
                        <select
                          value={target}
                          onChange={(e) => setTarget(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.75rem',
                            borderRadius: 'var(--r-sm)',
                            border: '1px solid var(--crema-border)',
                            background: '#FFFFFF',
                            fontSize: 'var(--text-xs)',
                            outline: 'none',
                          }}
                        >
                          <option value="all">Tous ({subCount})</option>
                          <option value="marketing">Marketing seul</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, color: 'var(--coffee-mid)', marginBottom: '0.25rem' }}>
                          Planifier (optionnel)
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduled}
                          onChange={(e) => setScheduled(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.75rem',
                            borderRadius: 'var(--r-sm)',
                            border: '1px solid var(--crema-border)',
                            background: '#FFFFFF',
                            fontSize: 'var(--text-xs)',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Grand Bouton d'Envoi Principal ── */}
              <div style={{ marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="touch-btn touch-btn--gold"
                  disabled={busy || !title.trim() || !message.trim()}
                  onClick={() => createCampaign(true)}
                  style={{
                    width: '100%',
                    padding: '0.95rem 1.25rem',
                    borderRadius: 'var(--r-md)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    boxShadow: '0 6px 20px var(--gold-glow)',
                    cursor: busy || !title.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {busy ? 'Envoi en cours…' : `🚀 Envoyer à tous les clients (${subCount})`}
                </button>

                {scheduled && (
                  <button
                    type="button"
                    className="touch-btn touch-btn--outline"
                    disabled={busy}
                    onClick={() => createCampaign(false)}
                    style={{
                      width: '100%',
                      marginTop: '0.5rem',
                      minHeight: '42px',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    Planifier pour la date choisie
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : APERÇU EN DIRECT DU POP-UP */}
        <div className={`notif-col-preview ${mobileTab === 'preview' ? 'active-mobile' : ''}`}>
          <div
            className="ui-card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '1.5px solid var(--crema-border)',
              background: 'radial-gradient(circle at center, #FAF8F5 0%, #F4EFEA 100%)',
            }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', letterSpacing: '0.06em' }}>
                Aperçu Écran Client
              </div>
              <span className="ui-badge ui-badge--sage">
                Rendu réel
              </span>
            </div>

            {/* Simplicité du Pop-up Mobile */}
            <div
              style={{
                width: '100%',
                maxWidth: '310px',
                padding: '1.6rem 1.35rem',
                borderRadius: 'var(--r-xl)',
                background: '#FFFFFF',
                boxShadow: 'var(--shadow-xl)',
                textAlign: 'center',
                border: '1.5px solid var(--crema-border)',
                position: 'relative',
              }}
            >
              {/* Logo */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <img
                  src="/logo_houssem.jpeg"
                  alt="Bieny Coffeeshop"
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    objectFit: 'cover',
                    boxShadow: '0 3px 8px rgba(24, 16, 10, 0.14)',
                    border: '1.5px solid rgba(212, 160, 84, 0.4)',
                  }}
                />
              </div>

              {/* Tag Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0.3rem 0.85rem',
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

              {/* Image d'illustration si renseignée */}
              {imageUrl.trim() && (
                <div style={{ marginBottom: '0.85rem', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                  <img
                    src={imageUrl.trim()}
                    alt="Illustration"
                    style={{ width: '100%', maxHeight: '130px', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Titre */}
              <h4
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'var(--text-md)',
                  fontWeight: 700,
                  color: 'var(--espresso)',
                  margin: '0 0 0.5rem',
                  lineHeight: 1.25,
                }}
              >
                {title.trim() || 'Titre de votre notification'}
              </h4>

              {/* Message */}
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  lineHeight: 1.5,
                  color: 'var(--coffee-dark)',
                  margin: '0 0 1.25rem',
                  whiteSpace: 'pre-line',
                }}
              >
                {message.trim() || 'Le texte explicatif apparaîtra ici avec une typographie lisible et soignée.'}
              </p>

              {/* Bouton de la modale */}
              <div
                style={{
                  background: 'var(--gold-gradient)',
                  color: 'var(--espresso-dark)',
                  padding: '0.8rem 1rem',
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

        {/* SECTION HISTORIQUE */}
        <div className={`notif-col-history ${mobileTab === 'history' ? 'active-mobile' : ''}`}>
          <div className="ui-card" style={{ padding: '1.35rem', border: '1.5px solid var(--crema-border)' }}>
            <div className="section-label">Journal d'envoi</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>
              Dernières notifications diffusées ({history.length})
            </h3>

            {history.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.75rem 1rem' }}>
                <div className="empty-state__icon">📜</div>
                <div className="empty-state__title">Aucun envoi pour le moment</div>
                <div className="empty-state__desc">Les notifications envoyées apparaîtront ici avec leur heure et statut.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {history.slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE).map((h: any) => (
                    <div
                      key={h.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--crema-surface)',
                        border: '1px solid var(--crema-border)',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--espresso)' }}>{h.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
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

                {/* Pagination Controls */}
                {history.length > HISTORY_PER_PAGE && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--crema-border)' }}>
                    <button
                      type="button"
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--r-full)',
                        border: '1px solid var(--crema-border)',
                        background: historyPage === 1 ? 'var(--crema-surface)' : 'var(--white)',
                        color: historyPage === 1 ? 'var(--coffee-light)' : 'var(--espresso)',
                        cursor: historyPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                      }}
                    >
                      ← Précédent
                    </button>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--coffee-mid)', fontWeight: 600 }}>
                      Page {historyPage} / {Math.ceil(history.length / HISTORY_PER_PAGE)}
                    </span>
                    <button
                      type="button"
                      disabled={historyPage >= Math.ceil(history.length / HISTORY_PER_PAGE)}
                      onClick={() => setHistoryPage((p) => p + 1)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--r-full)',
                        border: '1px solid var(--crema-border)',
                        background: historyPage >= Math.ceil(history.length / HISTORY_PER_PAGE) ? 'var(--crema-surface)' : 'var(--white)',
                        color: historyPage >= Math.ceil(history.length / HISTORY_PER_PAGE) ? 'var(--coffee-light)' : 'var(--espresso)',
                        cursor: historyPage >= Math.ceil(history.length / HISTORY_PER_PAGE) ? 'not-allowed' : 'pointer',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                      }}
                    >
                      Suivant →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Responsive Grid: Side-by-side on desktop, single active tab on mobile */
        @media (max-width: 859px) {
          .notif-col-form,
          .notif-col-preview,
          .notif-col-history {
            display: none;
          }
          .notif-col-form.active-mobile,
          .notif-col-preview.active-mobile,
          .notif-col-history.active-mobile {
            display: block;
          }
        }

        @media (min-width: 860px) {
          .notif-mobile-switcher {
            display: none !important;
          }
          .notif-grid-layout {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 1.25rem;
          }
          .notif-col-form,
          .notif-col-preview {
            display: block !important;
          }
          .notif-col-history {
            grid-column: span 2;
            display: block !important;
            margin-top: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
