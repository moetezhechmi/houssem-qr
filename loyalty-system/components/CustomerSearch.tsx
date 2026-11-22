'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  SearchIcon,
  PhoneIcon,
  ArrowRightIcon,
  UserIcon,
} from './Icons';

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  card_number?: string;
  has_active_card?: boolean;
};

export function CustomerSearch({ initialQuery = '', initialCustomers = [] }: { initialQuery?: string; initialCustomers?: Customer[] }) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Customer[]>(initialCustomers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchResults = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/server/customers?q=${encodeURIComponent(query)}`, { credentials: 'same-origin' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `Erreur ${res.status}`);
      }
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message ?? 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchResults(q), 300);
    return () => clearTimeout(t);
  }, [q, fetchResults]);

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: '1.5rem', display: 'flex', gap: '0.55rem', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par tél (ex: 20123...) ou nom..."
            aria-label="Recherche client"
            style={{
              width: '100%',
              padding: '0.85rem 1rem 0.85rem 2.8rem',
              borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--crema-border)',
              background: 'var(--crema-surface)',
              fontSize: '0.95rem',
              color: 'var(--espresso)',
              outline: 'none',
              boxShadow: 'var(--shadow-xs)',
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--coffee-mid)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SearchIcon size={18} />
          </span>
        </div>
        {loading && (
          <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--coffee-mid)' }}>…</span>
        )}
      </div>

      {error && (
        <div
          style={{
            background: 'var(--coral-light)',
            border: '1px solid var(--coral-border)',
            borderRadius: 'var(--r-sm)',
            padding: '0.65rem 0.85rem',
            color: 'var(--coral)',
            fontSize: '0.8rem',
            marginBottom: '1rem',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div className="ui-card" style={{ padding: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--crema-border)',
            paddingBottom: '0.65rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--sage)', letterSpacing: '0.06em' }}>
            {q ? `Résultats pour « ${q} »` : 'Clients récents'} ({results.length})
          </div>
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              style={{ fontSize: '0.75rem', color: 'var(--coffee-mid)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Effacer
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', opacity: 0.4 }}>
              <SearchIcon size={42} />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--espresso)', marginBottom: '0.2rem' }}>
              Aucun client trouvé
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--coffee-mid)', margin: 0 }}>
              {q
                ? `Aucun profil ne correspond à « ${q} ». Cliquez sur « + Nouveau Client » ci-dessus pour le créer.`
                : 'Aucun client n’est encore enregistré.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {results.map((c) => (
              <a
                key={c.id}
                href={`/serveur/customers/${c.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.95rem 1.15rem',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--crema-surface)',
                  border: '1.5px solid var(--crema-border)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.15s ease',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'var(--crema-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: 'var(--espresso)',
                      flexShrink: 0,
                    }}
                  >
                    {c.first_name ? c.first_name[0].toUpperCase() : 'C'}
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--espresso)' }}>
                      {c.first_name} {c.last_name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--coffee-mid)', marginTop: '0.1rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <PhoneIcon size={13} color="var(--coffee-mid)" />
                        {c.phone}
                      </span>
                      {c.card_number && <span>· <code>{c.card_number}</code></span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`ui-badge ${c.has_active_card ? 'ui-badge--sage' : 'ui-badge--coral'}`}>
                    {c.has_active_card ? 'Active' : 'Expirée'}
                  </span>
                  <span style={{ color: 'var(--coffee-mid)', display: 'flex', alignItems: 'center' }}>
                    <ArrowRightIcon size={16} />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}