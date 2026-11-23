'use client';

import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  SearchIcon,
  PlusIcon,
  SettingsIcon,
  RefreshCwIcon,
  LogoutIcon,
} from './Icons';

interface ServerAppBarProps {
  employee?: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  } | null;
  hideBottomBar?: boolean;
}

export function ServerAppBar({ employee, hideBottomBar = false }: ServerAppBarProps) {
  const pathname = usePathname();

  const isHome = pathname === '/serveur';
  const isCustomers = pathname === '/serveur/customers' || (pathname.startsWith('/serveur/customers/') && pathname !== '/serveur/customers');
  const isAdmin = pathname.startsWith('/admin');

  return (
    <>
      {/* ─── Top App Bar ─── */}
      <header className="top-app-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <img
            src="/logo_houssem.jpeg"
            alt="Bieny Coffeeshop"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(24, 16, 10, 0.18)',
              border: '1.5px solid rgba(212, 160, 84, 0.3)',
            }}
          />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--espresso)',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              Bieny
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--coffee-mid)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Fidélité
            </div>
          </div>
        </div>

        {/* Top Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Live pulse dot */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'var(--sage-light)',
              border: '1px solid var(--sage-border)',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--sage)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--sage)',
                boxShadow: '0 0 6px var(--sage)',
                display: 'inline-block',
              }}
            />
            <span className="pos-badge-text">En ligne</span>
          </div>

          {/* User profile & logout */}
          {employee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div
                title={employee.email}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px 2px 3px',
                  borderRadius: '999px',
                  background: 'var(--crema-subtle)',
                  border: '1px solid var(--crema-border)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--espresso)',
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--espresso)',
                    color: '#FAF9F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                  }}
                >
                  {employee.name ? employee.name[0].toUpperCase() : 'B'}
                </span>
                <span className="user-name-text">
                  {employee.name || employee.email.split('@')[0]}
                </span>
              </div>

              <form action="/api/auth/logout" method="POST" style={{ margin: 0 }}>
                <button
                  type="submit"
                  title="Se déconnecter"
                  aria-label="Se déconnecter"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '999px',
                    border: '1px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--coffee-mid)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LogoutIcon size={16} />
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      {/* ─── Bottom Navigation App Bar (Mobile & Tablet) ─── */}
      {!hideBottomBar && (
        <nav className="bottom-app-bar" aria-label="Navigation principale">
          <a
            href="/serveur"
            className={`bottom-tab ${isHome ? 'bottom-tab--active' : ''}`}
          >
            <div className="bottom-tab__icon-wrap">
              <HomeIcon size={20} />
            </div>
            <span className="bottom-tab__label">Accueil</span>
          </a>

          <a
            href="/serveur/customers"
            className={`bottom-tab ${isCustomers ? 'bottom-tab--active' : ''}`}
          >
            <div className="bottom-tab__icon-wrap">
              <SearchIcon size={20} />
            </div>
            <span className="bottom-tab__label">Clients</span>
          </a>

          {/* Elevated Centered "+ Nouveau Client" Button */}
          <a
            href="/serveur/customers?action=new"
            className="bottom-tab bottom-tab--raised"
            title="Créer un nouveau client"
          >
            <div
              className="bottom-tab__icon-wrap bottom-tab__raised-btn"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--espresso) 0%, #301B0E 100%)',
                color: '#FAF9F6',
                boxShadow: '0 6px 18px rgba(24, 16, 10, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'translateY(-8px)',
                border: '2px solid #FAF7F2',
              }}
            >
              <PlusIcon size={22} color="#FFFFFF" />
            </div>
            <span
              className="bottom-tab__label"
              style={{ color: 'var(--espresso)', fontWeight: 800, transform: 'translateY(-4px)' }}
            >
              Nouveau
            </span>
          </a>

          {employee?.role === 'admin' ? (
            <>
              <a
                href="/admin?tab=notifications"
                className="bottom-tab"
              >
                <div className="bottom-tab__icon-wrap">
                  <span style={{ fontSize: '1.1rem' }}>📣</span>
                </div>
                <span className="bottom-tab__label">Notifs</span>
              </a>
              <a
                href="/admin"
                className={`bottom-tab ${isAdmin ? 'bottom-tab--active' : ''}`}
              >
                <div className="bottom-tab__icon-wrap">
                  <SettingsIcon size={20} />
                </div>
                <span className="bottom-tab__label">Admin</span>
              </a>
            </>
          ) : (
            <a
              href="/serveur"
              className="bottom-tab"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
            >
              <div className="bottom-tab__icon-wrap">
                <RefreshCwIcon size={20} />
              </div>
              <span className="bottom-tab__label">Actualiser</span>
            </a>
          )}
        </nav>
      )}

      <style jsx>{`
        .pos-badge-text {
          display: none;
        }
        .user-name-text {
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: none;
        }
        @media (min-width: 480px) {
          .pos-badge-text {
            display: inline;
          }
          .user-name-text {
            display: inline;
          }
        }
      `}</style>
    </>
  );
}
