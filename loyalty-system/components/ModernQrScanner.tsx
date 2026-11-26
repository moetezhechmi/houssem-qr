'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsQR from 'jsqr';

interface ModernQrScannerProps {
  backHref: string;
  storeName?: string | null;
}

export function ModernQrScanner({ backHref, storeName }: ModernQrScannerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const resolvingRef = useRef(false);

  const [status, setStatus] = useState<'starting' | 'scanning' | 'resolving' | 'error'>('starting');
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manual, setManual] = useState('');

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setHasTorch(false);
    setTorchOn(false);
  }, []);

  const extractToken = (value: string): string | null => {
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

  const handleDecoded = useCallback(async (value: string) => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    stopCamera();
    setStatus('resolving');
    setError(null);

    // 1. URL directe /serveur/customers/[id]
    const directCust = value.match(/\/serveur\/customers\/([a-zA-Z0-9-]+)/);
    if (directCust && directCust[1]) {
      router.push(`/serveur/customers/${directCust[1]}`);
      return;
    }

    // 2. Token client /client/[token]
    const token = extractToken(value);
    if (!token) {
      setStatus('error');
      setError('QR code non reconnu. Scannez une carte fidélité valide.');
      resolvingRef.current = false;
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
      router.push(`/serveur/customers/${data.customer_id}`);
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Erreur lors de la lecture du QR code');
      resolvingRef.current = false;
    }
  }, [router, stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    resolvingRef.current = false;
    setStatus('starting');
    setError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Caméra indisponible sur ce navigateur (HTTPS requis).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities ? (track.getCapabilities() as any) : null;
      if (caps?.torch) setHasTorch(true);

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setStatus('scanning');

      // Utiliser BarcodeDetector natif si dispo, sinon jsQR (compatible iOS/Safari/Firefox/Chrome)
      let detector: any = null;
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }

      const tick = async () => {
        if (resolvingRef.current) return;
        if (video.readyState >= 2 && video.videoWidth > 0) {
          if (detector) {
            try {
              const codes = await detector.detect(video);
              if (codes && codes.length > 0 && codes[0].rawValue) {
                await handleDecoded(codes[0].rawValue);
                return;
              }
            } catch {}
          } else {
            const canvas = canvasRef.current;
            if (canvas) {
              const w = Math.min(video.videoWidth, 640);
              const h = Math.round((video.videoHeight / video.videoWidth) * w);
              if (canvas.width !== w) canvas.width = w;
              if (canvas.height !== h) canvas.height = h;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, w, h);
                const imgData = ctx.getImageData(0, 0, w, h);
                const code = jsQR(imgData.data, w, h, { inversionAttempts: 'dontInvert' });
                if (code?.data) {
                  await handleDecoded(code.data);
                  return;
                }
              }
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Accès à la caméra refusé. Vérifiez les permissions.');
    }
  }, [facingMode, handleDecoded, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      // @ts-ignore
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {}
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #150D08 0%, #24160E 100%)',
        color: '#FAF8F5',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.9rem 1rem',
          borderBottom: '1px solid rgba(212, 160, 84, 0.2)',
          background: 'rgba(21, 13, 8, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Link
          href={backHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.45rem 0.85rem',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#FAF8F5',
            fontSize: '0.82rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          ← Retour
        </Link>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 700, color: '#FAF8F5' }}>
            Scanner Client
          </div>
          {storeName && (
            <div style={{ fontSize: '0.68rem', color: 'var(--gold-light)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {storeName}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
          title="Changer de caméra"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#FAF8F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            cursor: 'pointer',
          }}
        >
          🔄
        </button>
      </header>

      {/* Main Viewfinder Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem 1rem 2rem',
          maxWidth: '520px',
          width: '100%',
          margin: '0 auto',
          gap: '1.15rem',
        }}
      >
        {/* Viewfinder Box */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '380px',
            aspectRatio: '1 / 1',
            borderRadius: '24px',
            overflow: 'hidden',
            background: '#0A0604',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(212, 160, 84, 0.35)',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Corner Brackets Overlay */}
          <div style={{ position: 'absolute', inset: '14%', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTop: '4px solid #D4A054', borderLeft: '4px solid #D4A054', borderTopLeftRadius: 10 }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTop: '4px solid #D4A054', borderRight: '4px solid #D4A054', borderTopRightRadius: 10 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottom: '4px solid #D4A054', borderLeft: '4px solid #D4A054', borderBottomLeftRadius: 10 }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottom: '4px solid #D4A054', borderRight: '4px solid #D4A054', borderBottomRightRadius: 10 }} />

            {status === 'scanning' && (
              <div
                style={{
                  position: 'absolute',
                  left: 6,
                  right: 6,
                  height: '2.5px',
                  background: 'linear-gradient(90deg, transparent, #F2D7A5, #D4A054, transparent)',
                  boxShadow: '0 0 12px rgba(212, 160, 84, 0.9)',
                  animation: 'scanLaser 2.2s ease-in-out infinite',
                }}
              />
            )}
          </div>

          {/* Torch button */}
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              style={{
                position: 'absolute',
                bottom: '14px',
                right: '14px',
                padding: '0.45rem 0.75rem',
                borderRadius: '999px',
                background: torchOn ? '#D4A054' : 'rgba(0,0,0,0.6)',
                color: torchOn ? '#1E140E' : '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {torchOn ? '🔦 Flash ON' : '🔦 Flash'}
            </button>
          )}
        </div>

        {/* Status Pill */}
        <div
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '999px',
            background: status === 'error' ? 'rgba(201, 74, 74, 0.18)' : 'rgba(212, 160, 84, 0.14)',
            border: `1px solid ${status === 'error' ? 'rgba(201, 74, 74, 0.45)' : 'rgba(212, 160, 84, 0.3)'}`,
            fontSize: '0.84rem',
            fontWeight: 600,
            color: status === 'error' ? '#FFB4B4' : '#F2D7A5',
            textAlign: 'center',
          }}
        >
          {status === 'starting' && 'Activation de la caméra…'}
          {status === 'scanning' && 'Alignez le QR code du client dans le cadre'}
          {status === 'resolving' && '⏳ Ouverture de la fiche client…'}
          {status === 'error' && `⚠️ ${error}`}
        </div>

        {status === 'error' && (
          <button
            type="button"
            onClick={startCamera}
            className="touch-btn touch-btn--gold"
            style={{ minHeight: '42px', padding: '0.5rem 1.25rem', fontSize: '0.86rem' }}
          >
            🔄 Réessayer la caméra
          </button>
        )}

        {/* Fallback manual input */}
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '1rem',
            borderRadius: '18px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#D8CCBC', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ou saisir / coller le lien client
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="https://.../client/lc_..."
              style={{
                flex: 1,
                padding: '0.65rem 0.85rem',
                borderRadius: '12px',
                border: '1px solid rgba(212, 160, 84, 0.3)',
                background: 'rgba(0,0,0,0.35)',
                color: '#FAF8F5',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              type="button"
              className="touch-btn touch-btn--gold"
              style={{ minHeight: '40px', padding: '0.45rem 1rem', fontSize: '0.84rem' }}
              onClick={() => handleDecoded(manual)}
              disabled={!manual.trim() || status === 'resolving'}
            >
              OK
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes scanLaser {
          0%, 100% { top: 8%; }
          50% { top: 90%; }
        }
      `}</style>
    </div>
  );
}
