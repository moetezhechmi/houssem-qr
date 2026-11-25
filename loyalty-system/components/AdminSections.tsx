'use client';

import { useState, useEffect } from 'react';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { AdminNotifications } from './AdminNotifications';

type SectionId =
  | 'overview'
  | 'customers'
  | 'employees'
  | 'cards'
  | 'rewards'
  | 'history'
  | 'stats'
  | 'settings'
  | 'notifications';

interface AdminSectionsProps {
  settings: any;
  corrections: any[];
  ops: any[];
  stats: any;
  customers: any[];
  cards: any[];
  rewards: any[];
  employees: any[];
  initialTab?: string;
  storeName?: string | null;
  storeLogo?: string | null;
}

export function AdminSections({
  settings: initialSettings,
  corrections,
  ops,
  stats,
  customers,
  cards,
  rewards,
  employees: initialEmployees,
  initialTab,
  storeName,
  storeLogo,
}: AdminSectionsProps) {
  const validTabs: SectionId[] = ['overview','customers','employees','cards','rewards','history','stats','settings','notifications'];
  const startTab = (validTabs.includes(initialTab as SectionId) ? initialTab : 'overview') as SectionId;
  const [activeTab, setActiveTab] = useState<SectionId>(startTab);
  const [showMore, setShowMore] = useState(false);
  const [opsPage, setOpsPage] = useState(1);
  const OPS_PER_PAGE = 15;

  // Sync activeTab when initialTab prop changes
  useEffect(() => {
    if (initialTab && validTabs.includes(initialTab as SectionId)) {
      setActiveTab(initialTab as SectionId);
    }
  }, [initialTab]);

  // Employee Management State
  const [employees, setEmployees] = useState(initialEmployees);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'server' | 'admin'>('server');
  const [empMsg, setEmpMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busyEmp, setBusyEmp] = useState(false);

  // Settings State (using strings or numbers so inputs can be cleared cleanly on mobile)
  const [settings, setSettings] = useState<{
    required_consumptions: number | string;
    discount_percentage: number | string;
    card_validity_days: number | string;
    reward_validity_days: number | string;
  }>({
    required_consumptions: initialSettings?.required_consumptions ?? 9,
    discount_percentage: initialSettings?.discount_percentage ?? 30,
    card_validity_days: initialSettings?.card_validity_days ?? 30,
    reward_validity_days: initialSettings?.reward_validity_days ?? 7,
  });
  const [settingsMsg, setSettingsMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busySettings, setBusySettings] = useState(false);

  // Navigation Items
  const menuItems: Array<{ id: SectionId; label: string; icon: string; count?: number }> = [
    { id: 'overview', label: "Vue d'ensemble", icon: '📊' },
    { id: 'customers', label: 'Clients', icon: '👥', count: customers.length },
    { id: 'employees', label: 'Employés', icon: '🧑‍🍳', count: employees.length },
    { id: 'cards', label: 'Cartes de fidélité', icon: '💳', count: cards.length },
    { id: 'rewards', label: 'Récompenses', icon: '🎁', count: rewards.length },
    { id: 'history', label: 'Historique opérations', icon: '📜', count: ops.length },
    { id: 'stats', label: 'Statistiques', icon: '📈' },
    { id: 'settings', label: 'Paramètres', icon: '⚙️' },
    { id: 'notifications', label: 'Notifications', icon: '📣' },
  ];

  // Employee Add Handler
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busyEmp || !name.trim() || !email.trim() || !password) return;
    setBusyEmp(true);
    setEmpMsg(null);

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role, status: 'active' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEmpMsg({ text: `Compte créé avec succès pour ${data.name ?? name} !`, ok: true });
        setName('');
        setEmail('');
        setPassword('');
        // Reload list
        const reloadRes = await fetch('/api/admin/employees');
        const updated = await reloadRes.json().catch(() => []);
        if (Array.isArray(updated)) setEmployees(updated);
      } else {
        setEmpMsg({ text: data?.error?.message ?? 'Erreur lors de la création', ok: false });
      }
    } catch (err: any) {
      setEmpMsg({ text: `Erreur : ${err.message}`, ok: false });
    } finally {
      setBusyEmp(false);
    }
  };

  // Toggle Employee Status
  const handleToggleEmployeeStatus = async (emp: any) => {
    const nextStatus = emp.status === 'active' ? 'disabled' : 'active';
    const actionLabel = nextStatus === 'active' ? 'réactiver' : 'désactiver';
    const ok = window.confirm(`Voulez-vous ${actionLabel} le compte de ${emp.name ?? emp.email} ?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: emp.role, status: nextStatus }),
      });
      if (res.ok) {
        setEmployees(employees.map((x) => (x.id === emp.id ? { ...x, status: nextStatus } : x)));
      }
    } catch {
      alert('Erreur lors de la mise à jour');
    }
  };

  // Settings Save Handler
  const handleSaveSettings = async () => {
    setBusySettings(true);
    setSettingsMsg(null);
    try {
      const payload = {
        required_consumptions: Number(settings.required_consumptions) || 9,
        discount_percentage: Number(settings.discount_percentage) || 30,
        card_validity_days: Number(settings.card_validity_days) || 30,
        reward_validity_days: Number(settings.reward_validity_days) || 7,
      };
      const res = await fetch('/api/server/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSettingsMsg({
          text: `Paramètres enregistrés (${payload.required_consumptions} consos = ${payload.discount_percentage}%)`,
          ok: true,
        });
        setSettings(payload);
      } else {
        setSettingsMsg({ text: data?.error?.message ?? 'Erreur lors de la sauvegarde', ok: false });
      }
    } catch (e: any) {
      setSettingsMsg({ text: `Erreur : ${e.message}`, ok: false });
    } finally {
      setBusySettings(false);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: '1.25rem',
      }}
      className="admin-container"
    >
      {/* ── Admin Navigation (Sidebar on Desktop, Horizontal Pill Bar on Mobile) ── */}
      <aside className="admin-nav-shell">
        <div className="admin-nav-list">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`}
              >
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="admin-nav-count">{item.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Active Section Content ── */}
      <section key={activeTab} style={{ minWidth: 0 }} className="animate-in">
        {/* SECTION 1: VUE D'ENSEMBLE */}
        {activeTab === 'overview' && (
          <div className="animate-in">
            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div className="ui-card" style={{ padding: '1.15rem' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>👥</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 700, color: 'var(--espresso)', lineHeight: 1 }}>
                  {stats?.total_clients ?? customers.length}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.3rem' }}>
                  Clients Enregistrés
                </div>
              </div>

              <div className="ui-card" style={{ padding: '1.15rem' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>☕</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 700, color: 'var(--sage)', lineHeight: 1 }}>
                  {stats?.active_cards ?? 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.3rem' }}>
                  Cartes Actives (30j)
                </div>
              </div>

              <div className="ui-card" style={{ padding: '1.15rem' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>⏳</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 700, color: 'var(--coral)', lineHeight: 1 }}>
                  {stats?.expired_cards ?? 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.3rem' }}>
                  Cartes Expirées
                </div>
              </div>

              <div className="ui-card" style={{ padding: '1.15rem' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>🎁</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>
                  {stats?.pending_rewards ?? 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.3rem' }}>
                  Récompenses Prêtes
                </div>
              </div>

              <div className="ui-card" style={{ padding: '1.15rem' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>✅</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 700, color: 'var(--sage)', lineHeight: 1 }}>
                  {stats?.used_rewards ?? 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.3rem' }}>
                  Récompenses Consommées
                </div>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="ui-card ui-card--espresso" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
                Synthèse Rapide
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                Programme Coffee Loyalty en Ligne
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--crema-border)', lineHeight: 1.5, margin: 0 }}>
                Base de données Supabase connectée · <strong>{employees.length} employé(s)</strong> actifs · 
                Taux de conversion cycle : <strong>{stats?.total_clients > 0 ? Math.round(((stats.used_rewards ?? 0) / stats.total_clients) * 100) : 0}%</strong>.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 2: CLIENTS */}
        {activeTab === 'customers' && (
          <div className="ui-card animate-in" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--espresso)', margin: 0 }}>
                Répertoire des Clients ({customers.length})
              </h2>
              <a href="/serveur/customers?action=new" className="touch-btn touch-btn--primary" style={{ minHeight: '38px', padding: '0.4rem 1rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                + Nouveau Client
              </a>
            </div>

            {customers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--coffee-mid)' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem', opacity: 0.5 }}>👥</div>
                <div style={{ fontWeight: 700, color: 'var(--espresso)', marginBottom: '0.2rem' }}>Aucun client enregistré</div>
                <p style={{ fontSize: '0.82rem', margin: 0 }}>Créez un premier client depuis l’espace serveur.</p>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {customers.map((c: any) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--crema-bg)',
                    border: '1px solid var(--crema-border)',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--espresso)' }}>
                      {c.first_name} {c.last_name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--coffee-mid)', marginTop: '0.1rem' }}>
                      📞 {c.phone} · Inscrit le {fmtDate(c.created_at)}
                    </div>
                  </div>

                  <a
                    href={`/serveur/customers/${c.id}`}
                    className="touch-btn touch-btn--outline"
                    style={{ minHeight: '34px', padding: '0.3rem 0.85rem', fontSize: '0.78rem', textDecoration: 'none' }}
                  >
                    Voir la fiche →
                  </a>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
        
        {/* SECTION 3: EMPLOYES */}
        {activeTab === 'employees' && (
          <div className="ui-card animate-in" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>
              Gestion des Employés ({employees.length})
            </h2>

            {empMsg && (
              <div
                style={{
                  background: empMsg.ok ? 'var(--sage-light)' : 'var(--coral-light)',
                  border: `1px solid ${empMsg.ok ? 'var(--sage-border)' : 'var(--coral-border)'}`,
                  borderRadius: 'var(--r-sm)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.84rem',
                  color: empMsg.ok ? 'var(--sage)' : 'var(--coral)',
                }}
              >
                {empMsg.ok ? '✅' : '⚠️'} {empMsg.text}
              </div>
            )}

            {/* List */}
            {employees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--coffee-mid)', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem', opacity: 0.5 }}>🧑‍🍳</div>
                <div style={{ fontWeight: 700, color: 'var(--espresso)', marginBottom: '0.2rem' }}>Aucun employé</div>
                <p style={{ fontSize: '0.82rem', margin: 0 }}>Créez un premier compte ci-dessous.</p>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
              {employees.map((e: any) => (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--crema-bg)',
                    border: '1px solid var(--crema-border)',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--espresso)' }}>
                      {e.name ?? 'Sans nom'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--coffee-mid)' }}>
                      {e.email} · Rôle : <strong>{e.role === 'admin' ? '👑 Administrateur' : '☕ Serveur / Barista'}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`ui-badge ${e.status === 'active' ? 'ui-badge--sage' : 'ui-badge--coral'}`}>
                      {e.status === 'active' ? 'Actif' : 'Désactivé'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleEmployeeStatus(e)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--crema-border)',
                        background: 'var(--crema-surface)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: e.status === 'active' ? 'var(--coral)' : 'var(--sage)',
                      }}
                    >
                      {e.status === 'active' ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
            
            {/* Add Employee */}
            <div style={{ background: 'var(--crema-subtle)', padding: '1.25rem', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--espresso)', marginBottom: '0.75rem' }}>
                + Créer un nouveau compte employé
              </div>
              <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', marginBottom: '0.35rem' }}>
                      Nom & Prénom
                    </label>
                    <input
                      value={name}
                      onChange={(ev) => setName(ev.target.value)}
                      placeholder="Ex: Youssef Ben Ali"
                      required
                      style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-surface)', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', marginBottom: '0.35rem' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      placeholder="youssef@bieny.com"
                      required
                      style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-surface)', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', marginBottom: '0.35rem' }}>
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(ev) => setPassword(ev.target.value)}
                      placeholder="••••••••••••"
                      required
                      style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-surface)', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', marginBottom: '0.35rem' }}>
                      Rôle
                    </label>
                    <select
                      value={role}
                      onChange={(ev) => setRole(ev.target.value as 'server' | 'admin')}
                      style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--crema-border)', background: 'var(--crema-surface)', fontSize: '0.9rem' }}
                    >
                      <option value="server">Serveur / Barista (Caisse)</option>
                      <option value="admin">Administrateur (Gestion)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button type="submit" className="touch-btn touch-btn--primary" disabled={busyEmp} style={{ minHeight: '40px', fontSize: '0.86rem' }}>
                    {busyEmp ? 'Création...' : '+ Créer le compte'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SECTION 4: CARTES DE FIDELITE */}
        {activeTab === 'cards' && (
          <div className="ui-card animate-in" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>
              Cartes de Fidélité ({cards.length})
            </h2>

            {cards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--coffee-mid)' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem', opacity: 0.5 }}>💳</div>
                <div style={{ fontWeight: 700, color: 'var(--espresso)', marginBottom: '0.2rem' }}>Aucune carte</div>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {cards.map((card: any) => (
                <div
                  key={card.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--crema-bg)',
                    border: '1px solid var(--crema-border)',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--espresso)', fontFamily: 'monospace' }}>
                      {card.card_number}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--coffee-mid)', marginTop: '0.1rem' }}>
                      Client : <strong>{card.Customers?.first_name} {card.Customers?.last_name}</strong> ({card.Customers?.phone})
                      <br />
                      Validité : {fmtDate(card.start_date)} → {fmtDate(card.expiration_date)}
                    </div>
                  </div>

                  <span className={`ui-badge ${card.status === 'active' ? 'ui-badge--sage' : 'ui-badge--coral'}`}>
                    {card.status === 'active' ? 'Active' : 'Expirée'}
                  </span>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
        
        {/* SECTION 5: RECOMPENSES */}
        {activeTab === 'rewards' && (
          <div className="ui-card animate-in" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>
              Récompenses & Remises ({rewards.length})
            </h2>

            {rewards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--coffee-mid)' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem', opacity: 0.5 }}>🎁</div>
                <div style={{ fontWeight: 700, color: 'var(--espresso)', marginBottom: '0.2rem' }}>Aucune récompense</div>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {rewards.map((r: any) => {
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
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--r-md)',
                      background: isAvailable ? 'var(--sage-light)' : 'var(--crema-bg)',
                      border: `1px solid ${isAvailable ? 'var(--sage-border)' : 'var(--crema-border)'}`,
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--espresso)' }}>
                        🎫 Remise de {r.discount_percentage}%
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--coffee-mid)', marginTop: '0.15rem' }}>
                        Client : <strong>{r.Customers?.first_name} {r.Customers?.last_name}</strong>
                        <br />
                        Débloquée le {fmtDateTime(r.unlocked_at)} · {isUsed ? `Utilisée le ${fmtDateTime(r.used_at)}` : `Expire le ${fmtDateTime(r.expires_at)}`}
                      </div>
                    </div>

                    <span className={`ui-badge ${isAvailable ? 'ui-badge--sage' : isUsed ? 'ui-badge--neutral' : 'ui-badge--coral'}`}>
                      {isAvailable ? 'Disponible' : isUsed ? 'Utilisée' : 'Expirée'}
                    </span>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}
        
        {/* SECTION 6: HISTORIQUE DES OPERATIONS (AUDIT) */}
        {activeTab === 'history' && (
          <div className="ui-card animate-in" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>
              Historique des Opérations d’Audit ({ops.length})
            </h2>

            {ops.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--coffee-mid)' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem', opacity: 0.5 }}>📜</div>
                <div style={{ fontWeight: 700, color: 'var(--espresso)', marginBottom: '0.2rem' }}>Aucune opération</div>
              </div>
            ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {ops.slice((opsPage - 1) * OPS_PER_PAGE, opsPage * OPS_PER_PAGE).map((op: any) => (
                  <div
                    key={op.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--r-md)',
                      background: 'var(--crema-bg)',
                      border: '1px solid var(--crema-border)',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="ui-badge ui-badge--neutral">{op.action}</span>
                        <strong style={{ fontSize: '0.86rem', color: 'var(--espresso)' }}>{op.entity_type}</strong>
                      </div>
                      {op.details && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--coffee-mid)', marginTop: '0.2rem' }}>
                          {op.details.card_number && <span>Carte : <code>{op.details.card_number}</code> · </span>}
                          {op.details.current_consumptions && <span>Progression : {op.details.current_consumptions}/9 · </span>}
                          {op.details.discount_percentage && <span>Remise : {op.details.discount_percentage}%</span>}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '0.76rem', color: 'var(--coffee-mid)' }}>
                      <div>{fmtDateTime(op.created_at)}</div>
                      <div>{op.employee_name || 'Système'}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {ops.length > OPS_PER_PAGE && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--crema-border)' }}>
                  <button
                    type="button"
                    disabled={opsPage === 1}
                    onClick={() => setOpsPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: '0.45rem 0.95rem',
                      borderRadius: 'var(--r-full)',
                      border: '1px solid var(--crema-border)',
                      background: opsPage === 1 ? 'var(--crema-bg)' : 'var(--white)',
                      color: opsPage === 1 ? 'var(--coffee-light)' : 'var(--espresso)',
                      cursor: opsPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    ← Précédent
                  </button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--coffee-mid)', fontWeight: 600 }}>
                    Page {opsPage} / {Math.ceil(ops.length / OPS_PER_PAGE)}
                  </span>
                  <button
                    type="button"
                    disabled={opsPage >= Math.ceil(ops.length / OPS_PER_PAGE)}
                    onClick={() => setOpsPage((p) => p + 1)}
                    style={{
                      padding: '0.45rem 0.95rem',
                      borderRadius: 'var(--r-full)',
                      border: '1px solid var(--crema-border)',
                      background: opsPage >= Math.ceil(ops.length / OPS_PER_PAGE) ? 'var(--crema-bg)' : 'var(--white)',
                      color: opsPage >= Math.ceil(ops.length / OPS_PER_PAGE) ? 'var(--coffee-light)' : 'var(--espresso)',
                      cursor: opsPage >= Math.ceil(ops.length / OPS_PER_PAGE) ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </>
            )}
          </div>
        )}
        
        {/* SECTION 7: STATISTIQUES */}
        {activeTab === 'stats' && (
          <div className="ui-card animate-in" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>
              Statistiques & Performance
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--crema-bg)', padding: '1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--crema-border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', textTransform: 'uppercase', fontWeight: 800 }}>Taux de complétion</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: 'var(--sage)', marginTop: '0.2rem' }}>
                  {stats?.total_clients > 0 ? Math.round(((stats.used_rewards ?? 0) / stats.total_clients) * 100) : 0}%
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--coffee-mid)' }}>Clients ayant déjà consommé une remise de 30%</div>
              </div>

              <div style={{ background: 'var(--crema-bg)', padding: '1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--crema-border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--coffee-mid)', textTransform: 'uppercase', fontWeight: 800 }}>Ratio Actives / Expirées</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: 'var(--gold)', marginTop: '0.2rem' }}>
                  {stats?.active_cards ?? 0} : {stats?.expired_cards ?? 0}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--coffee-mid)' }}>Cartes en cours de validité vs clôturées</div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 8: PARAMETRES */}
        {activeTab === 'settings' && (
          <div className="ui-card animate-in" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--sage)', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              ⚙️ Règles Métier Configurables
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 1rem' }}>
              Paramètres du Programme de Fidélité
            </h2>

            {settingsMsg && (
              <div
                style={{
                  background: settingsMsg.ok ? 'var(--sage-light)' : 'var(--coral-light)',
                  border: `1px solid ${settingsMsg.ok ? 'var(--sage-border)' : 'var(--coral-border)'}`,
                  borderRadius: 'var(--r-sm)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.84rem',
                  color: settingsMsg.ok ? 'var(--sage)' : 'var(--coral)',
                }}
              >
                {settingsMsg.ok ? '✅' : '⚠️'} {settingsMsg.text}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  Consommations nécessaires
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={settings.required_consumptions}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setSettings({ ...settings, required_consumptions: val });
                  }}
                  placeholder="9"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    fontWeight: 700,
                    fontSize: 'var(--text-lg)',
                    color: 'var(--espresso)',
                    outline: 'none',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                />
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', marginTop: '0.25rem', display: 'block' }}>
                  Par défaut : 9 cafés
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  Pourcentage de réduction (%)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={settings.discount_percentage}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setSettings({ ...settings, discount_percentage: val });
                  }}
                  placeholder="30"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    fontWeight: 700,
                    fontSize: 'var(--text-lg)',
                    color: 'var(--espresso)',
                    outline: 'none',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                />
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', marginTop: '0.25rem', display: 'block' }}>
                  Par défaut : 30%
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  Validité de la carte (jours)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={settings.card_validity_days}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setSettings({ ...settings, card_validity_days: val });
                  }}
                  placeholder="30"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    fontWeight: 700,
                    fontSize: 'var(--text-lg)',
                    color: 'var(--espresso)',
                    outline: 'none',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                />
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', marginTop: '0.25rem', display: 'block' }}>
                  Par défaut : 30 jours
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 800, textTransform: 'uppercase', color: 'var(--coffee-mid)', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  Validité récompense (jours)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={settings.reward_validity_days}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setSettings({ ...settings, reward_validity_days: val });
                  }}
                  placeholder="7"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid var(--crema-border)',
                    background: 'var(--crema-surface)',
                    fontWeight: 700,
                    fontSize: 'var(--text-lg)',
                    color: 'var(--espresso)',
                    outline: 'none',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                />
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--coffee-mid)', marginTop: '0.25rem', display: 'block' }}>
                  Par défaut : 7 jours
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="touch-btn touch-btn--primary"
                disabled={busySettings}
                onClick={handleSaveSettings}
              >
                {busySettings ? 'Sauvegarde...' : 'Sauvegarder les Paramètres'}
              </button>
            </div>
          </div>
        )}

        {/* SECTION 9: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="animate-in">
            <AdminNotifications storeName={storeName} storeLogo={storeLogo} />
          </div>
        )}
      </section>

      <style jsx>{`
        .admin-nav-shell {
          width: 100%;
          margin-bottom: 0.75rem;
        }
        @media (max-width: 859px) {
          .admin-nav-shell {
            display: none !important;
          }
        }
        .admin-nav-list {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 6px;
          -webkit-overflow-scrolling: touch;
        }
        .admin-nav-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: var(--r-pill);
          background: var(--crema-surface);
          border: 1.5px solid var(--crema-border);
          color: var(--coffee-mid);
          font-weight: 700;
          font-size: 0.82rem;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: var(--shadow-xs);
        }
        .admin-nav-item--active {
          background: var(--espresso);
          color: #FAF8F5;
          border-color: var(--espresso);
          box-shadow: 0 4px 12px rgba(44, 30, 22, 0.25);
        }
        .admin-nav-count {
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 0.7rem;
          background: var(--crema-subtle);
          color: var(--espresso);
        }
        .admin-nav-item--active .admin-nav-count {
          background: rgba(255, 255, 255, 0.2);
          color: #FAF8F5;
        }

        /* ── Mobile bottom bar ── */
        .admin-mobile-bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 90;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 6px 4px calc(8px + env(safe-area-inset-bottom, 0px));
          background: rgba(250, 249, 246, 0.97);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-top: 1px solid var(--crema-border);
          box-shadow: 0 -4px 16px rgba(24, 16, 10, 0.08);
        }
        .admin-mobile-bottom-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 4px 10px;
          border: none;
          background: transparent;
          color: var(--coffee-mid);
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          cursor: pointer;
          border-radius: 10px;
          transition: color 0.15s ease, background 0.15s ease, transform 0.1s ease;
        }
        .admin-mobile-bottom-item:active {
          transform: scale(0.92);
        }
        .admin-mobile-bottom-item--active {
          color: var(--espresso);
          background: var(--crema-subtle);
        }
        .admin-mobile-bottom-item span:first-child {
          font-size: 1.15rem;
        }
        @media (min-width: 860px) {
          .admin-mobile-bottom-bar {
            display: none !important;
          }
          .admin-container {
            grid-template-columns: 240px 1fr !important;
          }
          .admin-nav-list {
            flex-direction: column !important;
            overflow-x: visible !important;
          }
          .admin-nav-item {
            width: 100% !important;
            border-radius: var(--r-md) !important;
            padding: 10px 14px !important;
          }
        }
      `}</style>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="admin-mobile-bottom-bar" aria-label="Navigation admin mobile">
        {[
          { id: 'overview', label: "Vue", icon: '📊' },
          { id: 'customers', label: 'Clients', icon: '👥' },
          { id: 'notifications', label: 'Notifs', icon: '📣' },
          { id: 'settings', label: 'Paramètres', icon: '⚙️' },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as SectionId)}
              className={`admin-mobile-bottom-item ${isActive ? 'admin-mobile-bottom-item--active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="admin-mobile-bottom-item"
        >
          <span>☰</span>
          <span>Menu</span>
        </button>
      </nav>

      {/* ── More sheet ── */}
      {showMore && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowMore(false)}
        >
          <div
            style={{
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '20px 20px 0 0',
              padding: '1.25rem',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '40px', height: '4px', background: 'var(--crema-border)', borderRadius: '999px', margin: '0 auto 1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--espresso)', margin: '0 0 0.75rem' }}>
              Toutes les sections
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setActiveTab(item.id); setShowMore(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.75rem',
                      borderRadius: 'var(--r-md)',
                      border: `1.5px solid ${isActive ? 'var(--espresso)' : 'var(--crema-border)'}`,
                      background: isActive ? 'var(--espresso)' : 'var(--crema-surface)',
                      color: isActive ? '#FAF9F6' : 'var(--espresso)',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    {item.count !== undefined && (
                      <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{item.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
