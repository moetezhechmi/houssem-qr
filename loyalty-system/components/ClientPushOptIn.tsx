'use client';

import { useEffect, useState } from 'react';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone === true;
}

export function ClientPushOptIn({ token }: { token: string }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketing, setMarketing] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [iosState, setIosState] = useState(false);
  const [standaloneState, setStandaloneState] = useState(false);

  useEffect(() => {
    setIosState(isIOS());
    setStandaloneState(isStandalone());
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
    // check existing subscription
    if (ok) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setSubscribed(true);
          else if (Notification.permission !== 'denied') {
            // On iOS, push only works in standalone (installed) mode.
            const iosNotInstalled = isIOS() && !isStandalone();
            if (!iosNotInstalled) {
              setTimeout(() => setShowPopup(true), 4000);
            }
          }
        });
      }).catch(() => null);
    }

    // Show notification popup after a successful install
    const onInstalled = () => {
      if (Notification.permission === 'denied') return;
      setTimeout(() => {
        navigator.serviceWorker?.ready?.then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            if (!sub) setShowPopup(true);
          }).catch(() => setShowPopup(true));
        }).catch(() => setShowPopup(true));
      }, 800);
    };
    window.addEventListener('pwa-installed', onInstalled);
    return () => window.removeEventListener('pwa-installed', onInstalled);
  }, []);

  const subscribe = async () => {
    if (!supported || !VAPID_PUBLIC) {
      setError('Notifications non supportées sur ce navigateur.');
      return;
    }
    // iOS requires installed PWA
    if (isIOS() && !isStandalone()) {
      setError('Sur iPhone, installez d’abord la carte sur l’écran d’accueil (Safari → Partager → Ajouter), puis activez les notifications.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Autorisation refusée.');
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      const res = await fetch('/api/server/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ token, subscription: sub.toJSON(), device_type: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop', marketing }),
      });
      // Actually call Edge Function directly? We'll call our Next API proxy.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? 'Échec de l’enregistrement');
      }
      setSubscribed(true);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch('/api/server/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ token, endpoint: sub.endpoint }),
        });
      }
      setSubscribed(false);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="ui-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          Notifications
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--coral)', margin: 0, lineHeight: 1.4 }}>
          Notifications non supportées sur ce navigateur/appareil.
          <br />
          <span style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)' }}>
            debug: standalone={String(standaloneState)} ios={String(iosState)} vapid={VAPID_PUBLIC ? 'ok' : 'MISSING'}
          </span>
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="ui-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
        Notifications
      </div>
      <p style={{ fontSize: '0.84rem', color: 'var(--espresso)', margin: '0 0 0.75rem', lineHeight: 1.4 }}>
        Activez les notifications pour ne manquer aucune récompense !
      </p>
      {error && (
        <div style={{ background: 'var(--coral-light)', border: '1px solid var(--coral-border)', borderRadius: 'var(--r-sm)', padding: '0.6rem 0.75rem', color: 'var(--coral)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          ⚠️ {error}
        </div>
      )}
      {iosState && !standaloneState && (
        <div style={{ fontSize: '0.78rem', color: 'var(--coffee-mid)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
          Sur iPhone, installez d’abord la carte sur l’écran d’accueil (Safari → Partager → Ajouter), puis activez les notifications.
        </div>
      )}
      <div style={{ fontSize: '0.68rem', color: 'var(--coffee-mid)', marginTop: '0.5rem', opacity: 0.7 }}>
        debug: standalone={String(standaloneState)} ios={String(iosState)} perm={permission} vapid={VAPID_PUBLIC ? 'ok' : 'MISSING'} sub={String(subscribed)} err={error ?? 'none'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {subscribed ? (
          <>
            <span className="ui-badge ui-badge--sage">Activées</span>
            <button type="button" className="touch-btn touch-btn--outline" style={{ minHeight: '38px', fontSize: '0.8rem' }} onClick={unsubscribe} disabled={loading}>
              {loading ? '…' : 'Désactiver'}
            </button>
          </>
        ) : (
          <button type="button" className="touch-btn touch-btn--primary" style={{ minHeight: '38px', fontSize: '0.8rem' }} onClick={subscribe} disabled={loading || permission === 'denied'}>
            {loading ? '…' : 'Activer les notifications'}
          </button>
        )}
        {permission === 'denied' && (
          <span style={{ fontSize: '0.76rem', color: 'var(--coral)' }}>Notifications bloquées dans le navigateur.</span>
        )}
      </div>
      {subscribed && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--coffee-mid)' }}>
          <input type="checkbox" checked={marketing} onChange={async (e) => {
            const val = e.target.checked;
            setMarketing(val);
            if (subscribed && supported) {
              try {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                  await fetch('/api/server/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ token, subscription: sub.toJSON(), device_type: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop', marketing: val }),
                  });
                }
              } catch {}
            }
          }} />
          Recevoir les promotions et offres spéciales
        </label>
      )}
    </div>

    {showPopup && !subscribed && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(false); }}
      >
        <div style={{ width: '100%', maxWidth: '380px', background: '#FFFFFF', borderRadius: '22px', padding: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🔔</div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 0.5rem' }}>
            Ne manquez aucune récompense !
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--coffee-mid)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Activez les notifications pour être informé de vos récompenses et des offres spéciales.
          </p>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button type="button" className="touch-btn touch-btn--outline" style={{ flex: 1, minHeight: '42px', fontSize: '0.82rem' }} onClick={() => setShowPopup(false)}>
              Plus tard
            </button>
            <button type="button" className="touch-btn touch-btn--primary" style={{ flex: 1, minHeight: '42px', fontSize: '0.82rem' }} onClick={() => { setShowPopup(false); subscribe(); }} disabled={loading}>
              {loading ? '…' : 'Activer'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}