'use client';

import { useEffect, useState } from 'react';
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
    store_name?: string | null;
    store_slug?: string | null;
    store_logo_url?: string | null;
  } | null;
  hideBottomBar?: boolean;
}

export function ServerAppBar({ employee, hideBottomBar = false }: ServerAppBarProps) {
  const pathname = usePathname();
  const [isNotifTab, setIsNotifTab] = useState(false);

  const brandName = employee?.store_name || 'Bieny Coffeeshop';
  const brandLogo = employee?.store_logo_url || '/logo_houssem.jpeg';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsNotifTab(window.location.search.includes('tab=notifications'));
    }
  }, [pathname]);

  const isHome = pathname === '/serveur';
  const isCustomers = pathname === '/serveur/customers' || (pathname.startsWith('/serveur/customers/') && pathname !== '/serveur/customers');
  const isAdmin = pathname.startsWith('/admin');

  return (
    <>
      {/* ─── Top App Bar ─── */}
      <header className="top-app-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src={brandLogo}
            alt={brandName}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(24, 16, 10, 0.16)',
              border: '1.5px solid rgba(212, 160, 84, 0.4)',
            }}
          />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-md)',
                fontWeight: 700,
                color: 'var(--espresso)',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              {brandName}
            </div>
            <div
              style={{
                fontSize: 'var(--text-2xs)',
                color: 'var(--gold-dark)',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {isAdmin ? 'Console Admin' : 'Espace Barista'}
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
              gap: '6px',
              padding: '4px 9px',
              borderRadius: 'var(--r-pill)',
              background: 'var(--sage-light)',
              border: '1px solid var(--sage-border)',
              fontSize: 'var(--text-2xs)',
              fontWeight: 700,
              color: 'var(--sage-dark)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--sage)',
                animation: 'pulseDot 2s infinite',
                display: 'inline-block',
              }}
            />
            <span className="pos-badge-text">En ligne</span>
          </div>

          {/* User profile & logout */}
          {employee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              {(employee.role === 'super_admin' || employee.email === 'grounmoetezhechmi@gmail.com') && (
                <a
                  href="/super-admin"
                  style={{
                    background: '#8C4820',
                    color: '#fff',
                    padding: '4px 9px',
                    borderRadius: 'var(--r-pill)',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ⚡ Super Admin
                </a>
              )}
              <div
                title={employee.email}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px 3px 3px',
                  borderRadius: 'var(--r-pill)',
                  background: 'var(--crema-surface)',
                  border: '1px solid var(--crema-border)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--espresso)',
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--espresso) 0%, var(--coffee-dark) 100%)',
                    color: '#FAF8F5',
                    border: '1px solid var(--gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
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
                    borderRadius: 'var(--r-pill)',
                    border: '1px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--coffee-mid)',
                    transition: 'all 0.18s ease',
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
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #382419 0%, #1A0F08 100%)',
                color: '#FAF8F5',
                boxShadow: '0 8px 20px rgba(24, 16, 10, 0.38), 0 0 0 1px rgba(212, 160, 84, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'translateY(-9px)',
                border: '3px solid #FAF8F5',
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
                className={`bottom-tab ${isNotifTab ? 'bottom-tab--active' : ''}`}
              >
                <div className="bottom-tab__icon-wrap">
                  <span style={{ fontSize: '1.15rem' }}>📣</span>
                </div>
                <span className="bottom-tab__label">Notifs</span>
              </a>
              <a
                href="/admin"
                className={`bottom-tab ${isAdmin && !isNotifTab ? 'bottom-tab--active' : ''}`}
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
