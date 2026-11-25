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
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚡</span>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Console Super Admin
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>
              {employee.name || employee.email}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <form action="/api/auth/logout" method="POST" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                background: '#A63D40',
                color: '#fff',
                border: 'none',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem 1rem' }}>
        <SuperAdminDashboardClient
          stats={stats}
          initialStores={stores}
          employees={allEmployees}
        />
      </main>
    </div>
  );
}
