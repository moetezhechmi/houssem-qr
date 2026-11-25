'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { fetchClientCard } from '@/lib/client-card';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { ClientPushOptIn } from './ClientPushOptIn';
import { NotificationModal } from './NotificationModal';
import { fmtDate, fmtDateTime, daysUntil } from '@/lib/format';
import {
  CoffeeIcon,
  GiftIcon,
  HistoryIcon,
  ClockIcon,
  CheckIcon,
  BookOpenIcon,
  ExternalLinkIcon,
} from './Icons';

type CardData = {
  card: { id: string; card_number: string; status: string; start_date: string; expiration_date: string };
  customer: { id: string; first_name: string; last_name: string };
  active_cycle: {
    current_consumptions: number; required_consumptions: number;
    started_at: string; expires_at: string; days_remaining: number;
  } | null;
  rewards: Array<{
    id: string; status: string; discount_percentage: number;
    unlocked_at: string; expires_at: string; used_at: string | null;
  }>;
  history: Array<{ id: string; transaction_reference: string; created_at: string; status: string }>;
  store?: { name: string; slug: string; logo_url?: string | null } | null;
};

type View = 'card' | 'reward' | 'history';

export default function ClientCard({ token, initialData }: { token: string; initialData: CardData }) {
  const [data, setData] = useState<CardData>(initialData);
  const [view, setView] = useState<View>('card');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cardUrl, setCardUrl] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Appel API côté serveur pour garantir les données fraîches et le store associé
      const res = await fetch(`/api/client/${token}`, { cache: 'no-store' });
      if (res.ok) {
        const freshData = await res.json();
        if (freshData) {
          setData((prev) => ({
            ...prev,
            ...freshData,
            // Préserver les informations du store si le refresh ne les ré-injecte pas
            store: freshData.store || prev.store || initialData.store,
          }));
        }
      }
    } catch (e) {
      // Ignorer l'erreur silencieusement en polling
    } finally {
      setIsRefreshing(false);
    }
  }, [token, initialData.store]);

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail && ['card', 'reward', 'history'].includes(e.detail)) {
        setView(e.detail);
      }
    };
    window.addEventListener('bieny_navigate_view', handleNav);
    return () => window.removeEventListener('bieny_navigate_view', handleNav);
  }, []);

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setCardUrl(`${origin}/client/${token}`);
    setQrCodeData(`${origin}/client/${token}?scan=1`);
    try { localStorage.setItem('last_card_token', token); } catch {}
    try { document.cookie = `last_card_token=${token}; path=/; max-age=31536000; SameSite=Lax`; } catch {}
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
    const customerId = data?.customer?.id;
    const subs: RealtimeChannel[] = [];

    if (customerId) {
      for (const table of ['LoyaltyCards', 'LoyaltyCycles', 'Rewards']) {
        const ch = supabase
          .channel(`client_realtime_${customerId}_${table}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table,
            filter: `customer_id=eq.${customerId}`,
          }, () => refresh())
          .subscribe();
        subs.push(ch);
      }
    }
    // Polling de secours uniquement lorsque l'onglet est actif (économie serveur & batterie)
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refresh();
      }
    }, 30_000);
    return () => {
      subs.forEach((c) => c.unsubscribe());
      clearInterval(timer);
    };
  }, [data?.customer?.id, refresh]);

  const card = data.card;
  const cycle = data.active_cycle;
  const done = cycle ? cycle.current_consumptions : 0;
  const total = cycle ? cycle.required_consumptions : 9;
  const progressPercent = Math.min(100, Math.round((done / total) * 100));
  const expired = card.status === 'expired' || card.status === 'completed' || card.status === 'archived';
  const availableReward = data.rewards.find((r) => r.status === 'available' && new Date(r.expires_at).getTime() > Date.now());
  const daysTillExpiry = daysUntil(card.expiration_date);
  const warnExpiring = !expired && daysTillExpiry !== null && daysTillExpiry <= 5;
  const availableRewardsCount = data.rewards.filter((r) => r.status === 'available' && new Date(r.expires_at).getTime() > Date.now()).length;

  return (
    <div className="has-bottom-nav" style={{ minHeight: '100dvh' }}>
      {/* ─── Client Top App Bar ─── */}
      <header className="top-app-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src={data.store?.logo_url || '/logo_houssem.jpeg'}
            alt={data.store?.name || 'Bieny Coffeeshop'}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(24, 16, 10, 0.16)',
              border: '1.5px solid rgba(212, 160, 84, 0.4)',
            }}
          />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-md)',
                fontWeight: 700,
                color: 'var(--espresso)',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              {data.store?.name || 'Bieny Coffeeshop'}
            </div>
            <div
              style={{
                fontSize: 'var(--text-2xs)',
                color: 'var(--gold-dark)',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Carte de Fidélité
            </div>
          </div>
        </div>

        {/* Live sync & Client First Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 11px',
              borderRadius: 'var(--r-pill)',
              background: 'var(--crema-surface)',
              border: '1px solid var(--crema-border)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--espresso)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isRefreshing ? 'var(--gold)' : 'var(--sage)',
                boxShadow: `0 0 6px ${isRefreshing ? 'var(--gold)' : 'var(--sage)'}`,
                display: 'inline-block',
                transition: 'background 0.2s ease',
              }}
            />
            {data.customer.first_name}
          </span>
        </div>
      </header>

      {/* ─── Main Content Shell ─── */}
      <main className="shell animate-in">
        {/* VIEW 1: MA CARTE */}
        {view === 'card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Status alerts */}
            {expired && (
              <div
                style={{
                  background: 'var(--coral-light)',
                  border: '1.5px solid var(--coral-border)',
                  borderRadius: 'var(--r-lg)',
                  padding: '1.15rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  color: 'var(--coral)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                <div>
                  <strong style={{ fontSize: 'var(--text-base)', display: 'block' }}>Cycle de 30 jours terminé</strong>
                  <div style={{ fontSize: 'var(--text-sm)', marginTop: '0.25rem', lineHeight: 1.45 }}>
                    Votre cycle de fidélité est arrivé à son terme. Rendez-vous au comptoir de votre barista pour débuter un nouveau cycle.
                  </div>
                </div>
              </div>
            )}

            {availableReward && (
              <div
                className="animate-in"
                style={{
                  background: 'linear-gradient(135deg, #EEF7F1 0%, #D8EDE0 100%)',
                  border: '1.5px solid var(--sage)',
                  borderRadius: 'var(--r-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 8px 24px var(--sage-glow)',
                  animation: 'rewardPop 0.5s var(--ease-spring) both',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'var(--sage)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px var(--sage-glow)',
                  }}
                >
                  🎉
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--sage-dark)', fontSize: 'var(--text-base)', fontWeight: 800 }}>
                    Félicitations ! Remise de -30% débloquée
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--espresso)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                    Présentez votre carte au barista lors de votre commande pour profiter de votre récompense.
                  </div>
                  {availableReward.expires_at && (
                    <div style={{ marginTop: '0.35rem', fontSize: 'var(--text-2xs)', fontWeight: 700, color: 'var(--coral)' }}>
                      ⏳ Valable jusqu’au {fmtDateTime(availableReward.expires_at)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {warnExpiring && !availableReward && (
              <div
                style={{
                  background: 'var(--notif-reminder-bg)',
                  border: '1.5px solid var(--notif-reminder-bdr)',
                  borderRadius: 'var(--r-md)',
                  padding: '0.9rem 1.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--notif-reminder-text)',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>⏳</span>
                <span>
                  Plus que <strong>{daysTillExpiry} jour(s)</strong> avant l'expiration de votre carte !
                </span>
              </div>
            )}

            {/* ── Apple Wallet Style Luxury Loyalty Card ── */}
            <div
              className="ui-card ui-card--espresso"
              style={{
                padding: '1.6rem 1.4rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Radial ambient gold halo */}
              <div
                style={{
                  position: 'absolute',
                  top: '-30%',
                  right: '-15%',
                  width: '320px',
                  height: '320px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(212, 160, 84, 0.22) 0%, transparent 68%)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ position: 'relative', zIndex: 2 }}>
                {/* Card Top: Logo & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={data.store?.logo_url || '/logo_houssem.jpeg'}
                      alt={data.store?.name || 'Logo'}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        objectFit: 'cover',
                        border: '1.5px solid rgba(212, 160, 84, 0.5)',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 'var(--text-2xs)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 800 }}>
                        {data.store?.name || 'Bieny Loyalty Club'}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 'var(--text-xl)',
                          fontWeight: 700,
                          color: '#FAF8F5',
                          lineHeight: 1.15,
                        }}
                      >
                        {data.customer.first_name} {data.customer.last_name}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 800,
                      padding: '4px 11px',
                      borderRadius: 'var(--r-pill)',
                      background: expired ? 'rgba(201, 74, 74, 0.25)' : 'rgba(98, 150, 119, 0.28)',
                      color: expired ? '#FF9E9E' : '#B4E8C8',
                      border: `1px solid ${expired ? 'rgba(201, 74, 74, 0.45)' : 'rgba(98, 150, 119, 0.5)'}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {expired ? 'Expirée' : 'Active'}
                  </span>
                </div>

                {/* Card Number & Stamps Count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
                  <div>
                    <code style={{ fontSize: 'var(--text-sm)', letterSpacing: '0.12em', color: 'var(--gold-light)', fontWeight: 700 }}>
                      {card.card_number}
                    </code>
                    <div style={{ fontSize: 'var(--text-2xs)', opacity: 0.65, marginTop: '0.2rem' }}>
                      Ouverte le {fmtDate(card.start_date)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', fontWeight: 800, lineHeight: 1 }}>
                      {done} <span style={{ fontSize: 'var(--text-lg)', color: 'var(--gold)', fontWeight: 700 }}>/ {total}</span>
                    </div>
                    <div style={{ fontSize: 'var(--text-2xs)', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7, marginTop: '0.25rem' }}>
                      Tampons Café
                    </div>
                  </div>
                </div>

                {/* Progress bar inside card */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '999px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '999px',
                        width: `${progressPercent}%`,
                        background: 'var(--gold-gradient)',
                        boxShadow: '0 0 10px var(--gold-glow)',
                        transition: 'width 0.4s var(--ease-spring)',
                      }}
                    />
                  </div>
                </div>

                {/* ── 9 Stamp Circles: Balanced 3x3 Grid ── */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '11px',
                    maxWidth: '360px',
                    margin: '0 auto 1.25rem auto',
                  }}
                >
                  {Array.from({ length: total }).map((_, i) => {
                    const isStamped = i < done;
                    const isLast = i === total - 1;
                    const isCurrent = i === done - 1;

                    return (
                      <div
                        key={i}
                        className={isCurrent ? 'stamp-pop' : ''}
                        style={{
                          aspectRatio: '1',
                          minHeight: '62px',
                          borderRadius: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          background: isStamped
                            ? isLast
                              ? 'var(--gold-gradient)'
                              : '#FAF8F5'
                            : 'rgba(255, 255, 255, 0.06)',
                          color: isStamped
                            ? 'var(--espresso)'
                            : 'rgba(255, 255, 255, 0.35)',
                          border: isStamped
                            ? isLast
                              ? '2px solid rgba(240, 211, 155, 0.8)'
                              : '1px solid rgba(255, 255, 255, 0.4)'
                            : '1.5px dashed rgba(255, 255, 255, 0.18)',
                          boxShadow: isStamped
                            ? isLast
                              ? '0 6px 18px var(--gold-glow)'
                              : '0 4px 12px rgba(0,0,0,0.22)'
                            : 'none',
                          transition: 'all 0.25s var(--ease-spring)',
                          position: 'relative',
                        }}
                      >
                        <div>
                          {isStamped ? (
                            isLast ? (
                              <GiftIcon size={24} color="var(--espresso)" />
                            ) : (
                              <CoffeeIcon size={22} color="var(--espresso)" />
                            )
                          ) : isLast ? (
                            <GiftIcon size={20} color="rgba(255, 255, 255, 0.3)" />
                          ) : (
                            <CoffeeIcon size={18} color="rgba(255, 255, 255, 0.25)" />
                          )}
                        </div>

                        <span
                          style={{
                            fontSize: 'var(--text-2xs)',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            color: isStamped
                              ? 'var(--espresso)'
                              : 'rgba(255, 255, 255, 0.5)',
                          }}
                        >
                          {isLast ? '-30%' : `#${i + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Motivational cue */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', opacity: 0.9 }}>
                  <span>
                    {done >= total
                      ? '🎉 Cycle complet ! Récompense de 30% débloquée.'
                      : `Encore ${total - done} café${total - done > 1 ? 's' : ''} pour votre remise`}
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--gold)' }}>
                    {progressPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* ── Validity Card ── */}
            <div className="ui-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div className="section-label">Période de Validité</div>
                <span
                  style={{
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 700,
                    color: expired ? 'var(--coral)' : 'var(--sage-dark)',
                  }}
                >
                  {expired ? 'Cycle Expiré' : `${daysTillExpiry ?? 0} jour(s) restant(s)`}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ouverture
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--espresso)', marginTop: '0.15rem' }}>
                    {fmtDate(card.start_date)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Expiration
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: expired ? 'var(--coral)' : 'var(--espresso)', marginTop: '0.15rem' }}>
                    {fmtDate(card.expiration_date)}
                  </div>
                </div>
              </div>

              <div style={{ height: '6px', borderRadius: '999px', background: 'var(--crema-subtle)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: '999px',
                    width: `${expired ? 100 : Math.max(4, Math.min(100, (((30 - (daysTillExpiry ?? 0)) / 30) * 100)))}%`,
                    background: expired ? 'var(--coral)' : 'var(--sage)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            {/* ── QR Code de la carte ── */}
            <div className="ui-card" style={{ padding: '1.4rem', textAlign: 'center' }}>
              <div className="section-label">Identification en Caisse</div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>
                Votre QR Code Client
              </h3>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
                {qrCodeData || cardUrl ? (
                  <div
                    style={{
                      padding: '12px',
                      background: '#FFFFFF',
                      borderRadius: 'var(--r-lg)',
                      border: '1.5px solid var(--crema-border)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData || cardUrl)}`}
                      alt="QR code de votre carte de fidélité"
                      width={200}
                      height={200}
                      style={{ borderRadius: '8px', display: 'block' }}
                    />
                  </div>
                ) : (
                  <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--coffee-mid)' }}>
                    Chargement…
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'inline-block',
                  background: 'var(--crema-subtle)',
                  padding: '4px 12px',
                  borderRadius: 'var(--r-pill)',
                  border: '1px solid var(--crema-border)',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: 'var(--espresso)',
                  marginBottom: '0.5rem',
                }}
              >
                {card.card_number}
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--coffee-mid)', margin: 0, lineHeight: 1.45 }}>
                Présentez ce QR code à chaque passage pour enregistrer votre boisson.
              </p>
            </div>

            {/* ── Instructions Banner ── */}
            <div
              className="ui-card"
              style={{
                padding: '1.25rem 1.35rem',
                background: 'linear-gradient(135deg, #FAF8F5 0%, #F4EFEA 100%)',
                border: '1.5px solid var(--crema-border)',
                borderRadius: 'var(--r-xl)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🎁</span>
                <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--espresso)' }}>
                  Programme Fidélité {data.store?.name || ''}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--coffee-mid)', lineHeight: 1.5 }}>
                Cumulez des tampons à chaque visite et débloquez vos réductions et récompenses exclusives en présentant votre QR code en caisse.
              </p>
            </div>

            {/* ── How it works ── */}
            <div className="ui-card ui-card--subtle" style={{ padding: '1.35rem' }}>
              <div style={{ fontWeight: 800, fontSize: 'var(--text-sm)', color: 'var(--espresso)', marginBottom: '0.85rem' }}>
                ☕ Fonctionnement du Programme
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: 'var(--text-sm)', color: 'var(--espresso)', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--espresso)', color: '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
                    1
                  </span>
                  <span>Donnez votre numéro <strong>{card.card_number}</strong> ou montrez votre QR en caisse.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--espresso)', color: '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
                    2
                  </span>
                  <span>Chaque café validé ajoute automatiquement <strong>1 tampon</strong> à votre carte.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--gold)', color: 'var(--espresso)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
                    3
                  </span>
                  <span>Au <strong>9ème café</strong>, débloquez <strong>30% de réduction</strong> immédiate !</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: RECOMPENSES */}
        {view === 'reward' && (
          <div className="animate-in">
            <div className="section-header">
              <div className="section-label">Vos Avantages</div>
              <h2 className="section-title">
                Récompenses & Privilèges
              </h2>
            </div>

            {data.rewards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">🎫</div>
                <div className="empty-state__title">
                  Aucune remise active
                </div>
                <p className="empty-state__desc">
                  Plus que {total - done} café{total - done > 1 ? 's' : ''} à savourer pour débloquer votre réduction de 30% !
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {data.rewards.map((r) => {
                  const isDateExpired = new Date(r.expires_at).getTime() <= Date.now();
                  const isAvailable = r.status === 'available' && !isDateExpired;
                  const isUsed = r.status === 'used';

                  return (
                    <div
                      key={r.id}
                      className="ui-card"
                      style={{
                        padding: '1.35rem',
                        background: isAvailable ? 'linear-gradient(135deg, #EEF7F1 0%, #FAF8F5 100%)' : 'var(--crema-surface)',
                        border: `1.5px solid ${isAvailable ? 'var(--sage)' : 'var(--crema-border)'}`,
                        boxShadow: isAvailable ? '0 6px 20px var(--sage-glow)' : 'var(--shadow-xs)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
                          <span
                            className={`ui-badge ${
                              isAvailable ? 'ui-badge--sage' : isUsed ? 'ui-badge--neutral' : 'ui-badge--coral'
                            }`}
                          >
                            {isAvailable ? 'Prête à l’usage' : isUsed ? 'Utilisée' : 'Expirée'}
                          </span>
                        </div>

                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 'var(--text-3xl)',
                            fontWeight: 800,
                            color: isAvailable ? 'var(--sage-dark)' : 'var(--espresso)',
                            lineHeight: 1.1,
                          }}
                        >
                          -{r.discount_percentage}%
                        </div>

                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--coffee-mid)', marginTop: '0.4rem' }}>
                          {isUsed
                            ? `Consommée le ${fmtDateTime(r.used_at)}`
                            : `Valable jusqu'au ${fmtDateTime(r.expires_at)}`}
                        </div>
                      </div>

                      <div style={{ fontSize: '2.5rem' }}>
                        {isAvailable ? '🎁' : isUsed ? '☕' : '⌛'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: HISTORIQUE */}
        {view === 'history' && (
          <div className="animate-in">
            <div className="section-header">
              <div className="section-label">Journal d'activité</div>
              <h2 className="section-title">
                Historique des Passages ({data.history.length})
              </h2>
            </div>

            {data.history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📜</div>
                <div className="empty-state__title">
                  Aucun passage enregistré
                </div>
                <p className="empty-state__desc">
                  Vos consommations validées par le barista s'afficheront ici en direct.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {data.history.map((h) => {
                  const dateObj = new Date(h.created_at);
                  const dateStr = new Intl.DateTimeFormat('fr-FR', {
                    timeZone: 'Africa/Tunis',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(dateObj);

                  return (
                    <div
                      key={h.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.95rem 1.15rem',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--crema-surface)',
                        border: '1px solid var(--crema-border)',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'var(--crema-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--espresso)',
                          }}
                        >
                          <CoffeeIcon size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--espresso)' }}>
                            {dateStr}
                          </div>
                          <code style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', fontFamily: 'monospace' }}>
                            {h.transaction_reference}
                          </code>
                        </div>
                      </div>

                      <span
                        className={`ui-badge ${h.status === 'cancelled' ? 'ui-badge--coral' : 'ui-badge--sage'}`}
                      >
                        {h.status === 'cancelled' ? 'Annulée' : 'Validée'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <PwaInstallPrompt token={token} />
      <ClientPushOptIn token={token} />

      {/* ─── Client Mobile Bottom Tab Bar ─── */}
      <nav className="bottom-app-bar" aria-label="Navigation client">
        <button
          type="button"
          onClick={() => setView('card')}
          className={`bottom-tab ${view === 'card' ? 'bottom-tab--active' : ''}`}
        >
          <div className="bottom-tab__icon-wrap">
            <CoffeeIcon size={20} />
          </div>
          <span className="bottom-tab__label">Ma Carte</span>
        </button>

        <button
          type="button"
          onClick={() => setView('reward')}
          className={`bottom-tab ${view === 'reward' ? 'bottom-tab--active' : ''}`}
        >
          <div className="bottom-tab__icon-wrap" style={{ position: 'relative' }}>
            <GiftIcon size={20} />
            {availableRewardsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  boxShadow: '0 0 6px var(--gold)',
                }}
              />
            )}
          </div>
          <span className="bottom-tab__label">
            Récompenses {availableRewardsCount > 0 ? `(${availableRewardsCount})` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setView('history')}
          className={`bottom-tab ${view === 'history' ? 'bottom-tab--active' : ''}`}
        >
          <div className="bottom-tab__icon-wrap">
            <HistoryIcon size={20} />
          </div>
          <span className="bottom-tab__label">Historique</span>
        </button>
      </nav>

      {/* ─── Push Notification Click Popup Modal ─── */}
      <NotificationModal store={data.store} />
    </div>
  );
}
