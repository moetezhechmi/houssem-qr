import { redirect } from 'next/navigation';
import { FicheActions } from '@/components/FicheActions';
import { getEmployee } from '@/lib/auth-guard';
import { getFiche, getShareLink } from '@/lib/server-data';
import { fmtDate, fmtDateTime, daysUntil } from '@/lib/format';
import {
  CoffeeIcon,
  GiftIcon,
  PhoneIcon,
  ArrowLeftIcon,
  ClockIcon,
  CheckIcon,
} from '@/components/Icons';

export default async function ServeurCustomerFiche({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getEmployee('server');
  if (!employee) redirect(`/serveur/login?redirect=${encodeURIComponent(`/serveur/customers/${id}`)}`);

  const [fiche, shareLink] = await Promise.all([
    getFiche(id),
    getShareLink(id),
  ]);

  if (!fiche) {
    return (
      <main className="shell animate-in" style={{ textAlign: 'center', paddingTop: '3rem' }}>
        <div className="ui-card" style={{ padding: '2.5rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>☕</div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--espresso)',
              margin: '0 0 0.5rem',
            }}
          >
            Client Introuvable
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--coffee-mid)', margin: '0 0 1.5rem' }}>
            Aucun client ne correspond à cet identifiant ou la carte a été archivée.
          </p>
          <a
            href="/serveur/customers"
            className="touch-btn touch-btn--primary"
            style={{ textDecoration: 'none' }}
          >
            ← Retour à la recherche
          </a>
        </div>
      </main>
    );
  }

  const card = fiche.card ?? { status: 'expired' };
  const cycle = fiche.active_cycle;
  const done = cycle?.current_consumptions ?? 0;
  const total = cycle?.required_consumptions ?? 9;
  const expired = card.status !== 'active';
  const availableReward = fiche.rewards.find(
    (r: any) => r.status === 'available' && new Date(r.expires_at).getTime() > Date.now()
  );
  const daysLeft = daysUntil(card.expiration_date);

  return (
    <main className="shell animate-in">
      {/* ── Breadcrumb & Back Link ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <a
          href="/serveur/customers"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            color: 'var(--coffee-mid)',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <ArrowLeftIcon size={16} />
          <span>Clients & Recherche</span>
        </a>

        <span
          className={`ui-badge ${expired ? 'ui-badge--coral' : 'ui-badge--sage'}`}
        >
          {expired ? 'Carte Expirée' : 'Carte Active'}
        </span>
      </div>

      {/* ── Customer Identity & Instant 1-Tap Action Bar ── */}
      <div
        className="ui-card ui-card--espresso"
        style={{
          padding: '1.4rem',
          marginBottom: '1.25rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-30%',
            right: '-10%',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--gold-glow) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.85rem',
              marginBottom: '1.15rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '16px',
                  background: 'var(--gold-gradient)',
                  color: 'var(--espresso)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              >
                {fiche.customer.first_name ? fiche.customer.first_name[0].toUpperCase() : 'C'}
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    fontWeight: 700,
                  }}
                >
                  Carte {card.card_number}
                </div>
                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    margin: '0.1rem 0',
                    lineHeight: 1.2,
                  }}
                >
                  {fiche.customer.first_name} {fiche.customer.last_name}
                </h1>
                <div style={{ fontSize: '0.82rem', color: 'var(--crema-border)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <PhoneIcon size={14} color="var(--gold)" />
                  <a
                    href={`tel:${fiche.customer.phone}`}
                    style={{ color: '#FAF9F6', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    {fiche.customer.phone}
                  </a>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: '85px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.85rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  color: '#FAF9F6',
                }}
              >
                {done} <span style={{ fontSize: '1.1rem', color: 'var(--gold)' }}>/ {total}</span>
              </div>
              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crema-border)', marginTop: '0.2rem' }}>
                Consommations
              </div>
            </div>
          </div>

          {/* Action Bar component (Inside Hero for 1-Tap Mobile Access) */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', paddingTop: '0.9rem' }}>
            <FicheActions fiche={fiche} shareLink={shareLink} />
          </div>
        </div>
      </div>

      {/* ── Alert when 30% discount is available ── */}
      {availableReward && !expired && (
        <div
          style={{
            background: 'var(--sage-light)',
            border: '2px solid var(--sage)',
            borderRadius: 'var(--r-lg)',
            padding: '1.1rem 1.2rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 6px 20px rgba(62, 123, 92, 0.15)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--sage)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GiftIcon size={24} color="#FFFFFF" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--sage)' }}>
              Récompense de 30% Débloquée !
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--espresso)', marginTop: '0.2rem', lineHeight: 1.4 }}>
              Le client a complété ses 9 cafés. Cliquez sur <strong>« Appliquer Réduction 30% »</strong> ci-dessus pour appliquer la remise.
            </div>
          </div>
        </div>
      )}

      {/* ── Virtual Loyalty Card (9 Tactile Stamps in Strict 3x3 Grid) ── */}
      <div className="ui-card" style={{ marginBottom: '1.25rem', padding: '1.4rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--sage)',
                marginBottom: '0.2rem',
              }}
            >
              Grille de Fidélité
            </div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--espresso)',
              }}
            >
              Tampons Validés ({done}/{total})
            </div>
          </div>

          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: expired ? 'var(--coral)' : 'var(--sage)',
            }}
          >
            {Math.round((done / total) * 100)}% complété
          </span>
        </div>

        {/* ── 9 Balanced Stamps: Strict 3x3 Grid (3 columns on all mobile screens) ── */}
        <div
          style={{
            maxWidth: '380px',
            margin: '0 auto 1.25rem auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}
        >
          {Array.from({ length: total }).map((_, i) => {
            const isStamped = i < done;
            const isLast = i === total - 1;

            return (
              <div
                key={i}
                style={{
                  aspectRatio: '1',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  background: isStamped
                    ? isLast
                      ? 'var(--gold-gradient)'
                      : 'linear-gradient(135deg, var(--espresso) 0%, #3a2214 100%)'
                    : 'var(--crema-surface)',
                  color: isStamped
                    ? isLast
                      ? 'var(--espresso)'
                      : '#FAF9F6'
                    : 'var(--coffee-mid)',
                  border: isStamped
                    ? isLast
                      ? '2px solid rgba(212, 160, 84, 0.6)'
                      : '2px solid var(--espresso)'
                    : '2px dashed var(--crema-border)',
                  boxShadow: isStamped
                    ? isLast
                      ? '0 6px 18px var(--gold-glow)'
                      : '0 4px 14px rgba(24, 16, 10, 0.22)'
                    : 'none',
                  opacity: expired ? 0.55 : 1,
                  position: 'relative',
                }}
              >
                {/* Stamp Icon */}
                <div>
                  {isStamped ? (
                    isLast ? (
                      <GiftIcon size={24} color="var(--espresso)" />
                    ) : (
                      <CoffeeIcon size={22} color="#FFFFFF" />
                    )
                  ) : isLast ? (
                    <GiftIcon size={20} color="var(--coffee-mid)" style={{ opacity: 0.4 }} />
                  ) : (
                    <CoffeeIcon size={18} color="var(--coffee-mid)" style={{ opacity: 0.35 }} />
                  )}
                </div>

                {/* Stamp Sub-Label */}
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: isStamped
                      ? isLast
                        ? 'var(--espresso)'
                        : '#E6D5C3'
                      : 'var(--coffee-mid)',
                    opacity: isStamped ? 1 : 0.65,
                  }}
                >
                  {isLast ? '-30%' : `#${i + 1}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Continuous Progress Bar */}
        <div
          style={{
            height: '8px',
            borderRadius: '999px',
            background: 'var(--crema-subtle)',
            overflow: 'hidden',
            marginBottom: '0.75rem',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '999px',
              width: `${Math.min(100, Math.round((done / total) * 100))}%`,
              background:
                done >= total
                  ? 'linear-gradient(90deg, var(--gold), var(--sage))'
                  : 'linear-gradient(90deg, var(--sage), #6BB38E)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--coffee-mid)', margin: 0, lineHeight: 1.45 }}>
          {done >= total
            ? '🎉 Cycle complété avec succès ! Le client peut bénéficier de sa remise de 30%.'
            : `Encore ${total - done} consommation${total - done > 1 ? 's' : ''} avant de débloquer la réduction de 30% (valable 7 jours).`}
        </p>
      </div>

      {/* ── Cycle Validity Details (Mobile Grid) ── */}
      <div className="ui-card" style={{ marginBottom: '1.25rem', padding: '1.4rem' }}>
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--coffee-mid)',
            marginBottom: '0.85rem',
          }}
        >
          Validité du cycle (30 jours calendaires)
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ background: 'var(--crema-bg)', padding: '0.85rem 1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--crema-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--coffee-mid)', textTransform: 'uppercase', fontWeight: 700 }}>
              Date d’ouverture
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--espresso)', marginTop: '0.2rem' }}>
              {fmtDate(card.start_date)}
            </div>
          </div>

          <div style={{ background: 'var(--crema-bg)', padding: '0.85rem 1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--crema-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--coffee-mid)', textTransform: 'uppercase', fontWeight: 700 }}>
              Date d’expiration
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: '0.92rem',
                color: expired ? 'var(--coral)' : 'var(--espresso)',
                marginTop: '0.2rem',
              }}
            >
              {fmtDate(card.expiration_date)}
            </div>
          </div>

          <div style={{ background: 'var(--crema-bg)', padding: '0.85rem 1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--crema-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--coffee-mid)', textTransform: 'uppercase', fontWeight: 700 }}>
              Temps restant
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: '0.95rem',
                color: expired ? 'var(--coral)' : daysLeft !== null && daysLeft <= 5 ? 'var(--gold)' : 'var(--sage)',
                marginTop: '0.2rem',
              }}
            >
              {expired ? 'Carte expirée' : `${daysLeft ?? 0} jour(s)`}
            </div>
          </div>
        </div>

        {/* Time Progress Bar */}
        <div
          style={{
            height: '6px',
            borderRadius: '999px',
            background: 'var(--crema-subtle)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '999px',
              width: `${expired ? 100 : Math.max(3, Math.min(100, (((30 - (daysLeft ?? 0)) / 30) * 100)))}%`,
              background: expired ? 'var(--coral)' : 'var(--sage)',
            }}
          />
        </div>
      </div>

      {/* ── Récompenses Débloquées & Utilisées ── */}
      <div className="ui-card" style={{ marginBottom: '1.25rem', padding: '1.4rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--espresso)',
            }}
          >
            Récompenses ({fiche.rewards.length})
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--coffee-mid)' }}>
            Valables 7 jours après déblocage
          </span>
        </div>

        {fiche.rewards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>🎫</div>
            <div style={{ fontSize: '0.86rem', color: 'var(--coffee-mid)' }}>
              Aucune récompense générée pour ce cycle.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {fiche.rewards.map((r: any) => {
              const ex = new Date(r.expires_at).getTime() <= Date.now();
              const isAvailable = r.status === 'available' && !ex;
              const isUsed = r.status === 'used';

              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.95rem 1.15rem',
                    borderRadius: 'var(--r-md)',
                    background: isAvailable ? 'var(--sage-light)' : 'var(--crema-bg)',
                    border: `1.5px solid ${isAvailable ? 'var(--sage-border)' : 'var(--crema-border)'}`,
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <GiftIcon size={18} color="var(--espresso)" />
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--espresso)' }}>
                        Remise de {r.discount_percentage}%
                      </span>
                      <span
                        className={`ui-badge ${
                          isAvailable
                            ? 'ui-badge--sage'
                            : isUsed
                            ? 'ui-badge--neutral'
                            : 'ui-badge--coral'
                        }`}
                      >
                        {isAvailable ? 'Disponible' : isUsed ? 'Utilisée' : 'Expirée'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--coffee-mid)', marginTop: '0.2rem' }}>
                      {isUsed
                        ? `Utilisée le ${fmtDateTime(r.used_at)}`
                        : `Valable jusqu'au ${fmtDateTime(r.expires_at)}`}
                    </div>
                  </div>

                  <div>
                    {isAvailable ? (
                      <span className="ui-badge ui-badge--sage">Active</span>
                    ) : isUsed ? (
                      <CheckIcon size={20} color="var(--sage)" />
                    ) : (
                      <ClockIcon size={20} color="var(--coral)" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Historique des Consommations ── */}
      <div id="history-section" className="ui-card" style={{ padding: '1.4rem' }}>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--espresso)',
            marginBottom: '1rem',
          }}
        >
          Historique des Passages ({fiche.history.length})
        </div>

        {fiche.history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem', opacity: 0.5 }}>☕</div>
            <div style={{ fontSize: '0.86rem', color: 'var(--coffee-mid)' }}>
              Aucune consommation validée pour le moment.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {fiche.history.slice(0, 15).map((h: any) => {
              const isCancelled = h.status === 'cancelled';
              const dateObj = new Date(h.created_at);
              const dateStr = new Intl.DateTimeFormat('fr-FR', {
                timeZone: 'Africa/Tunis',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(dateObj);

              return (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.8rem 1rem',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--crema-bg)',
                    border: '1px solid var(--crema-border)',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: isCancelled ? 'var(--coral-light)' : 'var(--sage-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isCancelled ? (
                        <span style={{ fontSize: '0.9rem', color: 'var(--coral)', fontWeight: 800 }}>✕</span>
                      ) : (
                        <CoffeeIcon size={16} color="var(--sage)" />
                      )}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--espresso)' }}>
                        {dateStr}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--coffee-mid)', fontFamily: 'monospace' }}>
                        {h.transaction_reference}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`ui-badge ${isCancelled ? 'ui-badge--coral' : 'ui-badge--sage'}`}
                  >
                    {isCancelled ? 'Annulée' : 'Validée'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
