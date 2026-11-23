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
    <main className="shell animate-in" style={{ paddingBottom: '2rem' }}>
      {/* ── Header Title & Back Link ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
          <a
            href="/serveur"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--text-xs)',
              color: 'var(--coffee-mid)',
              fontWeight: 700,
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--crema-surface)',
              border: '1px solid var(--crema-border)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <ArrowLeftIcon size={14} />
            <span>Tableau de bord</span>
          </a>

          <span
            style={{
              fontSize: 'var(--text-2xs)',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--gold-dark)',
            }}
          >
            Espace Barista
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--espresso)',
            margin: '0 0 0.25rem',
            lineHeight: 1.2,
          }}
        >
          Clients & Cartes
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--coffee-mid)', margin: 0, lineHeight: 1.45 }}>
          Recherchez par nom, téléphone ou carte pour ajouter un tampon ou valider une remise.
        </p>
      </div>

      {/* ── Add Client Form (Accordion / Quick Create) ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <AddClientForm initialOpen={action === 'new'} />
      </div>

      {/* ── Customer Search & Live Results ── */}
      <CustomerSearch initialQuery={q} initialCustomers={customers} />
    </main>
  );
}
