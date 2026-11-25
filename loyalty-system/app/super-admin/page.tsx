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
    <div style={{ minHeight: '100dvh', background: 'var(--parchment, #FDFBF7)' }}>
      <header
        style={{
          background: '#1F1B18',
          color: '#fff',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>☕</span>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Plateforme SaaS — Super Administration
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>
              Connecté en tant que <strong>{employee.name || employee.email}</strong> (Super Admin)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a
            href="/admin"
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Vue Magasin →
          </a>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                background: '#A63D40',
                color: '#fff',
                border: 'none',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <SuperAdminDashboardClient
          stats={stats}
          initialStores={stores}
          employees={allEmployees}
        />
      </main>
    </div>
  );
}
