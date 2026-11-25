import { redirect } from 'next/navigation';
import { getEmployee } from '@/lib/auth-guard';
import { getAllStores, getSuperAdminStats, getEmployees } from '@/lib/server-data';
import { SuperAdminDashboardClient } from '@/components/SuperAdminDashboardClient';

export default async function SuperAdminPage() {
  const employee = await getEmployee();
  
  // Si pas connecté ou pas super_admin
  if (!employee) {
    redirect('/serveur/login');
  }
  
  if (employee.role !== 'super_admin') {
    // Si simple admin ou serveur, redirection vers son espace
    redirect(employee.role === 'admin' ? '/admin' : '/serveur');
  }

  const [stats, stores, allEmployees] = await Promise.all([
    getSuperAdminStats(),
    getAllStores(),
    getEmployees(null),
  ]);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--crema-bg)' }}>
      <header
        style={{
          background: 'linear-gradient(135deg, var(--espresso) 0%, var(--espresso-dark) 100%)',
          color: '#FAF8F5',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: 'var(--shadow-md)',
          borderBottom: '1px solid rgba(212, 160, 84, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: 'rgba(212, 160, 84, 0.18)',
              border: '1.5px solid rgba(212, 160, 84, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
            }}
          >
            ⚡
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: '#FAF8F5' }}>
              Console Super Admin
            </h1>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--gold-light)', fontWeight: 600 }}>
              {employee.name || employee.email}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <form action="/api/auth/logout" method="POST" style={{ margin: 0 }}>
            <button
              type="submit"
              className="touch-btn"
              style={{
                minHeight: '36px',
                background: 'var(--coral)',
                color: '#fff',
                padding: '0.4rem 0.9rem',
                borderRadius: 'var(--r-pill)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
              }}
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <main className="shell shell--wide animate-in" style={{ paddingTop: '1.5rem', paddingBottom: '2.5rem' }}>
        <SuperAdminDashboardClient
          stats={stats}
          initialStores={stores}
          employees={allEmployees}
        />
      </main>
    </div>
  );
}
