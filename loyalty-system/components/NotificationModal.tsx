'use client';

import { useEffect, useState } from 'react';

export interface NotificationPayload {
  title: string;
  body: string;
  type?: string; // 'marketing' | 'reward' | 'reminder' | 'greetings' | 'announcement' | 'generic'
  image_url?: string | null;
  btn_text?: string;
  btn_action?: string; // 'close' | 'menu' | 'reward'
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

  const getBadgeInfo = () => {
    switch (activeNotif.type) {
      case 'marketing':
        return {
          icon: '✨',
          tag: 'Offre Spéciale',
          bg: 'var(--notif-marketing-bg)',
          color: 'var(--notif-marketing-text)',
          border: 'var(--notif-marketing-bdr)',
        };
      case 'reward':
        return {
          icon: '🎁',
          tag: 'Récompense Débloquée',
          bg: 'var(--notif-reward-bg)',
          color: 'var(--notif-reward-text)',
          border: 'var(--notif-reward-bdr)',
        };
      case 'reminder':
        return {
          icon: '⏰',
          tag: 'Rappel Fidélité',
          bg: 'var(--notif-reminder-bg)',
          color: 'var(--notif-reminder-text)',
          border: 'var(--notif-reminder-bdr)',
        };
      case 'greetings':
        return {
          icon: '👋',
          tag: 'Message Bieny',
          bg: 'var(--notif-greetings-bg)',
          color: 'var(--notif-greetings-text)',
          border: 'var(--notif-greetings-bdr)',
        };
      case 'announcement':
        return {
          icon: '📢',
          tag: 'Nouveauté',
          bg: 'var(--notif-announce-bg)',
          color: 'var(--notif-announce-text)',
          border: 'var(--notif-announce-bdr)',
        };
      default:
        return {
          icon: '☕',
          tag: 'Bieny Coffeeshop',
          bg: 'var(--crema-subtle)',
          color: 'var(--espresso)',
          border: 'var(--crema-border)',
        };
    }
  };

  const badge = getBadgeInfo();

  const handleAction = () => {
    const action = activeNotif.btn_action;
    if (action === 'menu') {
      window.dispatchEvent(new CustomEvent('bieny_navigate_view', { detail: 'menu' }));
    } else if (action === 'reward') {
      window.dispatchEvent(new CustomEvent('bieny_navigate_view', { detail: 'reward' }));
    }
    setActiveNotif(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(24, 16, 10, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
          maxWidth: '400px',
          padding: '2rem 1.6rem 1.6rem',
          borderRadius: 'var(--r-xl)',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF8F5 100%)',
          boxShadow: 'var(--shadow-xl)',
          border: '1.5px solid var(--crema-border)',
          position: 'relative',
          textAlign: 'center',
          animation: 'scaleUp 0.28s var(--ease-spring)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => setActiveNotif(null)}
          aria-label="Fermer"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--crema-subtle)',
            border: '1px solid var(--crema-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            color: 'var(--coffee-mid)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          ×
        </button>

        {/* Brand Header */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <img
            src="/logo_houssem.jpeg"
            alt="Bieny Coffeeshop"
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '16px',
              objectFit: 'cover',
              boxShadow: '0 4px 14px rgba(24, 16, 10, 0.15)',
              border: '2px solid rgba(212, 160, 84, 0.4)',
            }}
          />
        </div>

        {/* Tag Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.95rem',
            borderRadius: 'var(--r-pill)',
            backgroundColor: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
            marginBottom: '1rem',
          }}
        >
          <span style={{ fontSize: '1rem' }}>{badge.icon}</span>
          <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {badge.tag}
          </span>
        </div>

        {/* Optional Campaign Media Image */}
        {activeNotif.image_url && (
          <div
            style={{
              marginBottom: '1.15rem',
              borderRadius: 'var(--r-md)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--crema-border)',
            }}
          >
            <img
              src={activeNotif.image_url}
              alt="Illustration notification"
              style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.currentTarget.style.display = 'none'); }}
            />
          </div>
        )}

        {/* Title */}
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--espresso)',
            margin: '0 0 0.65rem',
            lineHeight: 1.25,
          }}
        >
          {activeNotif.title}
        </h3>

        {/* Message body */}
        <p
          style={{
            fontSize: 'var(--text-base)',
            lineHeight: 1.6,
            color: 'var(--coffee-dark)',
            margin: '0 0 1.5rem',
            whiteSpace: 'pre-line',
          }}
        >
          {activeNotif.body}
        </p>

        {/* Action Button */}
        <button
          type="button"
          className="touch-btn touch-btn--gold"
          style={{
            width: '100%',
            padding: '0.9rem 1.25rem',
            borderRadius: 'var(--r-md)',
            fontSize: 'var(--text-base)',
            fontWeight: 800,
            cursor: 'pointer',
          }}
          onClick={handleAction}
        >
          {activeNotif.btn_text || 'Découvrir & Profiter'}
        </button>
      </div>
    </div>
  );
}
