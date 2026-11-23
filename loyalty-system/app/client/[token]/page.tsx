import { redirect } from 'next/navigation';
import { getEmployee } from '@/lib/auth-guard';
import { fetchClientCard } from '@/lib/client-card';
import ClientCard from '@/components/ClientCard';

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ view_as?: string }>;
}) {
  const { token } = await params;
  const { view_as } = (await searchParams) ?? {};

  const res = await fetchClientCard(token);
  const card = res.ok && res.data ? res.data : null;

  if (!card) {
    return (
      <main className="app">
        <div className="shell" style={{ paddingTop: '4rem', textAlign: 'center' }}>
          <div className="ui-card" style={{ padding: '3rem 1.5rem', maxWidth: 420, margin: '0 auto' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>☕</div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--espresso)',
                margin: '0 0 0.5rem',
              }}
            >
              Carte introuvable
            </h1>
            <p style={{ fontSize: '0.86rem', color: 'var(--coffee-mid)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              Le lien personnel de fidélité semble invalide, désactivé ou a expiré.
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--coffee-mid)', margin: '0 0 1.5rem' }}>
              Demandez à votre barista Bieny de vous transmettre un nouveau lien.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Redirection Barista / Admin ──
  // Si le QR code est scanné par un barista ou admin connecté sur son téléphone,
  // le rediriger directement vers la fiche de gestion du client pour enregistrer le café ou appliquer la remise
  if (view_as !== 'client') {
    const employee = await getEmployee('server');
    if (employee && card.customer?.id) {
      redirect(`/serveur/customers/${card.customer.id}`);
    }
  }

  return (
    <main className="app">
      <ClientCard token={token} initialData={card} />
    </main>
  );
}
