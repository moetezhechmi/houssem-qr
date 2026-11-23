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
};

type View = 'card' | 'menu' | 'reward' | 'history';

export default function ClientCard({ token, initialData }: { token: string; initialData: CardData }) {
  const [data, setData] = useState<CardData>(initialData);
  const [view, setView] = useState<View>('card');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cardUrl, setCardUrl] = useState('');

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    const r = await fetchClientCard(token);
    if (r.ok && r.data) setData(r.data);
    setIsRefreshing(false);
  }, [token]);

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail && ['card', 'menu', 'reward', 'history'].includes(e.detail)) {
        setView(e.detail);
      }
    };
    window.addEventListener('bieny_navigate_view', handleNav);
    return () => window.removeEventListener('bieny_navigate_view', handleNav);
  }, []);

  useEffect(() => {
    setCardUrl(window.location.href);
    // Persist personal token for PWA reopen
    try { localStorage.setItem('last_card_token', token); } catch {}
    try { document.cookie = `last_card_token=${token}; path=/; max-age=31536000; SameSite=Lax`; } catch {}
    // Register service worker early so push subscription can resolve
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
    const timer = setInterval(refresh, 10_000);
    return () => {
      subs.forEach((c) => c.unsubscribe());
      clearInterval(timer);
    };
  }, [data?.customer?.id, refresh]);

  const card = data.card;
  const cycle = data.active_cycle;
  const done = cycle ? cycle.current_consumptions : 0;
  const total = cycle ? cycle.required_consumptions : 9;
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
            src="/logo_houssem.jpeg"
            alt="Bieny Coffeeshop"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(24, 16, 10, 0.15)',
            }}
          />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--espresso)',
                lineHeight: 1.15,
              }}
            >
              Bieny Coffeeshop
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                color: 'var(--coffee-mid)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Carte de Fidélité Digitale
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
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'var(--crema-subtle)',
              border: '1px solid var(--crema-border)',
              fontSize: '0.76rem',
              fontWeight: 700,
              color: 'var(--espresso)',
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
          <div>
            {/* Status alerts */}
            {expired && (
              <div
                style={{
                  background: 'var(--coral-light)',
                  border: '1.5px solid var(--coral-border)',
                  borderRadius: 'var(--r-md)',
                  padding: '1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  color: 'var(--coral)',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <div>
                  <strong style={{ fontSize: '0.92rem' }}>Carte expirée</strong>
                  <div style={{ fontSize: '0.82rem', marginTop: '0.2rem', lineHeight: 1.4 }}>
                    Votre cycle de 30 jours est arrivé à son terme. Demandez à votre barista de renouveler votre carte pour redémarrer un cycle.
                  </div>
                </div>
              </div>
            )}

            {availableReward && (
              <div
                className="animate-in"
                style={{
                  background: 'var(--sage-light)',
                  border: '2px solid var(--sage)',
                  borderRadius: 'var(--r-md)',
                  padding: '1.1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 8px 24px rgba(62, 123, 92, 0.18)',
                  animation: 'rewardPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                }}
              >
                <span style={{ fontSize: '2rem' }}>🎉</span>
                <div>
                  <strong style={{ color: 'var(--sage)', fontSize: '0.96rem' }}>
                    Félicitations ! Vous avez débloqué une réduction de 30 % sur votre prochaine commande.
                  </strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--espresso)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                    Présentez votre carte en caisse lors de votre commande pour profiter de votre remise.
                    {availableReward.expires_at && (
                      <div style={{ marginTop: '0.35rem', fontWeight: 700, color: 'var(--coral)' }}>
                        ⏳ Valable jusqu’au {fmtDateTime(availableReward.expires_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {warnExpiring && !availableReward && (
              <div
                style={{
                  background: 'rgba(212, 160, 84, 0.15)',
                  border: '1.5px solid var(--gold)',
                  borderRadius: 'var(--r-md)',
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.84rem',
                  color: '#9E6E28',
                }}
              >
                <span>⏳</span>
                <span>
                  Attention : votre carte expire dans <strong>{daysTillExpiry} jour(s)</strong> !
                </span>
              </div>
            )}

            {/* ── Apple Wallet Style Luxury Loyalty Card ── */}
            <div
              className="ui-card ui-card--espresso"
              style={{
                padding: '1.6rem 1.4rem',
                marginBottom: '1.25rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-40%',
                  right: '-10%',
                  width: '280px',
                  height: '280px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, var(--gold-glow) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ position: 'relative', zIndex: 2 }}>
                {/* Card Top: Logo & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <img
                      src="/logo_houssem.jpeg"
                      alt="Logo"
                      style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>
                        Bieny Loyalty Club
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '1.35rem',
                          fontWeight: 700,
                          color: '#FAF9F6',
                          lineHeight: 1.1,
                        }}
                      >
                        {data.customer.first_name} {data.customer.last_name}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: expired ? 'rgba(201, 74, 74, 0.25)' : 'rgba(62, 123, 92, 0.25)',
                      color: expired ? '#FF9E9E' : '#A2E3BF',
                      border: `1px solid ${expired ? 'rgba(201, 74, 74, 0.4)' : 'rgba(62, 123, 92, 0.4)'}`,
                      textTransform: 'uppercase',
                    }}
                  >
                    {expired ? 'Expirée' : 'Active'}
                  </span>
                </div>

                {/* Card Number & Stamps Count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
                  <div>
                    <code style={{ fontSize: '0.85rem', letterSpacing: '0.1em', opacity: 0.7, color: 'var(--crema-border)' }}>
                      {card.card_number}
                    </code>
                    <div style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: '0.2rem' }}>
                      Ouverte le {fmtDate(card.start_date)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 700, lineHeight: 1 }}>
                      {done} <span style={{ fontSize: '1.1rem', color: 'var(--gold)' }}>/ {total}</span>
                    </div>
                    <div style={{ fontSize: '0.66rem', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7, marginTop: '0.2rem' }}>
                      Tampons
                    </div>
                  </div>
                </div>

                {/* ── 9 Stamp Circles: Balanced 3x3 Grid ── */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    maxWidth: '360px',
                    margin: '0 auto 1.15rem auto',
                  }}
                >
                  {Array.from({ length: total }).map((_, i) => {
                    const isStamped = i < done;
                    const isLast = i === total - 1;

                    return (
                      <div
                        key={i}
                        style={{
                          aspectRatio: '1',
                          borderRadius: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          background: isStamped
                            ? isLast
                              ? 'var(--gold-gradient)'
                              : '#FAF9F6'
                            : 'rgba(255, 255, 255, 0.08)',
                          color: isStamped
                            ? isLast
                              ? 'var(--espresso)'
                              : 'var(--espresso)'
                            : 'rgba(255, 255, 255, 0.4)',
                          border: isStamped
                            ? isLast
                              ? '2px solid rgba(212, 160, 84, 0.6)'
                              : 'none'
                            : '1.5px dashed rgba(255, 255, 255, 0.22)',
                          boxShadow: isStamped
                            ? isLast
                              ? '0 6px 18px var(--gold-glow)'
                              : '0 4px 12px rgba(0,0,0,0.25)'
                            : 'none',
                          transition: 'all 0.2s ease',
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
                            <GiftIcon size={20} color="rgba(255, 255, 255, 0.35)" />
                          ) : (
                            <CoffeeIcon size={18} color="rgba(255, 255, 255, 0.3)" />
                          )}
                        </div>

                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            color: isStamped
                              ? 'var(--espresso)'
                              : 'rgba(255, 255, 255, 0.55)',
                          }}
                        >
                          {isLast ? '-30%' : `#${i + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Motivational cue */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', opacity: 0.85 }}>
                  <span>
                    {done >= total
                      ? '🎉 Cycle complété ! Récompense prête.'
                      : `Plus que ${total - done} boisson${total - done > 1 ? 's' : ''} pour votre remise`}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {Math.round((done / total) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* ── Validity Card ── */}
            <div className="ui-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                Période de validité du cycle
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)' }}>Date de création</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--espresso)', marginTop: '0.15rem' }}>
                    {fmtDate(card.start_date)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)' }}>Date d’expiration</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: expired ? 'var(--coral)' : 'var(--espresso)', marginTop: '0.15rem' }}>
                    {fmtDate(card.expiration_date)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--coffee-mid)' }}>Temps restant</span>
                <strong style={{ color: expired ? 'var(--coral)' : 'var(--sage)' }}>
                  {expired ? 'Cycle expiré' : `${daysTillExpiry ?? 0} jour(s)`}
                </strong>
              </div>

              <div style={{ height: '6px', borderRadius: '999px', background: 'var(--crema-subtle)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: '999px',
                    width: `${expired ? 100 : Math.max(4, Math.min(100, (((30 - (daysTillExpiry ?? 0)) / 30) * 100)))}%`,
                    background: expired ? 'var(--coral)' : 'var(--sage)',
                  }}
                />
              </div>
            </div>

            {/* ── QR Code de la carte ── */}
            <div className="ui-card" style={{ marginBottom: '1.25rem', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                Votre QR code personnel
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                {cardUrl ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(cardUrl)}`}
                    alt="QR code de votre carte de fidélité"
                    width={180}
                    height={180}
                    style={{ borderRadius: '12px', border: '1.5px solid var(--crema-border)', background: '#FFFFFF', padding: '8px' }}
                  />
                ) : (
                  <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--coffee-mid)' }}>…</div>
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--coffee-mid)', margin: 0, lineHeight: 1.4 }}>
                Présentez ce QR code en caisse pour que votre barista valide vos consommations.
              </p>
            </div>

            {/* ── Quick Menu Banner Shortcut ── */}
            <div
              className="ui-card"
              onClick={() => setView('menu')}
              style={{
                marginBottom: '1.25rem',
                padding: '1.1rem 1.25rem',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #FAF7F2 0%, #F3ECE1 100%)',
                border: '1.5px solid var(--crema-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--espresso)',
                    color: 'var(--gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(44, 30, 22, 0.2)',
                  }}
                >
                  <BookOpenIcon size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--espresso)' }}>
                    Consulter le Menu Bieny
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--coffee-mid)', marginTop: '0.15rem' }}>
                    Boissons chaudes, fraîches & douceurs
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--crema-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--crema-border)',
                  color: 'var(--espresso)',
                  fontSize: '0.9rem',
                }}
              >
                →
              </div>
            </div>

            {/* ── How it works ── */}
            <div className="ui-card" style={{ background: 'var(--crema-subtle)', padding: '1.25rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--espresso)', marginBottom: '0.6rem' }}>
                ☕ Comment fonctionne votre carte ?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--espresso)', lineHeight: 1.45 }}>
                <div>1. Donnez votre numéro <strong>{card.card_number}</strong> à chaque commande en caisse.</div>
                <div>2. Chaque café consommé ajoute <strong>1 tampon</strong>.</div>
                <div>3. Au <strong>9ème café</strong>, vous bénéficiez immédiatement de <strong>30% de réduction</strong> !</div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: RECOMPENSES */}
        {view === 'reward' && (
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--espresso)',
                marginBottom: '1rem',
              }}
            >
              Vos Récompenses & Remises
            </h2>

            {data.rewards.length === 0 ? (
              <div className="ui-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎫</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--espresso)' }}>
                  Aucune récompense pour le moment
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--coffee-mid)', marginTop: '0.25rem' }}>
                  Plus que {total - done} consommation{total - done > 1 ? 's' : ''} pour débloquer votre réduction de 30% !
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.rewards.map((r) => {
                  const isDateExpired = new Date(r.expires_at).getTime() <= Date.now();
                  const isAvailable = r.status === 'available' && !isDateExpired;
                  const isUsed = r.status === 'used';

                  return (
                    <div
                      key={r.id}
                      className="ui-card"
                      style={{
                        padding: '1.25rem',
                        background: isAvailable ? 'var(--sage-light)' : 'var(--crema-surface)',
                        border: `1.5px solid ${isAvailable ? 'var(--sage)' : 'var(--crema-border)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                          <span
                            className={`ui-badge ${
                              isAvailable ? 'ui-badge--sage' : isUsed ? 'ui-badge--neutral' : 'ui-badge--coral'
                            }`}
                          >
                            {isAvailable ? 'Prête à utiliser' : isUsed ? 'Consommée' : 'Expirée'}
                          </span>
                        </div>

                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: isAvailable ? 'var(--sage)' : 'var(--espresso)',
                            lineHeight: 1.1,
                          }}
                        >
                          -{r.discount_percentage}%
                        </div>

                        <div style={{ fontSize: '0.76rem', color: 'var(--coffee-mid)', marginTop: '0.35rem' }}>
                          {isUsed
                            ? `Utilisée le ${fmtDateTime(r.used_at)}`
                            : `Valable jusqu'au ${fmtDateTime(r.expires_at)}`}
                        </div>
                      </div>

                      <div style={{ fontSize: '2.4rem' }}>
                        {isAvailable ? '🎫' : isUsed ? '☕' : '⌛'}
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
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--espresso)',
                marginBottom: '1rem',
              }}
            >
              Historique des passages ({data.history.length})
            </h2>

            {data.history.length === 0 ? (
              <div className="ui-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📜</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--espresso)' }}>
                  Aucun passage enregistré
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--coffee-mid)', marginTop: '0.25rem' }}>
                  Vos consommations validées par le serveur apparaîtront ici en direct.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
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
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--r-sm)',
                        background: 'var(--crema-surface)',
                        border: '1px solid var(--crema-border)',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.15rem' }}>☕</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--espresso)' }}>
                            {dateStr}
                          </div>
                          <code style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', fontFamily: 'monospace' }}>
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
        {/* VIEW 4: MENU */}
        {view === 'menu' && (
          <div className="animate-in" style={{ paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: 'var(--espresso)',
                    lineHeight: 1.2,
                  }}
                >
                  Notre Menu Gourmand
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--coffee-mid)', marginTop: '0.2rem' }}>
                  Cafés, boissons signature & pâtisseries fraîches
                </div>
              </div>

              <a
                href="https://houssem-qr.onrender.com/qr"
                target="_blank"
                rel="noopener noreferrer"
                className="touch-btn touch-btn--outline"
                style={{
                  minHeight: '36px',
                  padding: '6px 12px',
                  fontSize: '0.76rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '999px',
                  background: 'var(--crema-surface)',
                }}
              >
                <span>Plein écran</span>
                <ExternalLinkIcon size={14} />
              </a>
            </div>

            {/* Menu container iframe */}
            <div
              className="ui-card"
              style={{
                padding: '0',
                overflow: 'hidden',
                borderRadius: 'var(--r-lg)',
                border: '1.5px solid var(--crema-border)',
                background: '#FFFFFF',
                boxShadow: 'var(--shadow-md)',
                height: 'calc(100dvh - 195px)',
                minHeight: '520px',
                position: 'relative',
              }}
            >
              <iframe
                src="https://houssem-qr.onrender.com/qr"
                title="Menu Bieny Coffeeshop"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                  background: 'transparent',
                }}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              />
            </div>
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
          onClick={() => setView('menu')}
          className={`bottom-tab ${view === 'menu' ? 'bottom-tab--active' : ''}`}
        >
          <div className="bottom-tab__icon-wrap">
            <BookOpenIcon size={20} />
          </div>
          <span className="bottom-tab__label">Le Menu</span>
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
      <NotificationModal />
    </div>
  );
}
