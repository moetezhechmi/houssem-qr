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
      if (err.includes('PHONE_DUPLICATE')) {
        setErrorMsg('Ce numéro de téléphone est déjà associé à un autre client.');
      } else {
        setErrorMsg(err);
      }
    }
  }

  return (
    <div className="ui-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Accordion Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          background: isOpen ? 'var(--crema-subtle)' : 'var(--crema-surface)',
          transition: 'background 0.2s ease',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--crema-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.15rem',
            }}
          >
            👤
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--espresso)' }}>
              Nouveau Client
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--coffee-mid)' }}>
              Création instantanée du profil et carte fidélité 30j
            </div>
          </div>
        </div>

        <span
          className={`ui-badge ${isOpen ? 'ui-badge--neutral' : 'ui-badge--sage'}`}
          style={{ cursor: 'pointer' }}
        >
          {isOpen ? 'Fermer ▲' : '+ Créer ▼'}
        </span>
      </div>

      {/* Accordion Form Content */}
      {isOpen && (
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--crema-border)' }} className="animate-in">
          {createdClient && (
            <div
              style={{
                background: 'var(--sage-light)',
                border: '1.5px solid var(--sage-border)',
                borderRadius: 'var(--r-md)',
                padding: '1rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎉</span>
                <strong style={{ color: 'var(--sage)', fontSize: '0.94rem' }}>
                  Client créé avec succès !
                </strong>
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--espresso)' }}>
                <strong>{createdClient.name}</strong> · Carte : <code>{createdClient.cardNumber}</code>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                <a
                  href={`/serveur/customers/${createdClient.id}`}
                  className="touch-btn touch-btn--primary"
                  style={{ minHeight: '38px', padding: '0.4rem 1rem', fontSize: '0.82rem', textDecoration: 'none' }}
                >
                  Ouvrir sa fiche →
                </a>
                <button
                  type="button"
                  className="touch-btn touch-btn--outline"
                  style={{ minHeight: '38px', padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
                  onClick={async () => {
                    const fullLink = `${window.location.origin}${createdClient.link}`;
                    await navigator.clipboard.writeText(fullLink);
                    alert('Lien client copié dans le presse-papier !');
                  }}
                >
                  🔗 Copier le lien
                </button>
              </div>
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', marginBottom: '0.35rem' }}>
                  Prénom
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: Ahmed"
                  autoComplete="given-name"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-bg)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    color: 'var(--espresso)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', marginBottom: '0.35rem' }}>
                  Nom
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex: Bousselmi"
                  autoComplete="family-name"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-bg)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    color: 'var(--espresso)',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', marginBottom: '0.35rem' }}>
                Numéro de Téléphone (Unique)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 20123456 ou 0612345678"
                inputMode="tel"
                autoComplete="tel"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--r-sm)',
                  border: '1.5px solid var(--crema-border)',
                  background: 'var(--crema-bg)',
                  outline: 'none',
                  fontSize: '0.9rem',
                  color: 'var(--espresso)',
                }}
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'var(--coral-light)',
                  border: '1px solid var(--coral-border)',
                  borderRadius: 'var(--r-sm)',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--coral)',
                  fontSize: '0.8rem',
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                className="touch-btn touch-btn--ghost"
                onClick={() => setIsOpen(false)}
                style={{ minHeight: '40px', fontSize: '0.84rem' }}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="touch-btn touch-btn--primary"
                disabled={busy || !firstName.trim() || !lastName.trim() || !phone.trim()}
                style={{ minHeight: '40px', fontSize: '0.84rem' }}
              >
                {busy ? 'Création...' : 'Valider & Créer la Carte'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
