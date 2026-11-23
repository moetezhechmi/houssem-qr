'use client';

import { useEffect, useState } from 'react';

export interface NotificationPayload {
  title: string;
  body: string;
  type?: string;
  timestamp?: number;
}

export function NotificationModal() {
  const [activeNotif, setActiveNotif] = useState<NotificationPayload | null>(null);

  useEffect(() => {
    // 1. Check URL parameters for ?notif_open=1&notif_data=...
    const checkUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('notif_open') === '1') {
          const raw = params.get('notif_data');
          if (raw) {
            const parsed = JSON.parse(decodeURIComponent(raw));
            setActiveNotif(parsed);
          }
          // Clean URL without reloading page
          params.delete('notif_open');
          params.delete('notif_data');
          const cleanSearch = params.toString() ? `?${params.toString()}` : '';
          window.history.replaceState({}, '', `${window.location.pathname}${cleanSearch}${window.location.hash}`);
        }
      } catch (err) {
        console.error('Failed to parse notif URL params', err);
      }
    };

    checkUrl();

    // 2. Listen to Service Worker postMessage (when notification is clicked while app is already open)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BIENY_NOTIFICATION_CLICK' && event.data?.payload) {
        setActiveNotif(event.data.payload);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!activeNotif) return null;

  const getIconAndBadge = () => {
    switch (activeNotif.type) {
      case 'reward':
        return { icon: '🎁', tag: 'Récompense débloquée', color: '#8FAF9A' };
      case 'marketing':
        return { icon: '✨', tag: 'Offre Spéciale Bieny', color: '#D4A054' };
      case 'reminder':
        return { icon: '⏰', tag: 'Rappel Fidélité', color: '#B87D4B' };
      default:
        return { icon: '☕', tag: 'Message Bieny', color: '#8FAF9A' };
    }
  };

  const badge = getIconAndBadge();

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(24, 16, 10, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={() => setActiveNotif(null)}
    >
      <div
        className="ui-card"
        style={{
          width: '100%',
          maxWidth: '380px',
          padding: '1.75rem 1.5rem',
          borderRadius: '24px',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF9F6 100%)',
          boxShadow: '0 20px 40px rgba(24, 16, 10, 0.25)',
          position: 'relative',
          textAlign: 'center',
          animation: 'scaleUp 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <img
            src="/logo_houssem.jpeg"
            alt="Bieny Logo"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              objectFit: 'cover',
              boxShadow: '0 4px 12px rgba(24, 16, 10, 0.15)',
            }}
          />
        </div>

        {/* Tag Pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', borderRadius: '999px', backgroundColor: '#F0EBE1', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '1rem' }}>{badge.icon}</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3A2E28', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {badge.tag}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.35rem',
            fontWeight: 700,
            color: 'var(--espresso, #18100A)',
            margin: '0 0 0.65rem',
            lineHeight: 1.25,
          }}
        >
          {activeNotif.title}
        </h3>

        {/* Message body */}
        <p
          style={{
            fontSize: '0.92rem',
            lineHeight: 1.55,
            color: 'var(--coffee-dark, #3A2E28)',
            margin: '0 0 1.5rem',
            whiteSpace: 'pre-line',
          }}
        >
          {activeNotif.body}
        </p>

        {/* Action Button */}
        <button
          type="button"
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            borderRadius: '16px',
            fontSize: '0.92rem',
            fontWeight: 700,
            boxShadow: '0 6px 16px rgba(143, 175, 154, 0.4)',
            cursor: 'pointer',
          }}
          onClick={() => setActiveNotif(null)}
        >
          Découvrir & Profiter
        </button>
      </div>
    </div>
  );
}
