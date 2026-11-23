'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  SearchIcon,
  PhoneIcon,
  ArrowRightIcon,
} from './Icons';

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  card_number?: string;
  has_active_card?: boolean;
};

type FilterType = 'all' | 'active' | 'expired';

export function CustomerSearch({
  initialQuery = '',
  initialCustomers = [],
}: {
  initialQuery?: string;
  initialCustomers?: Customer[];
}) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Customer[]>(initialCustomers);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/server/customers?q=${encodeURIComponent(query)}`, {
        credentials: 'same-origin',
      });
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
    const t = setTimeout(() => fetchResults(q), 250);
    return () => clearTimeout(t);
  }, [q, fetchResults]);

  // Client-side quick filter
  const filteredResults = useMemo(() => {
    if (filter === 'active') {
      return results.filter((c) => c.has_active_card);
    }
    if (filter === 'expired') {
      return results.filter((c) => !c.has_active_card);
    }
    return results;
  }, [results, filter]);

  const activeCount = useMemo(() => results.filter((c) => c.has_active_card).length, [results]);
  const expiredCount = results.length - activeCount;

  return (
    <div>
      {/* ── Search Input Field ── */}
      <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              position: 'absolute',
              left: '1.15rem',
              color: 'var(--coffee-mid)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SearchIcon size={20} />
          </span>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom, téléphone (ex: 20123...) ou N° de carte..."
            aria-label="Recherche client"
            inputMode="search"
            style={{
              width: '100%',
              padding: '0.95rem 2.85rem 0.95rem 3rem',
              borderRadius: 'var(--r-lg)',
              border: '1.5px solid var(--crema-border)',
              background: 'var(--crema-surface)',
              fontSize: 'var(--text-base)',
              color: 'var(--espresso)',
              outline: 'none',
              boxShadow: 'var(--shadow-xs)',
              boxSizing: 'border-box',
              fontWeight: 600,
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--gold)';
              e.target.style.boxShadow = '0 0 0 3px rgba(212, 160, 84, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--crema-border)';
              e.target.style.boxShadow = 'var(--shadow-xs)';
            }}
          />

          {/* Right Action: Clear Button or Loading Spinner */}
          <div
            style={{
              position: 'absolute',
              right: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {loading && (
              <span
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  border: '2px solid var(--gold)',
                  borderTopColor: 'transparent',
                  animation: 'shimmer 0.8s linear infinite',
                  display: 'inline-block',
                }}
              />
            )}

            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                aria-label="Effacer la recherche"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--crema-subtle)',
                  border: '1px solid var(--crema-border)',
                  color: 'var(--coffee-mid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Filter Chips ── */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--r-pill)',
            border: `1.5px solid ${filter === 'all' ? 'var(--espresso)' : 'var(--crema-border)'}`,
            background: filter === 'all' ? 'var(--espresso)' : 'var(--crema-surface)',
            color: filter === 'all' ? '#FAF8F5' : 'var(--coffee-mid)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
            whiteSpace: 'nowrap',
          }}
        >
          Tous ({results.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('active')}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--r-pill)',
            border: `1.5px solid ${filter === 'active' ? 'var(--sage-dark)' : 'var(--crema-border)'}`,
            background: filter === 'active' ? 'var(--sage-light)' : 'var(--crema-surface)',
            color: filter === 'active' ? 'var(--sage-dark)' : 'var(--coffee-mid)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
            whiteSpace: 'nowrap',
          }}
        >
          🟢 Cartes Actives ({activeCount})
        </button>

        <button
          type="button"
          onClick={() => setFilter('expired')}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--r-pill)',
            border: `1.5px solid ${filter === 'expired' ? 'var(--coral)' : 'var(--crema-border)'}`,
            background: filter === 'expired' ? 'var(--coral-light)' : 'var(--crema-surface)',
            color: filter === 'expired' ? 'var(--coral)' : 'var(--coffee-mid)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
            whiteSpace: 'nowrap',
          }}
        >
          🔴 Expirées ({expiredCount})
        </button>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--coral-light)',
            border: '1.5px solid var(--coral-border)',
            borderRadius: 'var(--r-md)',
            padding: '0.85rem 1rem',
            color: 'var(--coral)',
            fontSize: 'var(--text-sm)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Results Container Card ── */}
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
          <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', letterSpacing: '0.08em' }}>
            {q ? `Résultats pour « ${q} »` : 'Clients récemment actifs'} ({filteredResults.length})
          </div>

          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--gold-dark)',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Effacer
            </button>
          )}
        </div>

        {filteredResults.length === 0 ? (
          <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
            <div className="empty-state__icon">🔍</div>
            <div className="empty-state__title">
              {q ? 'Aucun client trouvé' : 'Aucun profil dans cette catégorie'}
            </div>
            <p className="empty-state__desc">
              {q
                ? `Aucun profil ne correspond à votre recherche « ${q} ». Créez sa fiche en 5 secondes avec le formulaire ci-dessus.`
                : 'Tous les profils enregistrés apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {filteredResults.map((c) => {
              const isActive = Boolean(c.has_active_card);
              const initial = c.first_name ? c.first_name[0].toUpperCase() : 'C';

              return (
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
                    transition: 'all 0.18s ease',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gold)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--crema-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    {/* Monogram Avatar with Status indicator */}
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '14px',
                          background: isActive
                            ? 'linear-gradient(135deg, var(--espresso) 0%, var(--coffee-dark) 100%)'
                            : 'var(--crema-subtle)',
                          color: isActive ? '#FAF8F5' : 'var(--coffee-mid)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          flexShrink: 0,
                          border: `1.5px solid ${isActive ? 'rgba(212, 160, 84, 0.4)' : 'var(--crema-border)'}`,
                          boxShadow: isActive ? '0 2px 8px rgba(44, 30, 22, 0.2)' : 'none',
                        }}
                      >
                        {initial}
                      </div>

                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: isActive ? 'var(--sage)' : 'var(--coral)',
                          border: '2px solid #FFFFFF',
                          boxShadow: `0 0 6px ${isActive ? 'var(--sage)' : 'var(--coral)'}`,
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--espresso)', lineHeight: 1.25 }}>
                        {c.first_name} {c.last_name}
                      </div>

                      <div
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--coffee-mid)',
                          marginTop: '0.2rem',
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <PhoneIcon size={12} color="var(--coffee-mid)" />
                          {c.phone}
                        </span>

                        {c.card_number && (
                          <span
                            style={{
                              fontFamily: 'monospace',
                              background: 'var(--crema-subtle)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              border: '1px solid var(--crema-border)',
                              color: 'var(--espresso)',
                            }}
                          >
                            {c.card_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`ui-badge ${isActive ? 'ui-badge--sage' : 'ui-badge--coral'}`}>
                      {isActive ? 'Active' : 'Expirée'}
                    </span>

                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'var(--crema-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--espresso)',
                      }}
                    >
                      <ArrowRightIcon size={14} />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
