'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fillTestCredentials = () => {
    setEmail('admin@bieny.test');
    setPassword('123456');
    setError('');
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const redirectParam = new URLSearchParams(window.location.search).get('redirect');
        const dest = redirectParam || data?.redirectUrl || '/serveur';
        window.location.href = dest;
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data?.error?.message ?? 'Identifiants invalides. Vérifiez votre email et mot de passe.');
    } catch (err: any) {
      setError(`Erreur de connexion : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #130d08 0%, #24160c 45%, #180e07 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '1.5rem',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Background Ambient Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,165,94,0.18) 0%, rgba(212,165,94,0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(50px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '5%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(143,175,154,0.15) 0%, rgba(143,175,154,0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(60px)',
        }}
      />

      {/* Main Glassmorphic Login Card */}
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          background: 'rgba(32, 22, 14, 0.72)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(212, 165, 94, 0.22)',
          borderRadius: '28px',
          padding: '2.5rem 2rem',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.65), 0 0 40px rgba(212, 165, 94, 0.08)',
          position: 'relative',
          zIndex: 10,
          color: '#FAF9F6',
        }}
      >
        {/* Header / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '74px',
              height: '74px',
              margin: '0 auto 1.1rem',
              borderRadius: '22px',
              padding: '3px',
              background: 'linear-gradient(135deg, #d4a55e, rgba(212, 165, 94, 0.2), #8a664a)',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/logo_houssem.jpeg"
              alt="Bieny Coffeeshop"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '19px',
                objectFit: 'cover',
              }}
            />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(212, 165, 94, 0.12)',
              border: '1px solid rgba(212, 165, 94, 0.25)',
              color: '#E6D5C3',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '0.6rem',
            }}
          >
            <span>☕</span>
            <span>Bieny Coffeeshop</span>
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#FAF9F6',
              margin: '0 0 0.35rem',
              letterSpacing: '-0.01em',
            }}
          >
            Espace Barista
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: '#C4B5A5',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            Connectez-vous pour valider les consommations et récompenses de vos clients.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div
            style={{
              background: 'rgba(201, 74, 74, 0.15)',
              border: '1px solid rgba(201, 74, 74, 0.4)',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              color: '#ff9e9e',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '1.25rem',
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#E6D5C3',
                marginBottom: '0.4rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Adresse Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: admin@bieny.test"
                autoComplete="email"
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.6rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1.5px solid rgba(212, 165, 94, 0.25)',
                  borderRadius: '14px',
                  color: '#FAF9F6',
                  fontSize: '0.92rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#d4a55e';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 165, 94, 0.25)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 94, 0.25)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1rem',
                  color: '#C4B5A5',
                  pointerEvents: 'none',
                }}
              >
                ✉️
              </span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#E6D5C3',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Mot de Passe
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#D4A55E',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.6rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1.5px solid rgba(212, 165, 94, 0.25)',
                  borderRadius: '14px',
                  color: '#FAF9F6',
                  fontSize: '0.92rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#d4a55e';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 165, 94, 0.25)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 94, 0.25)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1rem',
                  color: '#C4B5A5',
                  pointerEvents: 'none',
                }}
              >
                🔒
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.95rem 1.5rem',
              background: 'linear-gradient(135deg, #E6D5C3 0%, #D4A55E 50%, #B88A45 100%)',
              color: '#130d08',
              border: 'none',
              borderRadius: '14px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 25px rgba(212, 165, 94, 0.35)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading || !email.trim() || !password ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading && email.trim() && password) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(212, 165, 94, 0.45)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(212, 165, 94, 0.35)';
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #130d08',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                  }}
                />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <span>Accéder au Poste de Service</span>
                <span style={{ fontSize: '1.1rem' }}>→</span>
              </>
            )}
          </button>
        </form>

        {/* Quick test credentials shortcut */}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '0.85rem',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px dashed rgba(212, 165, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '0.76rem', color: '#C4B5A5' }}>
            <span style={{ color: '#D4A55E', fontWeight: 600 }}>💡 Démo rapide :</span> Remplir identifiants par défaut
          </div>
          <button
            type="button"
            onClick={fillTestCredentials}
            style={{
              background: 'rgba(212, 165, 94, 0.15)',
              border: '1px solid rgba(212, 165, 94, 0.35)',
              color: '#FAF9F6',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Remplir
          </button>
        </div>

        {/* Footer info */}
        <div
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.72rem',
            color: '#8A7A6E',
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            paddingTop: '1rem',
          }}
        >
          <span>🔒 Sécurisé via Supabase Auth · Fuseau horaire Africa/Tunis</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
