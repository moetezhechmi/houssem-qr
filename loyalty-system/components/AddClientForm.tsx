'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AddClientForm({ initialOpen = false }: { initialOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdClient, setCreatedClient] = useState<{ id: string; name: string; cardNumber: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorMsg(null);

    const res = await fetch('/api/server/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.ok && data?.customer) {
      setCreatedClient({
        id: data.customer.id,
        name: `${data.customer.first_name} ${data.customer.last_name}`,
        cardNumber: data.card?.card_number ?? '',
        link: data.link ?? `/client/${data.card?.public_token}`,
      });
      setFirstName('');
      setLastName('');
      setPhone('');
      router.refresh();
    } else {
      const err = data?.error?.message ?? 'Erreur lors de la création du client';
      if (err.includes('PHONE_DUPLICATE') || err.includes('duplicate key')) {
        setErrorMsg('Ce numéro de téléphone est déjà associé à un autre client.');
      } else {
        setErrorMsg(err);
      }
    }
  }

  const handleCopyLink = async () => {
    if (!createdClient) return;
    try {
      const fullLink = `${window.location.origin}${createdClient.link}`;
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div
      className="ui-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        border: '1.5px solid var(--crema-border)',
        boxShadow: isOpen ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Accordion Header / Trigger */}
      <div
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          background: isOpen ? 'var(--crema-subtle)' : 'var(--crema-surface)',
          userSelect: 'none',
          transition: 'background 0.2s ease',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: isOpen ? 'var(--espresso)' : 'var(--crema-subtle)',
              color: isOpen ? 'var(--gold)' : 'var(--espresso)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.15rem',
              fontWeight: 800,
              boxShadow: isOpen ? '0 4px 10px rgba(44, 30, 22, 0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isOpen ? '✍️' : '+'}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--espresso)' }}>
              Nouveau Client
            </div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', marginTop: '2px' }}>
              Création instantanée du profil et carte fidélité 30 jours
            </div>
          </div>
        </div>

        <span
          className={`ui-badge ${isOpen ? 'ui-badge--neutral' : 'ui-badge--gold'}`}
          style={{ cursor: 'pointer', fontSize: 'var(--text-2xs)', fontWeight: 800 }}
        >
          {isOpen ? 'Fermer ▲' : '+ Créer ▼'}
        </span>
      </div>

      {/* Accordion Form Content */}
      {isOpen && (
        <div style={{ padding: '1.35rem 1.25rem', borderTop: '1px solid var(--crema-border)' }} className="animate-in">
          {createdClient && (
            <div
              className="animate-in"
              style={{
                background: 'linear-gradient(135deg, #EEF7F1 0%, #FAF8F5 100%)',
                border: '1.5px solid var(--sage)',
                borderRadius: 'var(--r-md)',
                padding: '1.15rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                boxShadow: '0 4px 14px var(--sage-glow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🎉</span>
                <div>
                  <strong style={{ color: 'var(--sage-dark)', fontSize: 'var(--text-base)' }}>
                    Client créé avec succès !
                  </strong>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--espresso)', marginTop: '2px' }}>
                    <strong>{createdClient.name}</strong> · N° Carte :{' '}
                    <code style={{ background: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--crema-border)' }}>
                      {createdClient.cardNumber}
                    </code>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <a
                  href={`/serveur/customers/${createdClient.id}`}
                  className="touch-btn touch-btn--gold"
                  style={{ minHeight: '38px', padding: '0.45rem 1.15rem', fontSize: 'var(--text-xs)', textDecoration: 'none' }}
                >
                  Ouvrir sa fiche client →
                </a>
                <button
                  type="button"
                  className="touch-btn touch-btn--outline"
                  style={{ minHeight: '38px', padding: '0.45rem 1rem', fontSize: 'var(--text-xs)' }}
                  onClick={handleCopyLink}
                >
                  {copied ? '✅ Lien copié !' : '🔗 Copier le lien carte'}
                </button>
                <button
                  type="button"
                  className="touch-btn touch-btn--ghost"
                  style={{ minHeight: '38px', padding: '0.45rem 0.75rem', fontSize: 'var(--text-xs)' }}
                  onClick={() => setCreatedClient(null)}
                >
                  Ajouter un autre
                </button>
              </div>
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--coffee-mid)',
                    letterSpacing: '0.05em',
                    marginBottom: '0.35rem',
                  }}
                >
                  Prénom
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex : Ahmed"
                  autoComplete="given-name"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    outline: 'none',
                    fontSize: 'var(--text-base)',
                    color: 'var(--espresso)',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--coffee-mid)',
                    letterSpacing: '0.05em',
                    marginBottom: '0.35rem',
                  }}
                >
                  Nom
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex : Ben Ali"
                  autoComplete="family-name"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    outline: 'none',
                    fontSize: 'var(--text-base)',
                    color: 'var(--espresso)',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-2xs)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--coffee-mid)',
                  letterSpacing: '0.05em',
                  marginBottom: '0.35rem',
                }}
              >
                Numéro de Téléphone (Identifiant)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex : 20 123 456 ou 98 765 432"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem 0.75rem 2.75rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    outline: 'none',
                    fontSize: 'var(--text-base)',
                    color: 'var(--espresso)',
                    fontWeight: 600,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1rem',
                    pointerEvents: 'none',
                  }}
                >
                  🇹🇳
                </span>
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'var(--coral-light)',
                  border: '1px solid var(--coral-border)',
                  borderRadius: 'var(--r-sm)',
                  padding: '0.75rem 1rem',
                  color: 'var(--coral)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                className="touch-btn touch-btn--ghost"
                onClick={() => setIsOpen(false)}
                style={{ minHeight: '42px', fontSize: 'var(--text-xs)' }}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="touch-btn touch-btn--primary"
                disabled={busy || !firstName.trim() || !lastName.trim() || !phone.trim()}
                style={{ minHeight: '42px', fontSize: 'var(--text-sm)', minWidth: '160px' }}
              >
                {busy ? 'Création en cours…' : 'Valider & Créer Carte'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
