'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'pwa_prompt_dismissed_at';
const INSTALLED_KEY = 'pwa_installed';
const TOKEN_KEY = 'last_card_token';
const DISMISS_DAYS = 7;

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

function isSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone === true;
}

export function PwaInstallPrompt({ token }: { token: string }) {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [nonSafari, setNonSafari] = useState(false);
  const [installed, setInstalled] = useState(false);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }
  }, []);

  // Store last card token for standalone reopen
  useEffect(() => {
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
  }, [token]);

  // Detect installed state
  useEffect(() => {
    try { if (localStorage.getItem(INSTALLED_KEY) === '1') setInstalled(true); } catch {}
    const handler = () => {
      setInstalled(true);
      try { localStorage.setItem(INSTALLED_KEY, '1'); } catch {}
      setShow(false);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  // beforeinstallprompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      // show popup unless recently dismissed or already installed/standalone
      if (isStandalone() || installed) return;
      let dismissed = 0;
      try { dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0); } catch {}
      const days = (Date.now() - dismissed) / 86_400_000;
      if (dismissed && days < DISMISS_DAYS) return;
      // delay after full load
      setTimeout(() => setShow(true), 1500);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [installed]);

  // iOS handling: show instructions after load if not standalone/installed
  useEffect(() => {
    if (isStandalone() || installed) return;
    if (!isIOS()) return;
    let dismissed = 0;
    try { dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0); } catch {}
    const days = (Date.now() - dismissed) / 86_400_000;
    if (dismissed && days < DISMISS_DAYS) return;
    setIosMode(true);
    setNonSafari(!isSafari());
    setTimeout(() => setShow(true), 1500);
  }, [installed]);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      try { localStorage.setItem(INSTALLED_KEY, '1'); } catch {}
      // Request notification permission right after install (user gesture context)
      try {
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch {}
      try { window.dispatchEvent(new Event('pwa-installed')); } catch {}
    } else {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    }
    setDeferred(null);
    setShow(false);
  };

  if (isStandalone() || installed) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          padding: '0.5rem 0.85rem',
          borderRadius: '999px',
          background: 'var(--sage)',
          color: '#FFFFFF',
          border: 'none',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          zIndex: 90,
          boxShadow: '0 4px 14px rgba(62,123,92,0.35)',
        }}
      >
        ✓ Installée
      </button>
    );
  }

  return (
    <>
      {/* Floating install button (re-open) */}
      <button
        type="button"
        onClick={() => setShow(true)}
        style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          padding: '0.5rem 0.85rem',
          borderRadius: '999px',
          background: 'var(--gold-gradient)',
          color: 'var(--espresso)',
          border: 'none',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          zIndex: 90,
          boxShadow: '0 4px 14px var(--gold-glow)',
        }}
      >
        📲 Installer ma carte
      </button>

      {show && (
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
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              background: '#FFFFFF',
              borderRadius: '22px',
              padding: '1.5rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>☕</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 0.5rem' }}>
              Gardez votre carte de fidélité à portée de main !
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--coffee-mid)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Ajoutez votre carte à l'écran d'accueil pour la retrouver facilement à chaque visite.
            </p>

            {iosMode ? (
              <>
                {nonSafari ? (
                  <p style={{ fontSize: '0.84rem', color: 'var(--coral)', margin: '0 0 1rem', lineHeight: 1.5 }}>
                    Ouvrez cette page dans <strong>Safari</strong> pour pouvoir ajouter la carte à l'écran d'accueil.
                  </p>
                ) : (
                  <div style={{ background: 'var(--crema-subtle)', borderRadius: '14px', padding: '1rem', marginBottom: '1.25rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', fontSize: '0.84rem', color: 'var(--espresso)' }}>
                      <span style={{ fontSize: '1.2rem' }}>⬆️</span>
                      <span>Appuyez sur <strong>Partager</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--espresso)' }}>
                      <span style={{ fontSize: '1.2rem' }}>➕</span>
                      <span>Puis sur <strong>Ajouter à l'écran d'accueil</strong></span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="touch-btn touch-btn--primary"
                  style={{ width: '100%', minHeight: '44px' }}
                  onClick={async () => {
                    try {
                      if ('Notification' in window && Notification.permission === 'default') {
                        await Notification.requestPermission();
                      }
                    } catch {}
                    dismiss();
                  }}
                >
                  J'ai compris
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="touch-btn touch-btn--outline"
                  style={{ flex: 1, minHeight: '44px' }}
                  onClick={dismiss}
                >
                  Plus tard
                </button>
                <button
                  type="button"
                  className="touch-btn touch-btn--primary"
                  style={{ flex: 1, minHeight: '44px' }}
                  onClick={install}
                  disabled={!deferred}
                >
                  Ajouter à mon écran d'accueil
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}