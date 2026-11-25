import { redirect } from 'next/navigation';
import { getEmployee } from '@/lib/auth-guard';
import {
  getSettings,
  getCorrections,
  getRecentOperations,
  getDashboardStats,
  getAllCustomers,
  getAllCards,
  getAllRewards,
  getEmployees,
} from '@/lib/server-data';
import { AdminSections } from '@/components/AdminSections';
import { ServerAppBar } from '@/components/ServerAppBar';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; store_id?: string }>;
}) {
  const admin = await getEmployee('admin');
  if (!admin) redirect('/serveur/login');

  const { tab = 'overview', store_id } = await searchParams;

  // Si super_admin, peut visualiser un store_id passé en paramètre, sinon restreint à son propre store_id
  const targetStoreId = admin.role === 'super_admin' ? (store_id || admin.store_id) : admin.store_id;

  const [settings, corrections, ops, stats, customers, cards, rewards, employees] =
    await Promise.all([
      getSettings(targetStoreId),
      getCorrections(30, targetStoreId),
      getRecentOperations(50, targetStoreId),
      getDashboardStats(targetStoreId),
      getAllCustomers(100, targetStoreId),
      getAllCards(100, targetStoreId),
      getAllRewards(100, targetStoreId),
      getEmployees(targetStoreId),
    ]);

  const isNotifTab = tab === 'notifications';

  return (
    <div className="has-bottom-nav" style={{ minHeight: '100dvh' }}>
      <ServerAppBar employee={admin} />

      <main className="shell shell--wide animate-in">
        {!isNotifTab && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <a
                href="/serveur"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  color: 'var(--coffee-mid)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                ← Espace Barista
              </a>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.85rem',
                fontWeight: 700,
                color: 'var(--espresso)',
                margin: '0 0 0.25rem',
              }}
            >
              Console d’Administration
            </h1>
            <p style={{ fontSize: '0.86rem', color: 'var(--coffee-mid)', margin: 0 }}>
              Supervisez les clients, employés, cartes, récompenses, statistiques et règles du programme.
            </p>
          </div>
        )}

        <AdminSections
          settings={settings}
          corrections={corrections}
          ops={ops}
          stats={stats}
          customers={customers}
          cards={cards}
          rewards={rewards}
          employees={employees}
          initialTab={tab}
        />
      </main>
    </div>
  );
}
