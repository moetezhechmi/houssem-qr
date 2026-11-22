import { redirect } from 'next/navigation';
import { getEmployee } from '@/lib/auth-guard';
import { getDashboardStats } from '@/lib/server-data';
import {
  CoffeeIcon,
  UserIcon,
  GiftIcon,
  ClockIcon,
  CheckIcon,
  SearchIcon,
  PlusIcon,
} from '@/components/Icons';

export default async function ServeurDashboard() {
  const employee = await getEmployee('server');
  if (!employee) redirect('/serveur/login');

  const stats = await getDashboardStats();

  const isAdmin = employee.role === 'admin';

  const statCards = [
    {
      label: 'Clients',
      value: stats.total_clients,
      icon: <UserIcon size={20} color="var(--espresso)" />,
      sub: 'Base totale',
      color: 'var(--espresso)',
      bg: 'var(--crema-subtle)',
      border: 'var(--crema-border)',
      href: '/serveur/customers',
    },
    {
      label: 'Cartes Actives',
      value: stats.active_cards,
      icon: <CoffeeIcon size={20} color="var(--sage)" />,
      sub: 'Cycles en cours',
      color: 'var(--sage)',
      bg: 'var(--sage-light)',
      border: 'var(--sage-border)',
      href: isAdmin ? '/admin?tab=cards' : '/serveur/customers',
    },
    {
      label: 'Cartes Expirées',
      value: stats.expired_cards,
      icon: <ClockIcon size={20} color="var(--coral)" />,
      sub: 'À renouveler',
      color: 'var(--coral)',
      bg: 'var(--coral-light)',
      border: 'var(--coral-border)',
      href: isAdmin ? '/admin?tab=cards' : '/serveur/customers',
    },
    {
      label: 'Récompenses',
      value: stats.pending_rewards,
      icon: <GiftIcon size={20} color="#B88135" />,
      sub: 'Remises de 30%',
      color: '#B88135',
      bg: 'rgba(212, 160, 84, 0.15)',
      border: 'rgba(212, 160, 84, 0.35)',
      href: isAdmin ? '/admin?tab=rewards' : '/serveur/customers',
    },
    {
      label: 'Utilisées',
      value: stats.used_rewards,
      icon: <CheckIcon size={20} color="#2A5C43" />,
      sub: 'Bons appliqués',
      color: '#2A5C43',
      bg: 'rgba(62, 123, 92, 0.12)',
      border: 'rgba(62, 123, 92, 0.28)',
      href: isAdmin ? '/admin?tab=rewards' : '/serveur/customers',
    },
  ];

  const todayStr = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Tunis',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <main className="shell animate-in">
      {/* ─── Hero Welcoming Card ─── */}
      <div
        className="ui-card ui-card--espresso"
        style={{
          padding: '1.75rem 1.5rem',
          marginBottom: '1.25rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-40%',
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
              fontSize: '0.72rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              fontWeight: 800,
              marginBottom: '0.35rem',
            }}
          >
            📅 {todayStr}
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.85rem',
              fontWeight: 700,
              margin: '0 0 0.35rem',
              lineHeight: 1.2,
            }}
          >
            Bonjour, {employee.name || 'Barista'} ☕
          </h1>

          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--crema-border)',
              margin: '0 0 1.25rem',
              lineHeight: 1.45,
            }}
          >
            Attribuez des tampons de fidélité et appliquez les remises de vos clients en quelques secondes.
          </p>

          {/* Quick Action Touch Targets (Mobile-Friendly) */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <a
              href="/serveur/customers"
              className="touch-btn touch-btn--gold"
              style={{ flex: '1 1 180px', textDecoration: 'none', gap: '8px' }}
            >
              <SearchIcon size={18} color="var(--espresso)" />
              <span>Rechercher un Client</span>
            </a>

            <a
              href="/serveur/customers?action=new"
              className="touch-btn"
              style={{
                flex: '1 1 140px',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                color: '#FAF9F6',
                textDecoration: 'none',
                gap: '8px',
              }}
            >
              <PlusIcon size={18} color="#FFFFFF" />
              <span>+ Nouveau</span>
            </a>
          </div>
        </div>
      </div>

      {/* ─── KPI Stats Grid (Clean 2-Column Mobile Layout) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        {statCards.map((c, idx) => (
          <a
            key={c.label}
            href={c.href}
            className="ui-card"
            style={{
              padding: '1rem',
              border: `1.5px solid ${c.border}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gridColumn: idx === 4 ? 'span 2' : 'auto',
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: c.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.icon}
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: c.color,
                  letterSpacing: '0.04em',
                }}
              >
                {c.label}
              </span>
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: c.color,
                  lineHeight: 1,
                  marginBottom: '0.2rem',
                }}
              >
                {c.value}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--coffee-mid)', lineHeight: 1.25 }}>
                {c.sub}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* ─── Règles Actives (Badges horizontaux) ─── */}
      <div
        className="ui-card"
        style={{
          background: 'var(--crema-subtle)',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.65rem' }}>
          <CoffeeIcon size={18} color="var(--espresso)" />
          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--espresso)' }}>
            Règles du Programme Bieny
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="ui-badge ui-badge--neutral">
            ☕ <strong>9 consommations</strong> = 1 cycle
          </span>
          <span className="ui-badge ui-badge--gold">
            🎁 <strong>30% de remise</strong> immédiate
          </span>
          <span className="ui-badge ui-badge--sage">
            📅 <strong>30 jours</strong> validité carte
          </span>
          <span className="ui-badge ui-badge--neutral">
            ⏳ <strong>7 jours</strong> validité remise
          </span>
        </div>
      </div>

    </main>
  );
}
