'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function QrScannerFab() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'resolving' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      stop();
      setStatus('idle');
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // @ts-ignore
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
          setStatus('scanning');
          scanLoop();
        } else {
          setStatus('error');
          setError("Sur iPhone / Safari, vous pouvez scanner le QR code directement avec l'appareil photo de votre téléphone, il vous redirigera automatiquement !");
        }
      } catch (e: any) {
        setStatus('error');
        setError(e?.message ?? 'Accès caméra refusé');
      }
    })();

    return () => { cancelled = true; stop(); };
  }, [open]);

  const scanLoop = () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector) return;
    const tick = async () => {
      if (video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          if (codes && codes.length > 0) {
            const raw = codes[0].rawValue as string;
            await handleValue(raw);
            return;
          }
        } catch {
          // ignore frame errors
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const extractToken = (value: string): string | null => {
    // Accept full URL or raw token
    try {
      const url = new URL(value);
      const m = url.pathname.match(/\/client\/([^/?#]+)/);
      if (m) return m[1];
    } catch {
      // not a URL
    }
    if (/^[A-Za-z0-9_-]{20,}$/.test(value.trim())) return value.trim();
    return null;
  };

  const handleValue = async (value: string) => {
    stop();
    setStatus('resolving');

    // 1. Détection directe si c'est déjà une URL /serveur/customers/[id]
    const directCust = value.match(/\/serveur\/customers\/([a-zA-Z0-9-]+)/);
    if (directCust && directCust[1]) {
      setOpen(false);
      router.push(`/serveur/customers/${directCust[1]}`);
      return;
    }

    // 2. Détection du token client /client/[token]
    const token = extractToken(value);
    if (!token) {
      setStatus('error');
      setError('QR code non reconnu (lien client attendu).');
      return;
    }
    try {
      const res = await fetch('/api/server/customers/resolve-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.customer_id) {
        throw new Error(data?.error?.message ?? 'Client introuvable');
      }
      setOpen(false);
      router.push(`/serveur/customers/${data.customer_id}`);
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Erreur');
    }
  };

  const [manual, setManual] = useState('');

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Scanner un QR code client"
        style={{
          position: 'fixed',
          bottom: '5.5rem',
          right: '1rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--espresso) 0%, #301B0E 100%)',
          color: '#FAF9F6',
          border: '2px solid #FAF7F2',
          boxShadow: '0 8px 24px rgba(24, 16, 10, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          cursor: 'pointer',
          zIndex: 95,
        }}
      >
        📷
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '1.25rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--espresso)', margin: 0 }}>
                Scanner une carte client
              </h3>
              <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--coffee-mid)' }}>✕</button>
            </div>

            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', borderRadius: '12px', background: '#000', marginBottom: '0.75rem', aspectRatio: '1 / 1', objectFit: 'cover' }}
            />

            <div style={{ fontSize: '0.82rem', color: 'var(--coffee-mid)', marginBottom: '0.75rem', textAlign: 'center' }}>
              {status === 'scanning' && 'Alignez le QR code du client dans le cadre…'}
              {status === 'resolving' && 'Recherche du client…'}
              {status === 'error' && <span style={{ color: 'var(--coral)' }}>⚠️ {error}</span>}
            </div>

            {/* Fallback manual input */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Ou collez le lien client ici…"
                style={{ flex: 1, padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1.5px solid var(--crema-border)', fontSize: '0.84rem' }}
              />
              <button
                type="button"
                className="touch-btn touch-btn--primary"
                style={{ minHeight: '38px', padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                onClick={() => handleValue(manual)}
                disabled={!manual.trim() || status === 'resolving'}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}