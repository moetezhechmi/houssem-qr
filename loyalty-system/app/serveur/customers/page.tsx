import { redirect } from 'next/navigation';
import { AddClientForm } from '@/components/AddClientForm';
import { CustomerSearch } from '@/components/CustomerSearch';
import { getEmployee } from '@/lib/auth-guard';
import { getSearchCustomers } from '@/lib/server-data';
import { ArrowLeftIcon } from '@/components/Icons';

export default async function ServeurCustomers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string }>;
}) {
  const employee = await getEmployee('server');
  if (!employee) redirect('/serveur/login');

  const { q = '', action = '' } = await searchParams;
  const customers = await getSearchCustomers(q);

  return (
    <main className="shell animate-in">
      {/* ── Header Title & Back Link ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <a
            href="/serveur"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: 'var(--coffee-mid)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <ArrowLeftIcon size={16} />
            <span>Tableau de bord</span>
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
          Recherche & Clients
        </h1>
        <p style={{ fontSize: '0.86rem', color: 'var(--coffee-mid)', margin: 0 }}>
          Recherchez par numéro de téléphone ou nom pour valider un café ou appliquer une réduction.
        </p>
      </div>

      {/* ── Add Client Form (Accordion) ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <AddClientForm initialOpen={action === 'new'} />
      </div>

      <CustomerSearch initialQuery={q} initialCustomers={customers} />
    </main>
  );
}